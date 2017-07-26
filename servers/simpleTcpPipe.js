const fs = require('fs');
const tls = require('tls');
const net = require('net');


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

  tls.createServer(options,function(srcClient) {
      const dstClient = net.connect({ host:"testbgw.bgw.hareeqi.com", port:1883 },()=>{
        srcClient.pipe(dstClient).pipe(srcClient);
      })
      srcClient.on('error',()=>{srcClient.destroy(); dstClient && dstClient.destroy()});
      dstClient.on('error',()=>{dstClient.destroy(); srcClient && srcClient.destroy()});
  }).listen(8886,()=>console.log(`Worker ${process.pid} started: Node MQTT Pipe:8886`));;

}
