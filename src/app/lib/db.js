import mysql from 'mysql2/promise';

// Use global object in development to prevent multiple pools during HMR
const globalForDb = globalThis;

function createPool() {
    if (!globalForDb.dbPool) {
        globalForDb.dbPool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            waitForConnections: true,
            connectionLimit: 8, // Reduced to stay under phpMyAdmin limit
            queueLimit: 0,
            connectTimeout: 60000,
            idleTimeout: 300000, // Close idle connections after 5 minutes
            maxIdle: 3 // Keep fewer idle connections in dev
        });

        // Log pool creation (helpful for debugging HMR issues)
        if (process.env.NODE_ENV === 'development') {
            console.log('Database pool created');
        }
    }
    return globalForDb.dbPool;
}

export async function query(sql, values = []) {
    try {
        const pool = createPool();
        const [results] = await pool.execute(sql, values);
        return results;
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
}

export async function executeQueryWithRetry({ query: sql, values = [] }) {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await query(sql, values);
        } catch (error) {
            console.error(`Query attempt ${attempt}/${maxRetries} failed:`, error.message);

            if (attempt === maxRetries) {
                throw error;
            }

            await delay(baseDelay * attempt);
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function closePool() {
    if (globalForDb.dbPool) {
        await globalForDb.dbPool.end();
        globalForDb.dbPool = null;
        console.log('Database pool closed');
    }
}

// Development-specific cleanup
if (process.env.NODE_ENV === 'development') {
    // Clean up on hot reload
    if (module.hot) {
        module.hot.dispose(() => {
            closePool();
        });
    }
}
