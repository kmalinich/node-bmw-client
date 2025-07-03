/* eslint require-atomic-updates : 0 */

// TODO: Make a class, obviously
// TODO: Add missing try/catch blocks


// Start back at square one
async function reInit() {
	if (kodi.reconnecting !== true) {
		log.lib('Disconnected from ' + config.media.kodi.host + ':' + config.media.kodi.port);

		if (kodi.socket !== null) {
			IKE.text_warning('  Kodi disconnected ', 4000);
		}

		log.lib('Attempting to reconnect');

		TEL.led({ flash_yellow : true });
	}

	kodi.connected = false;
	kodi.socket    = null;

	kodi.reconnecting = true;

	await new Promise(resolve => setTimeout(resolve, kodi.initWait));
	await kodi.init();
} // async reInit()

// Loop init until it hooks
async function init() {
	// Don't run if not enabled
	if (config.media.kodi.enable !== true) return;

	// Don't run if not needed
	if (kodi.socket !== null) {
		log.lib('Not initializing, socket is already populated');
		return;
	}

	kodi.connected  = false;
	kodi.connecting = true;

	update.status('kodi.player.status', null);

	// Increment counter
	kodi.initCount++;

	// Only display log message on initial connection attempt
	if (kodi.reconnecting === false) {
		log.lib('Connecting to ' + config.media.kodi.host + ':' + config.media.kodi.port);
	}

	// Kodi WebSocket API library
	const kodi_ws = require('kodi-ws')(config.media.kodi.host, config.media.kodi.port);


	try {
		kodi.socket = await kodi_ws;

		kodi.connected    = true;
		kodi.connecting   = false;
		kodi.reconnecting = false;

		log.lib('Connected to ' + config.media.kodi.host + ':' + config.media.kodi.port);

		kodi.notify('bmwcd', 'bmwcd connected');

		TEL.led({ flash_green : true });

		// Event/error handling
		kodi.socket.on('error', error => {
			log.error(error.code);
			reInit();
		});


		kodi.socket.notification('Application.OnVolumeChanged', volume => {
			update.status('kodi.volume.level', Math.round(volume.data.volume), false);
			update.status('kodi.volume.muted', volume.data.muted,              false);
		});


		kodi.socket.notification('Player.OnPause', player => {
			update.status('kodi.player.status', 'paused', false);
			TEL.led({ solid_yellow : true });
			processPlayerData(player);
		});

		kodi.socket.notification('Player.OnPlay', player => {
			update.status('kodi.player.status', 'playing', false);
			TEL.led({ solid_green : true });
			processPlayerData(player);
		});

		kodi.socket.notification('Player.OnPropertyChanged', player => {
			log.lib('Player property changed', false);
			processPlayerData(player);
		});

		kodi.socket.notification('Player.OnSeek', player => {
			update.status('kodi.player.status', 'seeking', false);
			TEL.led({ flash_yellow : true });
			processPlayerData(player);
		});

		kodi.socket.notification('Player.OnStop', player => {
			update.status('kodi.player.status', 'stopped', false);
			TEL.led({ solid_red : true });
			processPlayerData(player);
		});


		kodi.socket.notification('GUI.OnDPMSActivated', () => {
			log.lib('DPMS activated');
		});

		kodi.socket.notification('GUI.OnDPMSDeactivated', () => {
			log.lib('DPMS deactivated');
		});


		kodi.socket.notification('GUI.OnScreensaverActivated', () => {
			log.lib('Screensaver activated');
		});

		kodi.socket.notification('GUI.OnScreensaverDeactivated', () => {
			log.lib('Screensaver deactivated');
		});


		kodi.socket.notification('AudioLibrary.OnCleanStarted', () => {
			const log_msg = 'Audio library clean started';
			log.lib(log_msg);
			config.media.kodi.text.ike === true && IKE.text_override(log_msg);
		});

		kodi.socket.notification('AudioLibrary.OnCleanFinished', () => {
			const log_msg = 'Audio library clean finished';
			log.lib(log_msg);
			config.media.kodi.text.ike === true && IKE.text_override(log_msg);
		});


		kodi.socket.notification('AudioLibrary.OnScanStarted', () => {
			const log_msg = 'Audio library scan started';
			log.lib(log_msg);
			config.media.kodi.text.ike === true && IKE.text_override(log_msg);
		});

		kodi.socket.notification('AudioLibrary.OnScanFinished', () => {
			const log_msg = 'Audio library scan finished';
			log.lib(log_msg);
			config.media.kodi.text.ike === true && IKE.text_override(log_msg);
		});


		kodi.socket.notification('AudioLibrary.OnUpdate', data => {
			log.lib('Audio library item updated, id : ' + data.data.id + ', type : ' + data.data.type);
		});

		kodi.socket.notification('AudioLibrary.OnRemove', data => {
			log.lib('Audio library item removed, id : ' + data.data.id + ', type : ' + data.data.type);
		});


		kodi.socket.notification('System.OnLowBattery', () => {
			log.lib('System is on low battery');
		});

		kodi.socket.notification('System.OnQuit', () => {
			log.lib('Kodi is quitting');
		});

		kodi.socket.notification('System.OnRestart', () => {
			log.lib('System will be restarted');
		});

		kodi.socket.notification('System.OnSleep', () => {
			log.lib('System will be suspended');
		});

		kodi.socket.notification('System.OnWake', () => {
			log.lib('System woke from suspension');
		});


		getActivePlayers();
	}
	catch (error) {
		if (kodi.reconnecting === false) log.error('Connect error : ' + error.code);
		await reInit();
	}
} // async init()

