var mqtt = require('mqtt')




let client = null


module.exports.start = (options)=> {
  const c = mqtt.connect(Object.assign({ clean: true, keepalive: 0 },options))

  const publish = ()=> c.connected && c.publish(options.topic||'/mqtt-bench/benchmark', options.payload||'payload', publish)

  c.on('connect', publish)
  c.on('error',  ()=> {console.log('Boomning error - reconnect!');c.stream.end();})
  client = c
}

module.exports.stop = ()=> client?client.end(true,()=>console.log('MQTT Bombing ended ')):console.log('Bombing must be started first')
