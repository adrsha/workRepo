import mysql from 'mysql2/promise';

/**
 * Advanced Database Connection Manager
 * - Uses a global lock for coordinated pool resets
 * - Implements proper queuing with promise-based semaphore
 * - Prevents race conditions during resets
 * - Handles connection limits gracefully with backpressure
 */

// Global state that persists between requests
let globalState = {
  pool: null,
  isResetting: false,
  resetPromise: null,
  connectionCount: 0,
  maxConcurrentQueries: 5 // Much lower than your MySQL max_user_connections
};

// Simple mutex implementation for coordinated access
class Mutex {
  constructor() {
    this._locking = Promise.resolve();
  }

  async lock() {
    let unlock;
    const newLocking = new Promise(resolve => {
      unlock = resolve;
    });

    const lockPromise = this._locking;
    this._locking = this._locking.then(() => newLocking);
    await lockPromise;
    return unlock;
  }
}

const mutex = new Mutex();

// Manage the database pool with coordinated access
async function getPoolSafely() {
  // Use mutex to prevent multiple threads from creating/resetting pool simultaneously
  const unlock = await mutex.lock();

  try {
    // If pool reset is in progress, wait for it to complete
    if (globalState.isResetting && globalState.resetPromise) {
      await globalState.resetPromise;
    }

    // Create pool if it doesn't exist
    if (!globalState.pool) {
      console.log('Creating new database connection pool');

      globalState.pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        connectTimeout: 15000,
        waitForConnections: true,
        connectionLimit: 50, // Very conservative
        queueLimit: 20,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000
      });

      globalState.pool.on('connection', conn => {
        console.log(`DB connection created: ${conn.threadId}`);
      });

      globalState.pool.on('release', conn => {
        console.log(`DB connection released: ${conn.threadId}`);
      });

      globalState.pool.on('error', err => {
        console.error('Pool error:', err.message);
      });
    }

    return globalState.pool;
  } finally {
    // Always release the mutex
    unlock();
  }
}

// Global queue for database operations
class QueryQueue {
  constructor(concurrency = 5) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async add(fn) {
    if (this.running < this.concurrency) {
      this.running++;
      try {
        return await fn();
      } finally {
        this.running--;
        this._next();
      }
    }

    // Queue is full, add to waiting queue
    return new Promise((resolve, reject) => {
      this.queue.push(() => {
        fn().then(resolve).catch(reject);
      });
    });
  }

  _next() {
    if (this.queue.length > 0 && this.running < this.concurrency) {
      this.running++;
      const next = this.queue.shift();
      Promise.resolve(next())
        .catch(err => console.error('Error in queued function:', err))
        .finally(() => {
          this.running--;
          this._next();
        });
    }
  }
}

const queryQueue = new QueryQueue(globalState.maxConcurrentQueries);

// Coordinated pool reset that prevents race conditions
async function resetPool() {
  const unlock = await mutex.lock();

  try {
    // If already resetting, return the existing promise
    if (globalState.isResetting) {
      return globalState.resetPromise;
    }

    // Set up the reset promise
    globalState.isResetting = true;
    globalState.resetPromise = (async () => {
      console.log('Resetting database connection pool...');

      if (globalState.pool) {
        try {
          // Give existing queries time to complete
          await new Promise(r => setTimeout(r, 1000));

          // End the pool
          await globalState.pool.end();
          console.log('Successfully closed the connection pool');
        } catch (err) {
          // Just log errors during pool closing, don't throw
          console.error('Error while closing pool:', err.message);
        } finally {
          globalState.pool = null;
        }
      }

      // Pause before allowing new connections
      await new Promise(r => setTimeout(r, 2000));
      console.log('Pool reset complete. New connections allowed.');
    })();

    // Wait for reset to complete
    await globalState.resetPromise;
    return true;
  } finally {
    // Clean up state
    globalState.isResetting = false;
    globalState.resetPromise = null;
    unlock();
  }
}

// Proper query function with queue protection
export async function query({ query, values = [] }) {
  return queryQueue.add(async () => {
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      attempts++;

      try {
        const pool = await getPoolSafely();
        const [results] = await pool.execute(query, values);
        return results;
      } catch (error) {
        console.error(`Query error (attempt ${attempts}/${maxAttempts}):`, error.message);

        // Handle connection limit errors
        if (error.code === 'ER_TOO_MANY_USER_CONNECTIONS') {
          if (attempts < maxAttempts) {
            console.log('Connection limit reached. Waiting before retry...');
            await new Promise(r => setTimeout(r, 3000 * attempts));
            await resetPool();
            continue;
          }
        }

        // Any other errors or final attempt
        throw error;
      }
    }
  });
}

// Retry wrapper with proper backoff and error handling
export async function executeQueryWithRetry(queryOptions) {
  const MAX_RETRIES = 2;
  const BASE_DELAY_MS = 2000;

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await query(queryOptions);
    } catch (error) {
      lastError = error;
      console.warn(`Query retry ${attempt}/${MAX_RETRIES} failed: ${error.message}`);

      // Stop retrying for certain errors or on final attempt
      if (attempt === MAX_RETRIES || !isRetryableError(error)) {
        break;
      }

      // Wait longer between retries
      const delay = BASE_DELAY_MS * attempt;
      console.log(`Waiting ${delay}ms before retry...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }

  // If we got here, we failed all retries
  throw lastError;
}

// Check if an error is worth retrying
function isRetryableError(error) {
  const retryableErrors = [
    'ER_LOCK_DEADLOCK',
    'ER_QUERY_TIMEOUT',
    'ER_LOCK_WAIT_TIMEOUT',
    'ETIMEDOUT',
    'ECONNRESET',
    'ECONNREFUSED',
    'PROTOCOL_CONNECTION_LOST'
  ];

  // We handle ER_TOO_MANY_USER_CONNECTIONS specially in the query function
  return retryableErrors.some(code =>
    error.code === code ||
    (error.message && error.message.includes(code))
  );
}

// Status function for monitoring
export function getConnectionStatus() {
  return {
    poolExists: !!globalState.pool,
    isResetting: globalState.isResetting,
    activeQueries: queryQueue.running,
    queuedQueries: queryQueue.queue.length,
    maxConcurrent: globalState.maxConcurrentQueries
  };
}