// Clear kodi.socket and loops if need be
async function term() {
	if (config.media.kodi.enable !== true) return;

	log.lib('Terminating');

	// Pause playback
	command('pause');

	await new Promise(resolve => setTimeout(resolve, 250));

	kodi.socket = null;


	log.lib('Terminated');
}


function init_listeners() {
	if (config.media.kodi.enable !== true) return;

	// Perform commands on power lib active event
	power.on('active', async power_state => {
		switch (power_state) {
			case false : {
				// Set volume to default
				await volume(config.media.kodi.default_volume);

				// Pause playback
				await command('pause');

				break;
			}

			case true : {
				// Set volume to default
				await volume(config.media.kodi.default_volume);

				// Resume playback
				await command('play');
			}
		}
	});

	// CON taps = emulate click, if the last CON input received wasn't rotation
	update.on('status.con.touch.count', async data => {
		// Bail here if Kodi is set to ignore CON touchpad events
		if (config.media.kodi.ignore.con.touch === true) return;

		if (status.con.last.event === 'rotation') return;

		if (data.new > 1) {
			kodi.ignoreTouch = true;
			return;
		}

		switch (data.new) {
			case 0 : {
				if (kodi.ignoreTouch === true) {
					kodi.ignoreTouch = false;
					return;
				}

				switch (data.old) {
					case 1 : await input('in'); break;
				}
			}
		}
	});

	log.lib('Initialized listeners');
} // init_listeners()


// Get all active players
async function getActivePlayers() {
	if (config.media.kodi.enable !== true) return;

	if (!kodi.socket.Player) return;

	try {
		const players = await kodi.socket.Player.GetActivePlayers();

		if (!players[0]) {
			log.lib('No players found');
			return;
		}

		update.status('kodi.player.id',   players[0].playerid, false);
		update.status('kodi.player.type', players[0].type,     false);

		const item_array = [ 'album', 'albumartist' ];

		try {
			const data = kodi.socket.Player.GetItem(players[0].playerid, item_array);
			processPlayerData({
				data : { item : data.item },
			});
		}
		catch (error) {
			log.error('getActivePlayers.Player.GetItem() error : ' + error.code);
		}
	}
	catch (error) {
		log.error('getActivePlayers() error : ' + error.code);

		await reInit();
	}
} // async getActivePlayers()


// Show notification in Kodi GUI
async function notify(title, message) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.lib('Disconnected, ' + title + ' cannot notify: \'' + message + '\'');
		return;
	}

	// TODO: Change to await + try/catch
	await kodi.socket.GUI.ShowNotification({ title, message });

	// Don't log message if coming from lib/socket.js, it can crowd the log
	if (title === 'socket') return;

	log.lib(title + ' notifies: \'' + message + '\'');
} // async notify(title, message)


async function guiActivateWindow(gui_window) {
	if (config.media.kodi.enable !== true) return;

	// TODO: Change to await + try/catch
	await kodi.socket.GUI.ActivateWindow({ 'window' : gui_window }).catch(error => {
		log.error('GUI.ActivateWindow error : ' + error.code);
	});
} // async guiActivateWindow(gui_window)

async function inputExecuteAction(input_action) {
	if (config.media.kodi.enable !== true) return;

	// TODO: Change to await + try/catch
	await kodi.socket.Input.ExecuteAction({ 'action' : input_action }).catch(error => {
		log.error('Input.ExecuteAction error : ' + error.code);
	});
} // async inputExecuteAction(input_action)


