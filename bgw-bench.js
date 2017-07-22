
const { execSync } = require('child_process');

const totalRounds = 5;
const sleepTime = 5;
const httpCons = [10,200,400,600,800,1000];
const mqttCons = [400,600,800,1000,1200,1400];
const targetHost = "testbgw.bgw.hareeqi.com";
const bgw_key = "admin.test.7UQ4zTKbjv85YKxJwX6Tky1tIl7cpvGHPdsqBTwGZMz"
const cert = "-tls=server:./certs/srv.pem"

const cons = process.argv[2] == "http"?httpCons:mqttCons
const roundsString = (new Array(totalRounds)).fill(0).map((n,i)=>"Round "+(i+1)).join(',')
const httpCommand = (con, port)=> {
  const PORT = port == 443 ?"":`:${port}`;
  const protocol = port==9080 ?'http':'https';
  return `./tools/hey -n 10000 -c ${con} ${protocol}://${targetHost}${PORT}/page/?bgw_key=${bgw_key}`
}
const mqttCommand = (con, port, action)=> {
  const is_tls = !(port==1883 || port == 5051)
  const protocol = is_tls?'ssl':'tcp';
  return `./tools/mqtt-bench -broker=${protocol}://${targetHost}:${port} -qos=1 -action=${action} ${is_tls?cert:""} -clients=10 -count=${con} -broker-username=${bgw_key} -intervaltime=1`
}

let report = ""

const  parseMqttResult = (result) => Math.round(Number(((""+result).split('throughput=')[1]).split('messages/sec')[0]))
const  parseHttpResult = (result) => Math.round(Number(((""+result).split('Requests/sec:')[1]).split('\n')[0]))
const avrage = (arr)=> Math.round(arr.reduce((a,b)=>a+b)/arr.length)
const arr2csv = (arr)=> report += arr.map((ob,i)=>cons[i]+'con,'+ob.join(',')).join('\n')

const sleep = ()=> new Promise(resolve => setTimeout(resolve, sleepTime*1000))
const scenario = async (protocol,name,port,args)=> {
  report += `Running Scenario: ${name} \nCons\\Rounds,${roundsString}, ${name} (avg)\n`
  const command = protocol=='http'? httpCommand : mqttCommand
  let csv = []
  console.log(`Running Scenario "${name}"`)
  for (let j = 0 ;j<cons.length; j++){
    csv[j] = []
    const exec = command(cons[j],port,args)
    for (let i = 0 ; i<totalRounds;i++){
      const result = execSync(exec)
      const parsedResult = protocol=='http'? parseHttpResult(result) : parseMqttResult(result)
      console.log(`Con ${cons[j]} - Round: ${i+1} - Result: ${parsedResult}`);
      csv[j].push(parsedResult)
      await sleep()
    }
    csv[j].push(avrage(csv[j]))
  }
  arr2csv(csv);
  console.log("\n");
  report +="\n\n"

}





const run_test = async (test_name,test_function)=>{
  console.log(`\n\n============\n${test_name}\n============\n\n`)
  console.log(`Starting bench marking with ${sleepTime} seconds sleep time between rounds and total of ${totalRounds} rounds`);
  console.log(`With the follwoing concurnet connections ${cons.join(',')}\n\n`);
  await test_function()
  report = `BGW Report generated at ${Date()} \n\n` + report
  console.log("\n\n\n"+report);
}
const http_test = async() => {
  await scenario('http','IoT BGW w/o EI',5099)
  await sleep()
  await scenario('http','IoT BGW',443)
  await sleep()
  await scenario('http','Node HTTP Proxy',9083)
  await sleep()
  await scenario('http','Nginx Proxy',9082)
  await sleep()
  await scenario('http','Direct SSL',9081)
  await sleep()
  await scenario('http','Direct No-TLS',9080)
}
const mqtt_pub = async() => {
  await scenario('mqtt','BGW TLS',8883,'pub')
  await sleep()
  await scenario('mqtt','BGW w/o EI TLS',5098,'pub')
  await sleep()
  await scenario('mqtt','BGW w/o EI',5051,'pub')
  await sleep()
  await scenario('mqtt','Direct TLS',8884,'pub')
  await sleep()
  await scenario('mqtt','Direct',1883,'pub')
}

const mqtt_sub = async() => {
  const bomb = require('./mqtt-bombing')
  bomb.start({host:targetHost,port:1883})
  await sleep()
  await sleep()
  await scenario('mqtt','BGW TLS',8883,'sub')
  await sleep()
  await scenario('mqtt','BGW w/o EI TLS',5098,'sub')
  await sleep()
  await scenario('mqtt','BGW w/o EI',5051,'sub')
  await sleep()
  await scenario('mqtt','Direct TLS',8884,'sub')
  await sleep()
  await scenario('mqtt','Direct',1883,'sub')
  bomb.stop()
}
const mqtt_bombing = async() => {
  const bomb = require('./mqtt-bombing')
  bomb.start({host:targetHost,port:1883})
  await sleep()
  await sleep()
  bomb.stop()
}

switch (process.argv[2]) {
    case "http":
        run_test('HTTP Proxy Test',http_test);
        break;
    case "mqtt-pub":
        run_test('MQTT PUB Test',mqtt_pub);
        break;
    case "mqtt-sub":
        run_test('MQTT SUB Test',mqtt_sub);
        break;
    case "mqtt-bombing":
        mqtt_bombing();
        break;
    default:
        console.log('\n\n You must pass an argument "http" or "mqtt-pub" or "mqtt-sub" \n\n');
}
