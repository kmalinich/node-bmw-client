/* CAN interface structure... MessageID->Messagestructure

NBT power comand 

ID = 0x12F
Data = 0x37, 0x7C, 0x8A, 0xDD, 0xD4, 0x05, 0x33, 0x6B

Ignition off message for NBT

ID = 0x12F
Data = 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00

CIC power command:

ID = 0x4F8
Data = 0x00, 0x42, 0xFE, 0x01, 0xFF, 0xFF, 0xFF, 0xFF 


Tagged as toLowerCase?
CIC
ID = 0x273
Data = 0x1D, 0xE1, 0x00, 0xF0, 0xFF, 0x7F, 0xDE, 0x04 

NBT
ID = 0x563
Data = 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x00, 0x63

intended flow:
Gunna skip using the CAS/Ignition listening setup and go a little more old school
will wire a switch to close with accessory 12v power to kick over action of NBT/CIC on/off

Key in ignition->Aux 12v power on hardware listen -> NBT/CIC poweron -> Pulse command (if needed) -> NBT poweroff when 12v accessory switch is off


*/

#include <mcp_can.h>
#include <SPI.h>

int powerswitch = 0;
int sendpower = 0;

unsigned long rxId;
byte len;
byte rxBuf[8];
byte txBuf[8];

#ifdef NBT
byte NBTpower[] = {0x12F};
byte NBTcase[] = {0x563};
#endif
#ifdef CIC
byte CICcase[] = {0x273};
byte CICpower[] = {0x4F8};
#endif


#ifdef NBT
byte NBTlowercaseBuf[] = {0x00,0x00,0x00,0x00,0xFF,0xFF,0x00,0x63};
//I think this command is to be sent to keep the device awake when powered on
#endif
#ifdef CIC
byte CIClowercaseBuf[] = {0x1D,0xE1,0x00,0xF0,0xFF,0x7F,0xDE,0x04};
//I think this command is to be sent to keep the device awake when powered on
#endif

byte PowerOFFBuf[] = {0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00};
#ifdef NBT
byte NBTpowerBuf[] = {0x37,0x7C,0x8A,0xDD,0xD4,0x05,0x33,0x6B};
#endif
#ifdef CIC
byte CICpowerbuf[] = {0x00,0x42,0xFE,0x01,0xFF,0xFF,0xFF,0xFF};
#endif

MCP_CAN CAN0(10); //CAN0 is on pin 10 for CS
MCP_CAN CAN1(9); // CAN1 is on pin 9 for CS

// #define DEBUG //uncomment for serial debug
// #define CIC  // uncomment for CIC
#define NBT		// uncomment for NBT


void setup(){
	// init CAN0 bus, baudrate: 250k@16MHz 
    if(CAN0.begin(MCP_EXT, CAN_250KBPS, MCP_16MHZ) == CAN_OK){
#ifdef DEBUG		
    Serial.print("CAN0: Init OK!\r\n");
#endif	
    CAN0.setMode(MCP_NORMAL); 
    }  
#ifdef DEBUG
else Serial.print("CAN0: Init Fail!!!\r\n"); 
#endif     
    // init CAN1 bus, baudrate: 250k@16MHz 
    if(CAN1.begin(MCP_EXT, CAN_250KBPS, MCP_16MHZ) == CAN_OK){ 
#ifdef DEBUG	
    Serial.print("CAN1: Init OK!\r\n");
#endif	
    CAN1.setMode(MCP_NORMAL); 
    } 
#ifdef DEBUG
else Serial.print("CAN1: Init Fail!!!\r\n"); 
#endif     
    SPI.setClockDivider(SPI_CLOCK_DIV2);         // Set SPI to run at 8MHz (16MHz / 2 = 8 MHz)  	
}

void loop() {
//todo add actual listen action for the hardware switch that is 12v switched power.

sendpower = analogRead(powerpin); //can probably substitute this for some kind of CAN.readMsgBuf watchdog with the statusing of the CAS / IKE module
// CAS 0x00=off 0x40=first key touch 0x41=Accessory 0x45=run 0x55 = start 
	if(sendpower >= 0) {
		powerswitch = 1;
	}
	else if(sendpower <= 1) {
		powerswitch = 0;
	}
	
	switch (powerswitch) {
		case '1'{
#ifdef NBT
		CAN0.sendMsgBuf(NBTpower,len,NBTpowerBuf);
		CAN0.sendMsgBuf(NBTcase,len,NBTlowercaseBuf);
#endif
		break;
		}
		case '0' {
#ifdef NBT
		CAN0.sendMsgBuf(NBTpower,len,PowerOFFBuf);
#endif
		}
	}