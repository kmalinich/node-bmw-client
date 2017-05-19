var module_name = __filename.slice(__dirname.length + 1, -3);

// Only pull in libraries if kodi is enabled
if (config.media.kodi.enable === true) {
  // Kodi WebSocket API library
  var kodi_ws = require('kodi-ws');
}

// Evaluate/process data sent from websocket event
function process_player_data(player) {
  if (config.media.kodi.enable !== true) {
    return;
  }

  if (player.data) {
    if (player.data.item) {
      if (player.data.item.album ) { status.kodi.player.album  = player.data.item.album;     }
      if (player.data.item.type  ) { status.kodi.player.type   = player.data.item.type;      }
      if (player.data.item.title ) { status.kodi.player.title  = player.data.item.title;     }
      if (player.data.item.label ) { status.kodi.player.title  = player.data.item.label;     }

      if (player.data.item.artist) { status.kodi.player.artist = player.data.item.artist[0]; }
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

function autoconfig(callback = null) {
  // Don't run if not enabled
  if (config.media.kodi.enable !== true) {
    if (typeof callback === 'function') { callback(); }
    callback = undefined;
    return;
  }

  // Don't run if not needed
  if (kodi.socket !== null) {
    log.msg({
      src : 'kodi',
      msg : 'Not performing autoconfig, socket is already populated',
    });

    if (kodi.timeout_autoconfig !== null) {
      clearTimeout(kodi.timeout_autoconfig);
      kodi.timeout_autoconfig = null;
    }

    if (typeof callback === 'function') { callback(); }
    callback = undefined;
    return;
  }

  // Increment counter
  kodi.count_autoconfig++;

  log.msg({
    src : 'kodi',
    msg : 'Performing autoconfig loop #'+kodi.count_autoconfig+', target \''+config.media.kodi.host+':'+config.media.kodi.port+'\'',
  });

  kodi_ws(config.media.kodi.host, config.media.kodi.port).then((promise_kodi_socket) => {
    kodi.socket = promise_kodi_socket;

    if (kodi.timeout_autoconfig !== null) {
      clearTimeout(kodi.timeout_autoconfig);
      kodi.timeout_autoconfig = null;
    }

    log.msg({
      src : 'kodi',
      msg : 'Connected to instance',
    });

    IKE.text_warning('Kodi:      connected', 2000);

    // Event/error handling
    kodi.socket.on('error', (error) => {
      log.msg({
        src : 'kodi',
        msg : 'Socket error/application quit',
      });

      IKE.text_warning('Kodi:   disconnected', 2000);

			if (kodi.timeout_autoconfig === null) {
				status.kodi.player.status = null;
				kodi.socket               = null;
				kodi.timeout_autoconfig   = setTimeout(kodi.autoconfig, 10000);
			}
    });

    kodi.socket.notification('Player.OnPause', (player) => {
      status.kodi.player.status = 'paused';
      log.msg({
        src : 'kodi',
        msg : 'Player '+status.kodi.player.status,
      });
      process_player_data(player);
    });

    kodi.socket.notification('Player.OnPlay', (player) => {
      status.kodi.player.status = 'playing';
      log.msg({
        src : 'kodi',
        msg : 'Player '+status.kodi.player.status,
      });
      process_player_data(player);
    });

    kodi.socket.notification('Player.OnPropertyChanged', (player) => {
      log.msg({
        src : 'kodi',
        msg : 'Player property changed',
      });
      process_player_data(player);
    });

    kodi.socket.notification('Player.OnSeek', (player) => {
      log.msg({
        src : 'kodi',
        msg : 'Player seeking',
      });
      process_player_data(player);
    });

    kodi.socket.notification('Player.OnStop', (player) => {
      status.kodi.player.status = 'stopped';
      log.msg({
        src : 'kodi',
        msg : 'Player '+status.kodi.player.status,
      });
      process_player_data(player);
    });

    kodi.socket.notification('GUI.OnDPMSActivated', () => {
      log.msg({
        src : 'kodi',
        msg : 'DPMS activated',
      });
    });

    kodi.socket.notification('GUI.OnDPMSDeactivated', () => {
      log.msg({
        src : 'kodi',
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
        src : 'kodi',
        msg : 'Screensaver activated',
      });
    });

    kodi.socket.notification('GUI.OnScreensaverDeactivated', () => {
      log.msg({
        src : 'kodi',
        msg : 'Screensaver deactivated',
      });
    });

    kodi.socket.notification('AudioLibrary.OnScanStarted', () => {
      log.msg({
        src : 'kodi',
        msg : 'Audio library scan started',
      });
    });

    kodi.socket.notification('AudioLibrary.OnScanFinished', () => {
      log.msg({
        src : 'kodi',
        msg : 'Audio library scan finished',
      });
    });

    kodi.socket.notification('System.OnLowBattery', () => {
      log.msg({
        src : 'kodi',
        msg : 'System is on low battery',
      });
    });

    kodi.socket.notification('System.OnQuit', () => {
      log.msg({
        src : 'kodi',
        msg : 'Kodi is quitting',
      });
    });

    kodi.socket.notification('System.OnSleep', () => {
      log.msg({
        src : 'kodi',
        msg : 'System will be suspended',
      });
    });

    kodi.socket.notification('System.OnWake', () => {
      log.msg({
        src : 'kodi',
        msg : 'System woke from suspension',
      });
    });

    kodi.socket.notification('System.OnRestart', () => {
      log.msg({
        src : 'kodi',
        msg : 'System will be restarted',
      });
    });

    get_active_players(() => {});

    // Call me maybe?
    if (typeof callback === 'function') { callback(); }
    callback = undefined;
  }).catch((e) => {
    // Handle errors
    log.msg({
      src : 'kodi',
      msg : 'Error: '+e.code,
    });

		if (kodi.timeout_autoconfig === null) {
			status.kodi.player.status = null;
			kodi.socket               = null;
			kodi.timeout_autoconfig   = setTimeout(kodi.autoconfig, 10000);
		}

    // Call me maybe?
    if (typeof callback === 'function') { callback(); }
    callback = undefined;
  });
}

// Get all active players
function get_active_players(callback) {
  if (config.media.kodi.enable !== true) {
    if (typeof callback === 'function') { callback(); }
    callback = undefined;
    return;
  }

  if (!kodi.socket.Player) {
    if (typeof callback === 'function') { callback(); }
    callback = undefined;
    return;
  }

  kodi.socket.Player.GetActivePlayers().then((players) => {
    if (!players[0]) {
      log.msg({
        src : 'kodi',
        msg : 'No players found',
      });
    }
    else {
      status.kodi.player.id   = players[0].playerid;
      status.kodi.player.type = players[0].type;

      log.msg({
        src : 'kodi',
        msg : 'Found player, ID: '+status.kodi.player.id+', type \''+status.kodi.player.type+'\'',
      });

      var item_array = [
'album',
'albumartist',
      ];

      kodi.socket.Player.GetItem(players[0].playerid, item_array).then((data) => {
        process_player_data({
          data : {
            item : data.item,
          },
        });
      });
    }

    // Call me maybe?
    if (typeof callback === 'function') { callback(); }
    callback = undefined;
  }).catch((e) => {
    // Handle errors
    log.msg({
      src : 'kodi',
      msg : 'Error: '+e.code,
    });

		if (kodi.timeout_autoconfig === null) {
			status.kodi.player.status = null;
			kodi.socket               = null;
			kodi.timeout_autoconfig   = setTimeout(kodi.autoconfig, 10000);
		}

    // Call me maybe?
    if (typeof callback === 'function') { callback(); }
    callback = undefined;
  });
}

function shutdown(callback) {
  if (config.media.kodi.enable !== true) {
    if (typeof callback === 'function') { callback(); }
    callback = undefined;
    return;
  }

  log.msg({
    src : 'kodi',
    msg : 'Shutting down',
  });

  if (kodi.timeout_autoconfig !== null) {
    clearTimeout(kodi.timeout_autoconfig);
  }

  kodi.socket             = null;
  kodi.timeout_autoconfig = null;

  if (typeof callback === 'function') { callback(); }
  callback = undefined;
}

module.exports = {
  count_autoconfig   : 0,
  socket             : null,
  timeout_autoconfig : null,

  // Clear kodi.socket and loops if need be
  shutdown : (callback) => {
    shutdown(callback);
  },

  // Loop autoconfig until it hooks
  autoconfig : (callback) => {
    autoconfig(callback);
  },

  // Show notification in Kodi GUI
  notify : (title, message) => {
    if (config.media.kodi.enable !== true) {
      return;
    }

    if (kodi.socket === null) {
      log.msg({
        src : 'kodi',
        msg : 'Disconnected, cannot send notification \''+title+'\': \''+message+'\'',
      });
      return;
    }

    log.msg({
      src : 'kodi',
      msg : 'Sending notification \''+title+'\': \''+message+'\'',
    });

    kodi.socket.GUI.ShowNotification({
'title'   : title,
'message' : message,
    });
  },

  // Send commands to Kodi media player over the JSON-RPC websocket API
  command : (action) => {
    if (config.media.kodi.enable !== true) {
      return;
    }

    if (kodi.socket === null) {
      log.msg({
        src : 'kodi',
        msg : 'Socket not ready, cannot send \''+action+'\' command',
      });
      return;
    }

    kodi.socket.Player.GetActivePlayers().then((players) => { // List active players
      return Promise.all(players.map((player) => { // Map players
        status.kodi.player.id = player.playerid;

        log.msg({
          src : 'kodi',
          msg : 'Sending \''+action+'\' command to player ID '+status.kodi.player.id,
        });

        switch (action) {
          case 'getitem':
            return kodi.socket.Player.GetItem(player.playerid);
            break;

          case 'stop':
            return kodi.socket.Player.Stop(player.playerid);
            break;

          case 'pause':
            return kodi.socket.Player.PlayPause(player.playerid);
            break;

          case 'previous':
            return kodi.socket.Player.GoTo({
'playerid' : player.playerid,
'to'       : 'previous',
            });
            break;

          case 'next':
            return kodi.socket.Player.GoTo({
'playerid' : player.playerid,
'to'       : 'next',
            });
            break;
        }
      }));
    }).catch((e) => {
      // Handle errors
      log.msg({
        src : 'kodi',
        msg : 'Error: '+e.code,
      });

			if (kodi.timeout_autoconfig === null) {
				status.kodi.player.status = null;
				kodi.socket               = null;
				kodi.timeout_autoconfig   = setTimeout(kodi.autoconfig, 10000);
			}

      // Call me maybe?
      if (typeof callback === 'function') { callback(); }
      callback = undefined;
    });
  },

  // Send commands to Kodi media player over the JSON-RPC websocket API
  volume : (action) => {
    if (config.media.kodi.enable !== true) {
      return;
    }

    if (kodi.socket === null) {
      log.msg({
        src : 'kodi',
        msg : 'Socket not ready, cannot send volume \''+action+'\' command',
      });
      return;
    }

    log.msg({
      src : 'kodi',
      msg : 'Sending volume \''+action+'\' command',
    });

    switch (action) {
      case 'up':
        return kodi.socket.Input.ExecuteAction({
'action' : 'volumeup',
        }).catch((e) => {
          // Handle errors
          log.msg({
            src : 'kodi',
            msg : 'Error: '+e.code,
          });

					if (kodi.timeout_autoconfig === null) {
						status.kodi.player.status = null;
						kodi.socket               = null;
						kodi.timeout_autoconfig   = setTimeout(kodi.autoconfig, 10000);
					}

          // Call me maybe?
          if (typeof callback === 'function') { callback(); }
          callback = undefined;
        });
        break;

      case 'down':
        return kodi.socket.Input.ExecuteAction({
'action' : 'volumedown',
        }).catch((e) => {
          // Handle errors
          log.msg({
            src : 'kodi',
            msg : 'Error: '+e.code,
          });

					if (kodi.timeout_autoconfig === null) {
						status.kodi.player.status = null;
						kodi.socket               = null;
						kodi.timeout_autoconfig   = setTimeout(kodi.autoconfig, 10000);
					}

          // Call me maybe?
          if (typeof callback === 'function') { callback(); }
          callback = undefined;
        });
        break;
    }
  },
};
