const fs = require('fs');
const https = require('https');
const http = require('http');
let agent  = new http.Agent({keepAlive:true});
const proxy = require('http-proxy').createProxyServer({});

const cluster = require('cluster');
const numCPUs = require('os').cpus().length;


const options = {
  key: fs.readFileSync('./certs/key.pem'),
  cert: fs.readFileSync('./certs/srv.pem')
};


if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running: CPU has ${numCPUs} cores`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (worker, code, signal) => console.log(`worker ${worker.process.pid} died`));
} else {

  http.createServer(options, (req, res) => {
    proxy.web(req, res, { target: 'http://testbgw.bgw.hareeqi.com:9080', agent:agent });
  }).listen(9084,()=>console.log(`Worker ${process.pid} started: Node Proxy HTTP:9084`));;

  https.createServer(options, (req, res) => {
    proxy.web(req, res, { target: 'http://testbgw.bgw.hareeqi.com:9080', agent:agent });
  }).listen(9085,()=>console.log(`Worker ${process.pid} started: Node Proxy HTTPS:9085`));;

}
