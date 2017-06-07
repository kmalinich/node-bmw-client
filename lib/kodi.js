var module_name = __filename.slice(__dirname.length + 1, -3);

// Only pull in libraries if kodi is enabled
if (config.media.kodi.enable === true) {
  // Kodi WebSocket API library
  var kodi_ws = require('kodi-ws');
}

// Evaluate/process data sent from websocket event
function process_player_data(player) {
  if (config.media.kodi.enable !== true) return;

  if (player.data) {
    if (player.data.item) {
      if (player.data.item.album) { status.kodi.player.album = player.data.item.album; }
      if (player.data.item.type ) { status.kodi.player.type  = player.data.item.type;  }
      if (player.data.item.title) { status.kodi.player.title = player.data.item.title; }
      if (player.data.item.label) { status.kodi.player.title = player.data.item.label; }

      if (player.data.item.artist     ) { status.kodi.player.artist = player.data.item.artist[0];      }
      if (player.data.item.albumartist) { status.kodi.player.artist = player.data.item.albumartist[0]; }

      if (player.data.item.label || player.data.item.title) {
        if (status.kodi.player.status === 'playing') {
          IKE.text_override(status.kodi.player.artist+' - '+status.kodi.player.title);
        }
      }
      else {
        get_active_players(() => {});
      }
    }

    if (player.data.player) {
      if (player.data.player.playerid) { status.kodi.player.id = player.data.player.playerid; }
      if (player.data.player.time) {
        if (player.data.player.time.minutes) { status.kodi.player.time.minutes = player.data.player.time.minutes; }
        if (player.data.player.time.seconds) { status.kodi.player.time.seconds = player.data.player.time.seconds; }
      }
    }
  }
}

