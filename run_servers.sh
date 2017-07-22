
echo "Stopping existing services"
service mosquitto stop
service nginx stop

echo "\n\nCopying Configs\n\n"
cp ./config_templates/bgw_config.json ../iot-bgw/config/config.json
cp ./config_templates/mosquitto.conf /etc/mosquitto/mosquitto.conf
cp ./config_templates/nginx.sites /etc/nginx/sites-enabled/default


echo "Starting Services"
echo "Starting Upstream Web Server"
node ./servers/simpleWebServer.js &
sleep 3
echo "Starting Simple Node Http Proxy"
node ./servers/simpleProxyServer.js &
sleep 3
echo "Starting Mosquitto"
service mosquitto start
sleep 3
echo "Starting Nginx"

echo "\n\nPlease start the BGW and make sure all services are working before starting bench marking\n\n "
