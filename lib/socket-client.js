var module_name = __filename.slice(__dirname.length + 1, -3);

var server_url = 'http://kdm-e39-02.z1.hot-grbg.net:3002';
var io = require('socket.io-client')(server_url);

io.on('connect', () => {
  console.log('EVENT: connect');
});

io.on('disconnect', () => {
  console.log('EVENT: disconnect');
});

io.on('bus-data', (data) => {
	omnibus.data_handler.check_data(data);
});