// Loop start until it hooks
function start(start_callback = null) {
  // Don't run if not enabled
  if (config.media.kodi.enable !== true) {
    if (typeof start_callback === 'function') start_callback();
    start_callback = undefined;
    return;
  }

  // Don't run if not needed
  if (kodi.socket !== null) {
    log.msg({
      src : module_name,
      msg : 'Not performing start, socket is already populated',
    });

    if (kodi.timeout_start !== null) {
      clearTimeout(kodi.timeout_start);
      kodi.timeout_start = null;
    }

    if (typeof start_callback === 'function') start_callback();
    start_callback = undefined;
    return;
  }

  // Increment counter
  kodi.count_start++;

  log.msg({
    src : module_name,
    msg : 'Connecting to '+config.media.kodi.host+':'+config.media.kodi.port+' (#'+kodi.count_start+')',
  });

  kodi_ws(config.media.kodi.host, config.media.kodi.port).then((promise_kodi_socket) => {
    kodi.socket = promise_kodi_socket;

    if (kodi.timeout_start !== null) {
      clearTimeout(kodi.timeout_start);
      kodi.timeout_start = null;
    }

    log.msg({
      src : module_name,
      msg : 'Connected to '+config.media.kodi.host+':'+config.media.kodi.port,
    });

    IKE.text_warning('Kodi:      connected', 3000);

    // Event/error handling
    kodi.socket.on('error', (error) => {
			log.msg({
				src : module_name,
				msg : 'Disconnected from '+config.media.kodi.host+':'+config.media.kodi.port,
			});

      IKE.text_warning('Kodi:   disconnected', 4000);

      if (kodi.timeout_start === null) {
        status.kodi.player.status = null;
        kodi.socket               = null;
        kodi.timeout_start        = setTimeout(kodi.start, 10000);
      }
    });

    kodi.socket.notification('Player.OnPause', (player) => {
      status.kodi.player.status = 'paused';
      log.msg({
        src : module_name,
        msg : 'Player '+status.kodi.player.status,
      });
      process_player_data(player);
    });

    kodi.socket.notification('Player.OnPlay', (player) => {
      status.kodi.player.status = 'playing';
      log.msg({
        src : module_name,
        msg : 'Player '+status.kodi.player.status,
      });
      process_player_data(player);
    });

    kodi.socket.notification('Player.OnPropertyChanged', (player) => {
      log.msg({
        src : module_name,
        msg : 'Player property changed',
      });
      process_player_data(player);
    });

    kodi.socket.notification('Player.OnSeek', (player) => {
      log.msg({
        src : module_name,
        msg : 'Player seeking',
      });
      process_player_data(player);
    });

    kodi.socket.notification('Player.OnStop', (player) => {
      status.kodi.player.status = 'stopped';
      log.msg({
        src : module_name,
        msg : 'Player '+status.kodi.player.status,
      });
      process_player_data(player);
    });

    kodi.socket.notification('GUI.OnDPMSActivated', () => {
      log.msg({
        src : module_name,
        msg : 'DPMS activated',
      });
    });

    kodi.socket.notification('GUI.OnDPMSDeactivated', () => {
      log.msg({
        src : module_name,
        msg : 'DPMS deactivated',
      });
    });

    kodi.socket.notification('Application.OnVolumeChanged', (volume) => {
      status.kodi.volume = {
        level : volume.data.volume,
        muted : volume.data.muted,
      };
    });

    kodi.socket.notification('GUI.OnScreensaverActivated', (data) => {
      log.msg({
        src : module_name,
        msg : 'Screensaver activated',
      });
    });

    kodi.socket.notification('GUI.OnScreensaverDeactivated', () => {
      log.msg({
        src : module_name,
        msg : 'Screensaver deactivated',
      });
    });

    kodi.socket.notification('AudioLibrary.OnScanStarted', () => {
      log.msg({
        src : module_name,
        msg : 'Audio library scan started',
      });
    });

    kodi.socket.notification('AudioLibrary.OnScanFinished', () => {
      log.msg({
        src : module_name,
        msg : 'Audio library scan finished',
      });
    });

    kodi.socket.notification('System.OnLowBattery', () => {
      log.msg({
        src : module_name,
        msg : 'System is on low battery',
      });
    });

    kodi.socket.notification('System.OnQuit', () => {
      log.msg({
        src : module_name,
        msg : 'Kodi is quitting',
      });
    });

    kodi.socket.notification('System.OnSleep', () => {
      log.msg({
        src : module_name,
        msg : 'System will be suspended',
      });
    });

    kodi.socket.notification('System.OnWake', () => {
      log.msg({
        src : module_name,
        msg : 'System woke from suspension',
      });
    });

    kodi.socket.notification('System.OnRestart', () => {
      log.msg({
        src : module_name,
        msg : 'System will be restarted',
      });
    });

    get_active_players(() => {});

    // Call me maybe?
    if (typeof start_callback === 'function') start_callback();
    start_callback = undefined;
  }).catch((e) => {
    // Handle errors
    log.msg({
      src : module_name,
      msg : 'Error: '+e.code,
    });

    if (kodi.timeout_start === null) {
      status.kodi.player.status = null;
      kodi.socket               = null;
      kodi.timeout_start   = setTimeout(kodi.start, 10000);
    }

    // Call me maybe?
    if (typeof start_callback === 'function') start_callback();
    start_callback = undefined;
  });
}

// Get all active players
function get_active_players(get_active_players_callback) {
  if (config.media.kodi.enable !== true) {
    if (typeof get_active_players_callback === 'function') get_active_players_callback();
    get_active_players_callback = undefined;
    return;
  }

  if (!kodi.socket.Player) {
    if (typeof get_active_players_callback === 'function') get_active_players_callback();
    get_active_players_callback = undefined;
    return;
  }

  kodi.socket.Player.GetActivePlayers().then((players) => {
    if (!players[0]) {
      log.msg({
        src : module_name,
        msg : 'No players found',
      });
    }
    else {
      status.kodi.player.id   = players[0].playerid;
      status.kodi.player.type = players[0].type;

      log.msg({
        src : module_name,
        msg : 'Found player, ID: '+status.kodi.player.id+', type \''+status.kodi.player.type+'\'',
      });

      var item_array = [ 'album', 'albumartist' ];

      kodi.socket.Player.GetItem(players[0].playerid, item_array).then((data) => {
        process_player_data({
          data : {
            item : data.item,
          },
        });
      });
    }

    // Call me maybe?
    if (typeof get_active_players_callback === 'function') get_active_players_callback();
    get_active_players_callback = undefined;
  }).catch((e) => {
    // Handle errors
    log.msg({
      src : module_name,
      msg : 'Error: '+e.code,
    });

    if (kodi.timeout_start === null) {
      status.kodi.player.status = null;
      kodi.socket               = null;
      kodi.timeout_start   = setTimeout(kodi.start, 10000);
    }

    // Call me maybe?
    if (typeof get_active_players_callback === 'function') get_active_players_callback();
    get_active_players_callback = undefined;
  });
}

