
const { execSync } = require('child_process');

///Configurable options
const totalRounds = 3;
const sleepTime = 5;
const lowCons = [10,200,400,600,800,1000]; // number of concrurent connections
const highCons = [600,800,1000,1200,1400,1600];
const targetHost = "testbgw.bgw.hareeqi.com";
const bgw_key = "admin.test.7UQ4zTKbjv85YKxJwX6Tky1tIl7cpvGHPdsqBTwGZMz"
const cert = "-tls=server:./certs/srv.pem"
const mqttQoS = 0;
const mqttCount = 200; // number of messages for each connecting client
const mqttInterval = 1 // for each client number of milisecons between each message
const httpTotalRequests = 10000;

//End of configurable options


const isHTTP = process.argv[2] == "http"
const cons = process.argv[3] == "high" ?highCons:lowCons
const roundsString = (new Array(totalRounds)).fill(0).map((n,i)=>"Round "+(i+1)).join(',')
const httpCommand = (con, port)=> {
  const PORT = port == 443 ?"":`:${port}`;
  const protocol = port==9080 ?'http':'https';
  return `./tools/hey -n ${httpTotalRequests} -c ${con} ${protocol}://${targetHost}${PORT}/page/?bgw_key=${bgw_key}`
}
const mqttCommand = (con, port, action)=> {
  const is_tls = !(port==1883 || port == 5051)
  const protocol = is_tls?'ssl':'tcp';
  return `./tools/mqtt-bench -broker=${protocol}://${targetHost}:${port} -qos=${mqttQoS} -action=${action} ${is_tls?cert:""} -clients=${con} -count=${mqttCount} -broker-username=${bgw_key} -intervaltime=${mqttInterval}`
}
const command = isHTTP? httpCommand : mqttCommand

let report = ""
let summery= ""

const  parse = (result) => Number(((""+result).split(isHTTP?:'Requests/sec:''throughput=')[1]).split(isHTTP?'\n':'messages/sec')[0])
const avrage = (arr)=> Math.round(arr.reduce((a,b)=>a+b)/arr.length)
const arr2csv = (arr)=> report += arr.map((ob,i)=>cons[i]+'con,'+ob.join(',')).join('\n')


const sleep = ()=> new Promise(resolve => setTimeout(resolve, sleepTime*1000))
const scenario = async (name,port,args)=> {
  report += `Running Scenario: ${name} \nCons\\Rounds,${roundsString}, ${name} (avg)\n`
  summery+=name+","

  let csv = []
  console.log(`Running Scenario "${name}"`)
  for (let j = 0 ;j<cons.length; j++){
    csv[j] = []
    const commandString = command(cons[j],port,args)
    for (let i = 0 ; i<totalRounds;i++){
      const result = parse(execSync(commandString))
      console.log(`Con ${cons[j]} - Round: ${i+1} - Result: ${result}`);
      csv[j].push(result)
      await sleep()
    }
    const avg = avrage(csv[j])
    summery += avg+(j==(cons.length-1)?"":",")
    csv[j].push(avg)
  }
  arr2csv(csv);
  summery += '\n'
  console.log("\n");
  report +="\n\n"

}




const seprator = '\n\n----------------------------------------------------------\n\n'
const run_test = async (test_name,test_function)=>{
  console.log(`\n\n============\n${test_name}\n============\n\n`)
  console.log(`Starting bench marking with ${sleepTime} seconds sleep time between rounds and total of ${totalRounds} rounds`);
  console.log(`With the follwoing concurnet connections ${cons.join(',')}\n\n`);
  await test_function()
  summery = seprator+"Scenario\\Cons" +cons.join('cons,')+"cons"+summery+seprator
  report = `BGW Report generated at ${Date()} \n\n` + summery +report

  console.log("\n\n\n"+report);
}
const http_test = async() => {
  await scenario('IoT BGW w/o EI',5099)
  await sleep()
  await scenario('IoT BGW',443)
  await sleep()
  await scenario('Node HTTP Proxy',9083)
  await sleep()
  await scenario('Nginx Proxy',9082)
  await sleep()
  await scenario('Direct SSL',9081)
  await sleep()
  await scenario('Direct No-TLS',9080)
}
const mqtt_pub = async() => {
  await scenario('BGW TLS',8883,'pub')
  await sleep()
  await scenario('BGW w/o EI TLS',5098,'pub')
  await sleep()
  await scenario('BGW w/o EI',5051,'pub')
  await sleep()
  await scenario('Direct TLS',8884,'pub')
  await sleep()
  await scenario('Direct',1883,'pub')
}

const mqtt_sub = async() => {
  const bomb = require('./mqtt-bombing')
  bomb.start({host:targetHost,port:1883})
  await sleep()
  await sleep()
  await scenario('BGW TLS',8883,'sub')
  await sleep()
  await scenario('BGW w/o EI TLS',5098,'sub')
  await sleep()
  await scenario('BGW w/o EI',5051,'sub')
  await sleep()
  await scenario('Direct TLS',8884,'sub')
  await sleep()
  await scenario('Direct',1883,'sub')
  bomb.stop()
}
const mqtt_bombing = async() => {
  const bomb = require('./tools/mqtt-bombing')
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
        console.log('\n\n You must pass an argument "http" or "mqtt-pub" or "mqtt-sub" ');
        console.log('\n\n You can also use the low and high flag to set number of concurrent connection')
        console.log('\n\n  Example bgw-bench mqtt-pub high')
}
