# node-bmw

A node.js powered interface for IBUS BMW vehicles, for use with whatever runs the dependencies.
It builds (but isn't _really_ tested) on Linux x86_64, Linux ARMv7 (raspi), and macOS 10.12.

# Disclaimers
* First and foremost, this project can and might hurt you.
  * If you rely on the auto lights, and they cut out at night, you might die.
  * If you are trapped in the vehicle, and the app locks up the GM and the door locks don't work, you might die.
  * If you drive into a body of water and need to roll down the window to release the pressure, and the app locks up the GM and the windows don't work, you might die.
  * If the app develops some bug/level of sentience .. it's worth knowing that it can talk to/hear from the airbag computer. If they deploy randomly.. you guessed it, you might die.
* If it breaks/hurts/kills you/your car/your something else/etc... not my fault.
  * Harsh disclaimer but it is what it is.
  * See MIT license.
* I routinely break master. Like, 100% un-functional.
* I make no assertations that I am a professional. I'm just doing this for fun and to learn a little Node.js.
* It's probably best to use this project as a reference versus fork it.

Currently being developed using my US-spec 2000 E39 540i, and a Raspberry Pi 3 running the latest Raspbian and NodeJS 7.9.x.
About 90% of it is done in a way I don't really like, but I have so little time to work on this... =/

It acts as, more or less.. plug-in custom firmware for the BMW modules.

It does:
* BMW bus interface:
  * DBUS
  * IBUS
  * KBUS
* Module emulation:
  * CDC (trunk-mounted CD changer - useful to repurpose as aux input)
  * MID (Multi-information display)
  * BMBT (Bordmonitor/On-board monitor)
  * DSPC (DSP controller)
* Lights:
  * Standing lights auto on/off, essentially as DRLs
  * Low beam auto on/off, based on locale and sun position (latitude/longitude are set in config.json)
  * Rear fog LED in gauge cluster acts as auto-lights status light (since my car doesn't actually have a rear fog)
    * It only shows when fogs or low-beams are on =/
  * "Comfort" turn signal emulation, a la newer BMWs
    * 3-flash comfort turn is a joke, this does 6-flash
* Media:
  * HDMI CEC control to power on/off HDMI display on ignition change
  * Kodi API integration
    * Steering wheel controls work with Kodi
    * Key on/off starts/stops Kodi playback
    * Song titles scroll in IKE cluster
* Custom display in gauge cluster (IKE) with system load, coolant temp in deg C, and time (from OS, not from car)
* Welcome message in gauge cluster (IKE) on key on/app start
* WebUI:
  * Current vehicle status
    * Vehicle speed
    * Engine RPM
    * Engine status (running/not running)
    * Country coding/units (parsing is terrible, I do it all wrong, don't look..)
    * Coolant/exterior temperatures
    * VIN (last 7)
    * Odometer
    * Doors/hood/trunk open/closed
    * Windows up/down
    * Central locking
    * Handbrake status
    * In reverse gear or not
    * Ignition position
    * OBC data:
      * Aux heat/vent timer 1+2
      * Average speed
      * Consumption 1+2
      * Date/time
      * Distance remaining
      * Range to empty
      * Speed limit
      * Stopwatch
      * Timer
  * Control vehicle modules:
    * DSP amp/equalizer
    * GM (windows/doors/locks)
    * IKE (gauge cluster)
    * LCM (light module)
    * OBC data set/reset
  * Control other things:
    * HDMI CEC on/off
* Other:
  * Time/date sync from OS to car
  * Auto-unlock doors when key is turned from run to accessory
  * Parsing/decoding of IO status from LCM and GM
  * WebSocket UI/dynamic table for displaying decoded data in WebUI, with 2-way communication for sending data as well
  * What I'm about 97% certain is the single largest documented collection of BMW IBUS commands, under /ref 
* .. and a lot of other stuff, I'm probably forgetting.

Future plans/ideas/to do list:
* [My current todo list (Google Docs)](https://docs.google.com/document/d/18HyEHyixTG1MqpJNxdOfWh4I4G5pGTjdKz1ye05hFMA/edit?usp=sharing)

I'll add more to this once I'm out of the dirty-dev weeds, which might be never
