const https = require('https');
const http = require('http');
const fs = require('fs');

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;



if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running: CPU has ${numCPUs} cores`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => console.log(`worker ${worker.process.pid} died`));
} else {

  // Non-Secure HTTP server
  http.createServer((req, res) => {
    res.writeHead(200);
    res.end('hello world\n');
  }).listen(9080,()=>console.log('HTTP:9080'));



  const options = {
    key: fs.readFileSync('./certs/key.pem'),
    cert: fs.readFileSync('./certs/srv.pem')
  };

  // Secure HTTPS Server
  https.createServer(options, (req, res) => {
    res.writeHead(200);
    res.end('hello world\n');
  }).listen(9081,()=>console.log('HTTPS:9081'));
}
