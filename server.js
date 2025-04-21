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
