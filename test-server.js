const http = require('http');

const server = http.createServer((req, res) => {
  console.log('METHOD:', req.method);
  console.log('URL:', req.url);
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    method: req.method, 
    url: req.url,
    message: 'Test server working'
  }));
});

server.listen(5500, () => {
  console.log('Test server running at http://localhost:5500/');
});
