Helpful links and information about wiring in your BMW
http://www.bimmerboard.com/forums/posts/852232
http://www.bimmerboard.com/members/ripp222/original/OBD%20changes%20in%202001.pdf
http://www.bimmerboard.com/forums/posts/662414
http://pinoutguide.com/CarElectronics/car_obd2_pinout.shtml
https://boyanmilushev.wordpress.com/2013/09/18/bmw-20-pin-to-obd-ii-pinout/
http://www.bimmerfest.com/forums/attachment.php?attachmentid=175190&stc=1&d=1235000253
https://www.bimmerforums.com/forum/showthread.php?1903575-OBD-Port-Mod
https://rusefi.com/forum/viewtopic.php?t=349
http://i.imgur.com/WxtJENF.png
https://www.youtube.com/watch?v=sw3ADKPo1Uo

Hardware needed (this is what I can gather thus far kind of depends on your deployment intention as this software is multifaceted)
	Raspberry Pi3 (dont cheap out)
	PicanDuo2 (again dont cheap out)
	HifiBerry (either DAC or AMP well get to this it depends on how you intend to deploy and wether you have DSP or not)
	some heatsinks for your Pi (she gets toasty)
	A screen for your Pi (again optional kind of depends on how you are going to deploy / what things you are going to use the software to emulate)
	
	
	
Things this software can do: 
These are all user based assumptions from reading the code and using the app:

First of all this app is really powerful. It does a lot of things that can damage your car. I do not take responsibility if you F something up with this guide or software and neither does the maintainer

Portions  of the car you can emulate and why this is cool:
	BMBT: From what I can gather this is to emulate the stock BMW bluetooth interface of the vehicle.
	CDC:  This app can emulate a CD Changer if you wanna pipe your audio in that way
	CON1: This is a CANBUS related connection used for retrofitting an iDrive touch controller / NBT
	DIA:
	DSPC: This will emulate the radio / MID triggering on a DSP amplifier when music/audio is playing
	Fem1:
	MID: This will emulate your MID functions when you have removed your MID to put a screen in place
	NBT1: Pretty self explanitory allows you to boot an NBT via canbus commands sent over PiCan
	RAD: I think this is to announce to iBUS that there is a "radio" hooked up so the amp will turn on and allow playing of music / audio through speakers
	

		
		
	
Steps to get this running on your pi:
no its not easy
if you suck at computers go home now (working on easier way)
I assume these things
1) you know how to google problems
2) you at least try to fix your own problems before asking
3) did i mention google is your friend?
4) dont be a panzy cuz you're gunna have to add wires and retrofit some stuff to get this running right
 4b) All I have hooked up RIGHT NOW is the iBUS connection im waiting for my PiCan Duo2 and other Reslers USB to show up 

Lets start by this:
What year E39 do you have?? This is important AF cuz 97-99 have lots to add... late 99-00 has a few things to add 01+ has very little to add in terms of wiring 



Steps to get running on your pi locally (yes its kind of convoluted deal with it)

1) setup your raspberry pi 3 with raspbian stretch lite sdcard boot it up and get hooked to your wifi run your updates and upgrades continue to step 2
2) lets install some stuff well need to support our amazing BMWPiBUS thing lets hope you have 2x Reslers USB adapters and the Pican2 duo (btw you need to configure your pican) ........ open up your pi via ssh / keyboard and screen however youd like to interface.
3) run some apt-get installs..... you need these packages :  
  3) run this in your terminal: `sudo apt-get install pigpio libdbus-1-dev git-core nginx pulseaudio pulseaudio-module-bluetooth`
4) now we installed our binaries lets install node and npm so we can setup this cool app... navigate to nodejs.org and click the downloads tab at the top of the main page then select CURRENT (at time of writing version is 10.4.0)
5) once you're on the current page right you need the link for nodejs current for armv7.... i used this : wget https://nodejs.org/dist/v10.4.0/node-v10.4.0-linux-armv7l.tar.xz
6) unpack node .... 
  6) run this command in your terminal:  `tar -xvf node-v*`
7) lets install node!!! 
  7) run this command in your terminal: `cd node-v* && sudo cp -R * /usr/local/`
8) lets check node is installed... run `node --version` ... you should get a return...   run :` npm --version`     you should get a return..
9) ok you've accomplished all the preliminary SOFTWARE downloads and setups and installs you need to clone the needed repositories
  9) in your terminal run these commands:
  ``` 
  cd /usr/local/
  sudo git clone --recursive https://github.com/kmalinich/node-bmw-interface.git bmwi
  cd bmwi
  sudo cp helpers/systemd/* /etc/systemd/system/
  sudo cp helpers/nginx/* /etc/nginx/
  sudo chown pi -R * .
  npm install
  ./helpers/node-bmwi-units enable
  ./helpers/node-bmwi-units start
  ./helpers/node-bmw launch
  ```
																								 
												 
