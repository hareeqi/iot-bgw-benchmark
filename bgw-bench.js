
const { execSync } = require('child_process');

const totalRounds = 5
const sleepTime = 5
const cons = [10,600,800,1000,1200,1400]

const roundsString = (new Array(totalRounds)).fill(0).map((n,i)=>"Round "+(i+1)).join(',')
const targetHost = "testbgw.bgw.hareeqi.com"
const httpCommand = (con, port)=> {
  const PORT = port == 443 ?"":`:${port}`;
  const protocol = port==9080 ?'http':'https';
  return `./bin/hey -n 10000 -c ${con} ${protocol}://${targetHost}${PORT}/page/?bgw_key=admin.test.7UQ4zTKbjv85YKxJwX6Tky1tIl7cpvGHPdsqBTwGZMz`
}
const mqttCommand = (con, port, action)=> `./bin/mqtt-bench -broker=ssl://${targetHost}:${port} -action=${action} -tls=server:srv.pem -clients=10000 -count=${con} `

let report = ""

const  parseMqttResult = (result) => 555
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





(async ()=>{
  console.log(`Starting bench marking with ${sleepTime} seconds sleep time between rounds and total of ${totalRounds} rounds`);
  console.log(`With the follwoing concurnet connections ${cons.join(',')}\n\n`);

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
  await scenario('http','Direct No-SSL',9080)

  report = `BGW Report generated at ${Date()} \n\n` + report
  console.log("\n\n\n"+report);
})()