async function input(data) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.lib('Socket not ready, cannot input \'' + data + '\' command');
		return;
	}

	log.lib('Sending \'' + data + '\' input to Kodi');

	switch (data) {
		case 'back'  : await kodi.socket.Input.Back();  break;
		case 'down'  : await kodi.socket.Input.Down();  break;
		case 'left'  : await kodi.socket.Input.Left();  break;
		case 'right' : await kodi.socket.Input.Right(); break;
		case 'up'    : await kodi.socket.Input.Up();    break;

			// Non-standard entries - should be handled in modules/CON.js and modules/BMBT.js
		case 'cd' : guiActivateWindow('visualisation'); break;

		case 'in'     : await kodi.socket.Input.Select();      break;
		case 'menu'   : await kodi.socket.Input.Home();        break;
		case 'option' : await kodi.socket.Input.ContextMenu(); break;
		case 'radio'  : await kodi.socket.Input.ShowOSD();     break;
	}
} // async input(data)

// Send commands to Kodi media player over the JSON-RPC websocket API
async function command(action) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.lib('Socket not ready, cannot send \'' + action + '\' command');
		return;
	}

	try {
		// List active players
		const players = kodi.socket.Player.GetActivePlayers();

		// Map players
		for (const player of players) {
			update.status('kodi.player.id', player.playerid, false);

			log.lib('Sending \'' + action + '\' command to player ID ' + status.kodi.player.id);

			switch (action) {
				case 'getitem' : await kodi.socket.Player.GetItem(player.playerid); break;

				case 'stop'     : await kodi.socket.Player.Stop(player.playerid);      break;
				case 'toggle'   : await kodi.socket.Player.PlayPause(player.playerid); break;

				case 'previous' : await kodi.socket.Player.GoTo({ 'playerid' : player.playerid, 'to' : 'previous' }); break;
				case 'next'     : await kodi.socket.Player.GoTo({ 'playerid' : player.playerid, 'to' : 'next'     }); break;

				case 'pause' : {
					if (status.kodi.player.status === 'paused') break;
					await kodi.socket.Player.PlayPause(player.playerid);
					break;
				}

				case 'play' : {
					if (status.kodi.player.status === 'playing') break;
					await kodi.socket.Player.PlayPause(player.playerid);
					break;
				}

				case 'seek-forward' : await kodi.socket.Player.SetSpeed({ 'playerid' : player.playerid, 'speed' : 2 });  break;
				case 'seek-rewind'  : await kodi.socket.Player.SetSpeed({ 'playerid' : player.playerid, 'speed' : -2 }); break;
			} // switch (action)
		} // for (const player of players)
	}
	catch (error) {
		log.error('Command error code: ' + error.code);
		log.error(error);

		await reInit();
	}
} // async command(action)

// Send commands to Kodi media player over the JSON-RPC websocket API
async function volume(action) {
	if (config.media.kodi.enable !== true) return;

	if (kodi.socket === null) {
		log.lib('Socket not ready, cannot send volume ' + action + ' command');
		return;
	}

	log.lib('Sending volume \'' + action + '\' command');

	switch (action) {
		case 'down' : return inputExecuteAction('volumedown');
		case 'up'   : return inputExecuteAction('volumeup');

		default : {
			try {
				await kodi.socket.Application.SetVolume(action);
			}
			catch (error) {
				log.error('Volume error : ' + error.code);
				await reInit();
			}
		}
	}
} // async volume(action)

// Evaluate/process data sent from websocket event
function processPlayerData(player) {
	if (config.media.kodi.enable !== true) return;

	if (!player)      return;
	if (!player.data) return;

	if (player.data.item) {
		let player_artist;
		if (player.data.item.albumartist) {
			player_artist = player.data.item.albumartist[0];
		}
		else if (player.data.item.artist) {
			player_artist = player.data.item.artist[0];
		}

		update.status('kodi.player.artist', player_artist, false);


		if (player.data.item.album) update.status('kodi.player.album', player.data.item.album, false);
		if (player.data.item.type)  update.status('kodi.player.type',  player.data.item.type,  false);

		if (player.data.item.label) {
			update.status('kodi.player.title', player.data.item.label, false);
		}
		else if (player.data.item.title) {
			update.status('kodi.player.title', player.data.item.title, false);
		}
		else {
			getActivePlayers();
		}
	}

	if (player.data.player) {
		if (player.data.player.playerid) update.status('kodi.player.id', player.data.player.playerid, false);

		if (player.data.player.time) {
			if (player.data.player.time.minutes) update.status('kodi.player.time.minutes', player.data.player.time.minutes, false);
			if (player.data.player.time.seconds) update.status('kodi.player.time.seconds', player.data.player.time.seconds, false);
		}
	}
}


module.exports = {
	// Variables
	socket : null,

	connected    : false,
	connecting   : false,
	reconnecting : false,

	initCount : 0,
	initWait  : 1000,

	ignoreTouch : false,


	// Functions
	init,
	init_listeners,
	term,

	command,
	input,
	notify,
	volume,

	guiActivateWindow,
	inputExecuteAction,
};
