const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const root = path.join(__dirname, '..', 'src');
const port = process.env.PORT || 4173;

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath);
  const contentType = mime[ext] || 'text/plain';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);
  const safePath = path.normalize(pathname).replace(/^\\|\.\.+/g, '');
  let filePath = path.join(root, safePath);

  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallback = path.join(root, 'index.html');
      if (fs.existsSync(fallback)) {
        sendFile(res, fallback);
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
      return;
    }
    sendFile(res, filePath);
  });
});

server.listen(port, () => {
  console.log(`Dev server running at http://localhost:${port}`);
});
