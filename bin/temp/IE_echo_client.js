const tls = require('tls');
const fs = require('fs');

const port = 9080;
const users = 4500;
const is_secure = 

// DNS record points to localhost
const host = 'bgw.hareeqi.com'
const options = {
  ca: [ fs.readFileSync('srv.pem') ]
};

const user = (count)=> {
  const client = tls.connect(port,host, options, function() {
    client.on('data',(data)=>console.log(data));
    client.on('end', ()=>console.log(`Connection ended ${count}`));
  });
}

for (let i = 0 ; i < users ; ++i){
  user(i)
}
