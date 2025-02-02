import { query } from '../../lib/db'

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second delay between retries

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function executeQueryWithRetry(table) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await query({
        query: `SELECT * FROM ${table}`,
        values: [],
      });
      return result;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error; // If all retries failed, throw the error
      }
      console.log(`Attempt ${attempt} failed. Retrying in ${RETRY_DELAY}ms...`);
      await sleep(RETRY_DELAY);
    }
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    
    if (!table) {
      return Response.json({ error: 'Table parameter is required' }, { status: 400 });
    }

    const classes = await executeQueryWithRetry(table);
    return Response.json(classes);
  } catch (error) {
    console.error('Error executing query:', error);
    return Response.json({ 
      error: 'Failed to fetch data after multiple attempts',
      details: error.message 
    }, { status: 500 });
  }
}
