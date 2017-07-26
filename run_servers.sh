
echo "Stopping existing services"
service mosquitto stop
service nginx stop

echo "\n\nCopying Configs\n\n"
cp ./config_templates/bgw_config.json ../iot-bgw/config/config.json
cp ./config_templates/mosquitto.conf /etc/mosquitto/mosquitto.conf
cp ./config_templates/nginx.sites /etc/nginx/sites-enabled/default


echo "Starting Services"
echo "========= Starting Upstream Web Server"
node ./servers/simpleWebServer.js &
sleep 6
echo "========= Starting Simple Node Http Proxy"
node ./servers/simpleProxyServer.js &
sleep 6
echo "========= Starting Node MQTT Pipe"
node ./servers/simpleTcpPipe.js &
sleep 6
echo "Starting Mosquitto"
service mosquitto start
sleep 3
echo "Starting Nginx"
service nginx start
sleep 3

echo "\n\nPlease start the BGW and make sure all services are working before starting bench marking\n\n "

    trap 'echo shutting down ; exit 0' INT

    while true
    do
        sleep 1
    done