if all went well you should have the interface daemon running .... oh wait no you dont its bitching about its config isnt it???? lets fix that

10) run:    nano config.json
   10) once editing the config.json youll see tons of switches and options you can play with.... really what matters is defining the interfaces.
  
  10) Heres what my interface section looks like we will get to the wiring of things in a bit.....
  
	       intf": {
                "can0": "can0",
                "can1": "can1",
                "dbus": null,
                "ibus": "/dev/ttyUSB0",
                "kbus": "/dev/ttyUSB1",
                "lcd": null
          },
	
11) now you can actually launch the interface half of the application. in your terminal (presuming you havent changed directories or closed it) run: ./helpers/node-bmw launch
12) if you dont get any complaints move forward if you get complaints type : ./helpers/node-bmwi-units status and check the status of your newly defined interfaces
13) Lets install the client portion of the program now  
  13) spawn a new instance of the terminal type: 
	
14) toggle your configs for the client
  14)
		Other config settings you should probably change:
	
	
	
	Bus:
		in these entries you can set true the bus items you have defined in your walk through.
		CANBUS:
			coolant: read coolant temp?
			exterior: Read exterior temp?
			ignition: read ignition status
			rpm: Read rpm status
			speed: calculate speed based on all 4 wheels instead of 1 wheel
			
	BMBT: 
		media: you can toggle either "bluetooth" or "kodi" to tell it to control either your bluetooth device or a kodi interface
		vol_atPoweron:
		
	Chassis:
		Update this portion to match your year and chassis style
		
	Fuel:
		make sure this matches your tank
	
	Gear_ratios:
		dont play here
		
	GPIO:
		I think one pin is for a fan hooked to the pi to prevent overheating in the glove box
		and another pin is to trigger "reverse cam" or "video input" on the nav screen?
		
		
	HUD:
		This is laid out on your IKE cluster LCD you can layout the items underneath
			IE you can pick Cons/Speed/Time/Temp/Volt to display in your IKE cuz this software will broadcast there
			
	Lights:
		Auto: Automatic headlights based on location information with dark-sky api key
		if you enable this you need to fill out your latitude and longitude as well as your API key in the weather section
		you can get your API key from https://darksky.net/dev
		
	Comfort turn:
		Emulates the touch to enable turn signal feature found in most new cars:
		you can enable and set the ammount of flashes that happen when you touch your turn signal rocker
		(by touch i mean just enough to light the bulb not enough to initiate the turn signal relay)
		
	Location:
		Set your latitude and longitude here for automatic headlights
		
	Media:
		MID: Display Bluetooth/current Media information on your MID screen
		Bluetooth: 
			Enable: Enables your device to be in a pairable mode and have some interface to the MID
			require setup of pulseaudio to run in a root mode on boot ill include that later
			or you can google that
			
	MFL:
		media: you can set to "bluetooth" or "kodi"
		voice:
		volume:  you can set to "bluetooth" or "kodi"
	
	Tires:
		Make this match your tire size matters for speedo calculation if using the CANBUS interface
		
	Weather:
		Fill out the api key you got from https://darksky.net/dev here
		
			
			
15) rerun the client and append the command with &  so it runs in the background 

theres  probably some more efficient way to make this happen


I hacked a way together to run this on boot cuz i dont use a TON of the features yet (waiting on hardware)

run this in your terminal
sudo crontab -e

then add this entry
@reboot bash /home/pi/node-bmw-client/helpers/node-bmw launch &

then exit and save the text file


The system.d scripts we enabled in step 9 will kick on the interface and the crontab entry will start the client on boot



# OPTIONAL SETUP INSTRUCTIONS:

if you wanna use a DAC card and bluetooth with this you need to install some other items as well
```

sudo apt-get install bluez bluez-tools pulseaudio pulseaudio-module-bluetooth
```

you also have to start pulseaduio at boot now 

```
nano /etc/systemd/system/pulseaudio.service
```
then copy and paste this:

```
[Unit]
Description=Pulse Audio

[Service]
Type=simple
ExecStart=/usr/bin/pulseaudio --system --disallow-exit --disable-shm --exit-idle-time=-1

[Install]
WantedBy=multi-user.target
```

press ctrl + x and hit enter and type the letter Y to save


then run these commands
```
sudo systemctl enable pulseaudio
sudo systemctl start pulseaudio

```
if you have an iPhone volume control doesnt work without some extra hackery as well as some other quirks

i blame apple
