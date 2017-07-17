module.exports = {
  emulate : {
    bmbt : true,
    cdc : false,
    mid : false,
    dspc : true,
  },
  gpio : {
    enable : true,
    pins : {
      relay_1 : 23,
      relay_2 : 24,
    },
  },
  json : {
    reset_on_poweroff : false,
    write_on_poweroff : false,
    write_on_reset : false,
    write_on_run : false,
  },
  lights : {
    comfort_turn : {
      enable : true,
      flashes : 5,
      cluster_msg : true,
    },
    dimmer : {
      lights_on : 254,
      lights_off : 255,
    },
    welcome_lights : {
      output_license_rear_right : true,
      output_reverse_rear_left : true,
      output_reverse_rear_right : true,
      output_standing_front_left : true,
      output_standing_front_right : true,
      output_standing_inner_rear_left : true,
      output_standing_inner_rear_right : true,
      output_standing_rear_left : true,
      output_standing_rear_right : true,
    },
    auto : true,
  },
  location : {
    latitude : 39,
    longitude : -84,
  },
  media : {
    mid : false,
    bluetooth : false,
    hdmi : {
      enable : false,
      manufacturer : 0xF0,
      poweroff_delay : 1000,
    },
    kodi : {
      enable : false,
      host : '127.0.0.1',
      port : 9090,
    },
  },
  notification : {
    method : null,
    config : {
      pushover : {
        html : false,
        title : app_name,
        device : null,
        priority : 'low',
        sound : 'none',
        token : null,
        user_id : null,
        url : {
          string : 'http://'+os.hostname(),
          title : app_name+' webUI',
        },
      },
    },
  },
  options : {
    message_reverse : true,
    message_welcome : false,
    modules_refresh_on_start : false,
    obc_refresh_on_start : true,
  },
  server : {
    host : '127.0.0.1',
    port : 3002,
  },
  system : {
    host_data : {
      refresh_interval : 30000,
    },
  },
};
