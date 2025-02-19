import mysql from 'mysql2/promise';
let count = 0;
let globalPool;

function getPool() {
    // if (process.env.NODE_ENV === 'development') {
    //     if (globalPool) {
    //         console.log('Closing database connection pool');
    //         globalPool.end();
    //         count = 0;
    //     }
    //     console.log('Reloaded');
    // }
    if (!globalPool) {
        count++;
        globalPool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            connectTimeout: 10000,
            waitForConnections: true,
            connectionLimit: 40,
        });

        globalPool.on('connection', (connection) => {
            console.log(`New connection established: ${connection.threadId}`);
        });
        globalPool.on('release', (connection) => {
            console.log(`New connection released: ${connection.threadId}`);
        });

        globalPool.on('error', (err) => {
            console.error('Database pool error:', err);
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                globalPool = null;
            }
        });
    }
    return globalPool;
}

export async function query({ query, values = [] }) {
    const pool = getPool();
    const connection = await pool.getConnection();
    console.log('Connection created ', connection.threadId);

    try {
        const [results] = await connection.execute(query, values);
        return results;
    } catch (error) {
        throw Error(error.message);
    } finally {
        connection.release();
        console.log('Connection released ', connection.threadId);
        count = 0;
    }
}

export async function executeQueryWithRetry(queryOptions) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 1000;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            console.log('Count', count);
            return await query(queryOptions);
        } catch (error) {
            if (attempt === MAX_RETRIES || !isRetryableError(error)) {
                console.error(`Query failed after ${attempt} attempts:`, error);
                throw error;
            }
            console.warn(`Attempt ${attempt} failed: ${error.message}. Retrying in ${RETRY_DELAY}ms...`);
            await sleep(RETRY_DELAY);
        }
    }
}

// Function to check if an error is retryable
function isRetryableError(error) {
    const retryableErrors = [
        'ER_LOCK_DEADLOCK',
        'ER_QUERY_TIMEOUT',
        'ER_LOCK_WAIT_TIMEOUT',
        'ETIMEDOUT',
        'ECONNRESET',
        'ECONNREFUSED',
        'ER_TOO_MANY_USER_CONNECTIONS',
        'PROTOCOL_CONNECTION_LOST',
    ];
    return retryableErrors.some((err) => error.message.includes(err));
}
