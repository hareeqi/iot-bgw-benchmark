
const { execSync } = require('child_process');

///Configurable options
const totalRounds = 3;
const sleepTime = 5;
// number of concrurent connections
const httpCons ={low: [10,200,400,600,800,1000],high:[600,800,1000,1200,1400,1600]}
const mqttCons ={low: [50,60,70,80,90,100],high:[500,600,700,800,900,1000]} ;
const targetHost = "testbgw.bgw.hareeqi.com";
const bgw_key = "admin.test.7UQ4zTKbjv85YKxJwX6Tky1tIl7cpvGHPdsqBTwGZMz"
const cert = "./certs/srv.pem"
const mqttQoS = process.argv[4] ||  0;
const mqttCount = 100; // number of messages for each connecting client
const mqttInterval = 1 // for each client number of milisecons between each message
const httpTotalRequests = 10000;

//End of configurable options


const isHTTP = process.argv[2] == "http"
let cons = isHTTP ?httpCons:mqttCons
cons = process.argv[3] == "high" ?cons.high:cons.low
const roundsString = (new Array(totalRounds)).fill(0).map((n,i)=>"Round "+(i+1)).join(',')
const httpCommand = (con, port)=> {
  const protocol = port%2==0 ?'http':'https';
  return `./tools/hey -n ${httpTotalRequests} -c ${con} ${protocol}://${targetHost}:${port}/page/?bgw_key=${bgw_key}`
}
const mqttCommand = (con, port)=> {
  const protocol = (port%2 == 0 || port === 8883)?'mqtts':'mqtt';
  return `./node_modules/.bin/mqtt-benchmark --broker=${protocol}://${targetHost}:${port} --qos=${mqttQoS} --ca=${cert} --clients=${con} --count=${mqttCount} --username=${bgw_key} --sleep=${mqttInterval}`
}
const command = isHTTP? httpCommand : mqttCommand

let summery= ""

const  parse = (result) =>Number(((""+result).split(isHTTP?'Requests/sec:':'(msg/sec): ')[1]).split('\n')[0])
const avrage = (arr)=> Math.round(arr.reduce((a,b)=>a+b)/arr.length)


const sleep = ()=> new Promise(resolve => setTimeout(resolve, sleepTime*1000))
const scenario = async (name,port)=> {
  summery+=name+","

  let csv = []
  console.log(`Running Scenario "${name}"`)
  for (let j = 0 ;j<cons.length; j++){
    csv[j] = []
    const commandString = command(cons[j],port)
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
  summery += '\n'
  console.log("\n");

}




const seprator = '\n\n--------------------------- Summery -------------------------------\n\n'
const run_test = async (test_name,test_function)=>{
  console.log(`\n\n============\n${test_name}\n============\n\n`)
  console.log(`Starting bench marking with ${sleepTime} seconds sleep time between rounds and total of ${totalRounds} rounds`);
  console.log(`With the follwoing concurnet connections ${cons.join(',')}\n\n`);
  await test_function()
  summery = seprator+"Scenario\\CC," +cons.join(' CC,')+"cons\n"+summery+seprator
  summery = `\n\n\nBGW Report generated at ${Date()} \n\n` + summery
  console.log(summery);
}
const http_test = async() => {
  /// NONE TLS tests
  await scenario('Direct',9080)
  await sleep()
  await scenario('Nginx Proxy',9082)
  await sleep()
  await scenario('Node HTTP Proxy',9084)
  await sleep()
  await scenario('IoT BGW',5050)
  await sleep()
  // TLS TESTS
  await scenario('TLS - Direct',9081)
  await sleep()
  await scenario('TLS - Nginx Proxy',9083)
  await sleep()
  await scenario('TLS - Node HTTP Proxy',9085)
  await sleep()
  await scenario('TLS - IoT BGW',5099)
  await sleep()
  await scenario('TLS - IoT BGW W EI',443)

}
const mqtt_test = async() => {
  // TLS TESTS
  await scenario('TLS - Direct',8884)
  await sleep()
  await scenario('TLS - Nodejs pipe',8886)
  await sleep()
  await scenario('TLS - IoT BGW',5098)
  await sleep()
  await scenario('TLS - IoT BGW W EI',8883)
  await sleep()
  /// NONE TLS tests
  await scenario('Direct',1883)
  await sleep()
  await scenario('Nodejs pipe',8889)
  await sleep()
  await scenario('IoT BGW',5051)
  await sleep()




}



switch (process.argv[2]) {
    case "http":
        run_test('HTTP Proxy Test',http_test);
        break;
    case "mqtt":
        run_test('MQTT Proxy Test',mqtt_test);
        break;
    default:
        console.log('\n\n You must pass an argument "http" or "mqtt" ');
        console.log('\n\n You can also use the low and high flag to set number of concurrent connection')
        console.log('\n\n  Example bgw-bench mqtt high')
}
