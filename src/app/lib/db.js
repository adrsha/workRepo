import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    connectTimeout: 10000,
    waitForConnections: true,
    connectionLimit: 20,
});

export async function query({ query, values = [] }) {
    try {
        const [results] = await pool.execute(query, values);
        return results;
    } catch (error) {
        throw Error(error.message);
    }
}

export async function executeQueryWithRetry(queryOptions) {
    const MAX_RETRIES = 5;
    const RETRY_DELAY = 1000;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
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
        'PROTOCOL_CONNECTION_LOST'
    ];
    return retryableErrors.some(err => error.message.includes(err));
}
