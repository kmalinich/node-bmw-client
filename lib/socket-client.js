var module_name = __filename.slice(__dirname.length + 1, -3);

var server_url = 'http://kdm-e39-02.z1.hot-grbg.net:3002';

module.exports = {
	io : require('socket.io-client')(server_url),

	startup : (callback) => {
		socket_client.io.on('connect', () => {
			log.msg({
				src : 'socket',
				msg : 'connected',
			});

			omnibus.IKE.obc_refresh();
		});

		socket_client.io.on('disconnect', () => {
			log.msg({
				src : 'socket',
				msg : 'disconnected',
			});

			json.reset();
		});

		socket_client.io.on('data-receive', (data) => {
			omnibus.data_handler.check_data(data);
		});

		callback();
	},

	data_send : (data) => {
		socket_client.io.emit('data-send', data);
	},
};
