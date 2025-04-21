// Add this at the very top of your file
try {
  const { setGlobalDispatcher, Agent } = require('undici');
  setGlobalDispatcher(new Agent({
    connections: 10, // Lower than default
    pipelining: 1
  }));
  console.log('Global HTTP dispatcher set with custom configuration');
} catch (err) {
  console.warn('Could not set global dispatcher:', err.message);
}

// Then your existing code
const next = require('next');
const express = require('express');

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';

const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = express();

  // Handle all requests with Next.js
  server.all('*', (req, res) => {
    return handle(req, res);
  });

  // Start listening
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on port ${port}`);
  });
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
