const tls = require('tls');
const fs = require('fs');

const port = 9080
const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('srv.pem'),
};

let counter = 0

const server = tls.createServer(options, (socket) => {
  counter++
  //simple echo server
  socket.pipe(socket);
});
server.listen(port, () => console.log(`Bind port ${port}`));

setInterval(()=>console.log(`connected users: ${counter}`),3000)
