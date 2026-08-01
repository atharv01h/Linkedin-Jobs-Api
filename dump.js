const http = require('http'); http.createServer((req, res) => { console.log(req.method, req.url, req.headers); res.end('OK'); process.exit(0); }).listen(3001, () => console.log('Listening'));