// Clear kodi.socket and loops if need be
function stop(stop_callback) {
  if (config.media.kodi.enable !== true) {
    if (typeof stop_callback === 'function') stop_callback();
    stop_callback = undefined;
    return;
  }

  log.msg({
    src : module_name,
    msg : 'Shutting down',
  });

  if (kodi.timeout_start !== null) {
    clearTimeout(kodi.timeout_start);
  }

  kodi.socket             = null;
  kodi.timeout_start = null;

  if (typeof stop_callback === 'function') stop_callback();
  stop_callback = undefined;
}

// Show notification in Kodi GUI
function notify(title, message) {
  if (config.media.kodi.enable !== true) return;

  if (kodi.socket === null) {
		// log.msg({
		// 	src : module_name,
		// 	msg : 'Disconnected, '+title+' cannot notify: \''+message+'\'',
		// });
    return;
  }

  kodi.socket.GUI.ShowNotification({ 'title' : title, 'message' : message });

	// Don't log message if coming from the WebSocket library, it crowds the log
  if (title == 'socket') return;

  log.msg({
    src : module_name,
    msg : title+' notifies: \''+message+'\'',
  });
}

// Send commands to Kodi media player over the JSON-RPC websocket API
function command(action) {
  if (config.media.kodi.enable !== true) return;

  if (kodi.socket === null) {
    log.msg({
      src : module_name,
      msg : 'Socket not ready, cannot send \''+action+'\' command',
    });
    return;
  }

  kodi.socket.Player.GetActivePlayers().then((players) => { // List active players
    return Promise.all(players.map((player) => { // Map players
      status.kodi.player.id = player.playerid;

      log.msg({
        src : module_name,
        msg : 'Sending \''+action+'\' command to player ID '+status.kodi.player.id,
      });

      switch (action) {
        case 'getitem':
          return kodi.socket.Player.GetItem(player.playerid);
          break;

        case 'stop':
          return kodi.socket.Player.Stop(player.playerid);
          break;

        case 'toggle':
          return kodi.socket.Player.PlayPause(player.playerid);
          break;

        case 'previous':
          return kodi.socket.Player.GoTo({ 'playerid' : player.playerid, 'to' : 'previous' });
          break;

        case 'next':
          return kodi.socket.Player.GoTo({ 'playerid' : player.playerid, 'to' : 'next' });
          break;
      }
    }));
  }).catch((e) => {
    // Handle errors
    log.msg({
      src : module_name,
      msg : 'Error: '+e.code,
    });

    if (kodi.timeout_start === null) {
      status.kodi.player.status = null;
      kodi.socket               = null;
      kodi.timeout_start   = setTimeout(kodi.start, 10000);
    }
  });
}

// Send commands to Kodi media player over the JSON-RPC websocket API
function volume(action) {
  if (config.media.kodi.enable !== true) return;

  if (kodi.socket === null) {
    log.msg({
      src : module_name,
      msg : 'Socket not ready, cannot send volume \''+action+'\' command',
    });
    return;
  }

  log.msg({
    src : module_name,
    msg : 'Sending volume \''+action+'\' command',
  });

  switch (action) {
    case 'up':
      return kodi.socket.Input.ExecuteAction({ 'action' : 'volumeup',
      }).catch((e) => {
        // Handle errors
        log.msg({
          src : module_name,
          msg : 'Error: '+e.code,
        });

        if (kodi.timeout_start === null) {
          status.kodi.player.status = null;
          kodi.socket               = null;
          kodi.timeout_start   = setTimeout(kodi.start, 10000);
        }
      });
      break;

    case 'down':
      return kodi.socket.Input.ExecuteAction({ 'action' : 'volumedown',
      }).catch((e) => {
        // Handle errors
        log.msg({
          src : module_name,
          msg : 'Error: '+e.code,
        });

        if (kodi.timeout_start === null) {
          status.kodi.player.status = null;
          kodi.socket               = null;
          kodi.timeout_start   = setTimeout(kodi.start, 10000);
        }
      });
      break;
  }
}

module.exports = {
  socket : null,

  count_start   : 0,
  timeout_start : null,

  command : (action)         => { command(action);        },
  notify  : (title, message) => { notify(title, message); },
  start   : (start_callback) => { start(start_callback);  },
  stop    : (stop_callback)  => { stop(stop_callback);    },
  volume  : (action)         => { volume(action);         },
};
