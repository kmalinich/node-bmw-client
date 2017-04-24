#include<stdio.h>
#include<unistd.h>
#include<termios.h>
#include<getopt.h>
#include<stdlib.h>
#include<string.h>
#include<fcntl.h>
#include<termios.h>
#include<time.h>
static struct option longopts[] = {
    {"device", 1, 0, 'd'},
    {NULL, 0, 0, 0},
};

#define RXBUF_SIZE 1023

const char *languages[] = {
    "DE",
    "GB",
    "US",
    "IT",
    "ES",
    "JP",
    "FR",
    "CDN",
    "AUS/GOLF/ZA",
    "NL",
    "RU",
    "UNKNOWN11",
    "UNKNOWN12",
    "UNKNOWN13",
    "UNKNOWN14",
    "UNKNOWN15"
};

const char *model[] = {
    "E39",
    "UNKNOWN1",
    "UNKNOWN2",
    "UNKNOWN3",
    "UNKNOWN4",
    "UNKNOWN5",
    "UNKNOWN6",
    "UNKNOWN7",
    "UNKNOWN8",
    "UNKNOWN9",
    "UNKNOWN10",
    "UNKNOWN11",
    "UNKNOWN12",
    "UNKNOWN13",
    "UNKNOWN14",
    "E46",
};

const char *anzv_codes[] = {
    "UNKNOWN0",
    "TIME",
    "DATE",
    "OUTSIDE TEMP",
    "CONSUMPTION1",
    "CONSUMPTION2",
    "RANGE",
    "DISTANCE",
    "ARRIVAL",
    "SPEED LIMIT",
    "AVG SPEED",
    "UNKNOWN11",
    "MEMO1",
    "MEMO2",
    "STOPWATCH",
    "TIMER1",
    "TIMER2",
    "AUX HEATING OFF",
    "AUX HEATING ON",
    "AUX VENT OFF",
    "AUX VENT ON",
    "END STELLMODE",
    "EMERGENCY DISARM",
    "UNKNOWN23",
    "UNKNOWN24",
    "UNKNOWN25",
    "INTERIM TIME",
    "AUX HEAT/VENT",
};

static char *get_address(unsigned char addr)
{
    switch(addr) {
        case 0x00:
            return "UNI  ";
        case 0x18:
            return "CDC  ";
        case 0x30:
            return "SES  ";
        case 0x3B:
            return "VIDEO";
        case 0x3F:
            return "DIS  ";
        case 0x43:
            return "OSD  ";
        case 0x44:
            return "EWS  ";
        case 0x46:
            return "CID  ";
        case 0x50:
            return "STW  ";
        case 0x60:
            return "PDC  ";
        case 0x68:
            return "RADIO";
        case 0x6A:
            return "DSP  ";
        case 0x76:
            return "CDCD ";
        case 0x7F:
            return "GPS  ";
        case 0x80:
            return "IKE  ";
        case 0xA4:
            return "ABM  ";
        case 0xAC:
            return "ASC  ";
        case 0xB0:
            return "SES  ";
        case 0xBB:
            return "TV   ";
        case 0xBF:
            return "LCM  ";
        case 0xC0:
            return "MID  ";
        case 0xC8:
            return "PHONE";
        case 0xD0:
            return "NAV  ";
        case 0xE7:
            return "IKE2 ";
        case 0xED:
            return "SEAT ";
        case 0xF0:
            return "BMB  ";
        case 0xFF:
            return "BRD  ";
        default:
            return "UNKNOWN";
    }
}

static void decode_message(const unsigned char *msg, int len)
{
    switch(msg[3]) {
        case 0x01:
            printf("DEVICE STATUS REQUEST");
            break;
        case 0x02:
            printf("DEVICE STATUS %s ", msg[4] ? "ANNOUNCE" : "READY");
            break;
        case 0x03:
            printf("BUS STATUS REQUEST");
            break;
        case 0x04:
            printf("BUS STATUS");
            break;
        case 0x0c:
            printf("VEHICLE CONTROL ");
            break;
        case 0x10:
            printf("IGNITION STATUS REQUEST ");
            break;
        case 0x11:
            printf("IGNITION STATUS %d", msg[4] & 0x0f);
            break;
        case 0x12:
            printf("IKE SENSOR STATUS REQUEST ");
            break;
        case 0x13:
            printf("IKE SENSOR STATUS ");
            break;
        case 0x14:
            printf("COUNTRY CODING STATUS REQUEST ");
            break;
        case 0x15:
            printf("COUNTRY CODING STATUS LANG=%s, MODEL=%s, TIME=%s, TEMP=%s, AVG=%s, LIMIT=%s, DISTANCE=%s, ARRIVAL=%s",
                    languages[msg[4] & 0x0f],
                    model[(msg[4] >> 4) & 0x0f],

                    msg[5] & 1   ? "12h"   : "24h",
                    msg[5] & 2   ? "F"     : "C",
                    msg[5] & 16  ? "mph"   : "km/h",
                    msg[5] & 32  ? "miles" : "km/h",
                    msg[5] & 64  ? "miles" : "km/h",
                    msg[5] & 128 ? "12h"   : "24h");

            switch(msg[6] & 0xf) {
                case 0x00:
                    printf("CONSUMPTION=l/100km ");
                    break;
                case 0x05:
                    printf("CONSUMPTION=mpg ");
                    break;
                case 0x0f:
                    printf("CONSUMPTION=km/l ");
                    break;
                default:
                    printf("CONSUMPTION=unknown (%d) ", msg[6] & 0x0f);
                    break;
            }

            printf("ENGINE=%s", msg[7] & 1 ? "DIESEL" : "PETROL");
            break;
        case 0x16:
            printf("ODOMETER REQUEST ");
            break;
        case 0x17:
            printf("ODOMETER ");
            break;
        case 0x18:
            printf("SPEED/RPM %d KM/h, %d RPM", msg[4] << 1, msg[5] * 100);
            break;
        case 0x19:
            printf("TEMPERATURE outside %d, inside %d", msg[4], msg[5]);
            break;
        case 0x1a:
            printf("IKE TEXT DISPLAY/GONG");
            break;
        case 0x1b:
            printf("IKE TEXT STATUS");
            break;
        case 0x1c:
            printf("GONG");
            break;
        case 0x1d:
            printf("TEMPERATURE REQUEST");
            break;
        case 0x1f:
            printf("UTC DATE/TIME %02x:%02x %02x/%02x/%02x%02x",
                    msg[5], msg[6],
                    msg[7], msg[9], msg[10], msg[11]);
            break;
        case 0x21:
            if (msg[4] == 0x60 && msg[5] == 0x00)
                printf("WRITE INDEX %02x \"%.*s\" ", msg[6], len-8, msg+7);
            break;
        case 0x23:
            printf("UPDATE MID ");
            if (msg[4] == 0x62 && msg[5] == 0x30)
                printf("WRITE TITLE \"%.*s\"", len-7, msg+6);
            break;
        case 0x24:
            printf("UPDATE ANZV MODE=%s %.*s", anzv_codes[msg[4]], len-8, msg+6);
            break;
        case 0x34:
            printf("DSP EQUALIZER BUTTON");
            break;
        case 0x38:
            printf("CD COMMAND ");
            if (msg[4] == 0x01 && msg[5] == 0x00)
                printf("REQUEST STATUS ");
            if (msg[4] == 0x02 && msg[5] == 0x00)
                printf("START PLAYING1 ");
            if (msg[4] == 0x03 && msg[5] == 0x00)
                printf("START PLAYING2 ");
            if (msg[4] == 0x04)
                printf("FAST SCAN %s ", msg[5] ? "BACKWARD" : "FORWARD");
            if (msg[4] == 0x06)
                printf("CHANGE CD %d ", msg[5]);
            if (msg[4] == 0x07)
                printf("SCAN INTRO MODE %s ", msg[5] ? "ON" : "OFF");
            if (msg[4] == 0x08)
                printf("RANDOM MODE %s ", msg[5] ? "ON" : "OFF");
            if (msg[4] == 0x0a)
                printf("%s TRACK ", msg[5] ? "PREVIOUS" : "NEXT");
            if (msg[4] == 0x00 && msg[5] == 0x00)
                printf("REQUEST STATUS ");
            break;
        case 0x39:
            printf("CD STATUS ");
            if (msg[4] == 0x00 && msg[5] == 0x09)
                printf("PLAYING %d %d", msg[9], msg[10]);
            if (msg[4] == 0x02 && msg[5] == 0x09)
                printf("START PLAYING %d %d", msg[9], msg[10]);
            if (msg[4] == 0x03 && msg[5] == 0x09)
                printf("SCAN FORWARD %d %d", msg[9], msg[10]);
            if (msg[4] == 0x04 && msg[5] == 0x09)
                printf("SCAN BACKWARD %d %d", msg[9], msg[10]);
            if (msg[4] == 0x07 && msg[5] == 0x09)
                printf("END PLAYING %d %d", msg[9], msg[10]);
            if (msg[4] == 0x08 && msg[5] == 0x09)
                printf("SEEKING %d %d", msg[9], msg[10]);
            if (msg[4] == 0x00 && msg[5] == 0x02)
                printf("NOT PLAYING %d %d", msg[9], msg[10]);
            break;
        case 0x40:
            printf("SET OBD");
            break;
        case 0x41:
            printf("OBD REQUEST");
            break;
        case 0x48:
        case 0x49:
            printf("BMB BUTTON ");
            if (msg[4] & 0x40)
                printf("1S ");
            if (msg[4] & 0x80)
                printf("RELEASE ");
            if (!(msg[4] & 0xc0))
                printf("PUSH ");
            switch(msg[4] & 0x7f) {
                case 0x11:
                    printf("1 ");
                    break;
                case 0x01:
                    printf("2 ");
                    break;
                case 0x12:
                    printf("3 ");
                    break;
                case 0x02:
                    printf("4 ");
                    break;
                case 0x13:
                    printf("5 ");
                    break;
                case 0x03:
                    printf("6 ");
                    break;
                case 0x14:
                    printf("<> ");
                    break;
                case 0x24:
                    printf("^ ");
                    break;
                case 0x32:
                    printf("TP ");
                    break;
                case 0x22:
                    printf("RDS ");
                    break;
                case 0x31:
                    printf("FM ");
                    break;
                case 0x21:
                    printf("AM ");
                    break;
                case 0x33:
                    printf("DOLBY ");
                    break;
                case 0x23:
                    printf("MODE ");
                    break;
                case 0x04:
                    printf("TONE ");
                    break;
                case 0x20:
                    printf("SELECT ");
                    break;
                case 0x10:
                    printf("< ");
                    break;
                case 0x00:
                    printf("> ");
                    break;
                case 0x30:
                    printf("RADMENU ");
                    break;
                case 0x06:
                    printf("RADIO TURNKNOP ");
                    break;
            }
            break;
        case 0x4f:
            printf("RGB CONTROL LCD=%s, INPUT=%s%s ZOOM=%s ASPECT=%s REFRESH=%s",
                    msg[4] & 0x10 ? "ON" : "OFF",
                    msg[4] & 0x02 ? "GT" : "",
                    msg[4] & 0x01 ? "VM" : "",
                    msg[5] & 0x20 ? "ON" : "OFF",
                    msg[5] & 0x10 ? "16:9" : "4:3",
                    msg[5] & 0x02 ? "50HZ" : "60HZ");
            break;
        case 0x53:
            printf("VEHICLE DATA REQUEST");
            break;
        case 0x54:
            printf("VEHICLE DATA STATUS VIN %2.2s%02x%02x%x TOTAL %d KM LITRES %d SERVICE %d",
                    msg+5,
                    msg[7],
                    msg[8],
                    msg[9] >> 4,
                    ((msg[9] << 8) | (msg[10])) * 100,
                    (((msg[11] << 8) | (msg[12])) & 0x7fff) * 10,
                    (msg[15] << 8) | (msg[16]));
            break;
        case 0x5a:
            printf("LAMP STATE REQUEST");
            break;
        case 0x5b:
            printf("LAMP STATE");
            break;
        case 0x71:
            printf("RAIN SENSOR STATUS REQUEST");
            break;
        case 0x74:
            printf("IGNITION KEY ");
            if (msg[4] == 0x04)
                printf("INSERT %d", msg[5]);
            if (msg[4] == 0x00)
                printf("REMOVE");
            break;
        case 0xAA:
            printf("NAVIGATION CONTROL");
            break;
        case 0xa5:
            if (msg[4] == 0x62 && msg[5] == 0x01)
                printf("WRITE AREA %02x \"%.*s\" ", msg[6], len-8, msg+7);
            if (msg[4] == 0x60)
                printf("SCREEN REFRESH");
            break;
    }
}

static int parse_ibus_msg(const unsigned char *msg, int len)
{
    int i, chk = 0;
    struct tm tm;
    struct timespec tp;
    char buf[32];

    for(i = 0; i < len; i++)
        chk ^= msg[i];

    if (chk || len < 4)
        return -1;

    //clock_gettime(CLOCK_MONOTONIC, &tp);
    localtime_r(&tp.tv_sec, &tm);
    strftime(buf, sizeof(buf), "%H:%M:%S", &tm);
    printf("%s.%3.3ld: ", buf, tp.tv_nsec/1000000);
    for(i = 0; i < len; i++)
        printf("%02X ", msg[i]);
    printf("\n\t%s(%02X) -> %s(%02X): ",
            get_address(msg[0]), msg[0],
            get_address(msg[2]), msg[2]);
    decode_message(msg, len);
    printf("\n\n");
    return 0;
}

int main(int argc, char **argv)
{
    struct termios tios;
    char *device = NULL, *outfile = NULL, *infile = NULL;
    int idx = 0, fd;
    unsigned char rxbuf[RXBUF_SIZE];
    int rxpos, i, ctr = 0;
    int dst, len, src, outfd = -1;
    char c;

    while((c = getopt_long(argc, argv, "hd:w:r:", longopts, &idx)) != -1) {
        switch(c) {
            case 'd':
                device = strdup(optarg);
                break;
            case 'w':
                outfile = strdup(optarg);
                break;
            case 'r':
                infile = strdup(optarg);
                break;
            case 'h':
            default:
                fprintf(stderr, "%s: usage:\n\t%s -d <device>\n",
                        argv[0], argv[0]);
                break;
        }
    }

    if (outfile) {
        if ((outfd = open(outfile, O_WRONLY|O_APPEND, 0600)) == -1) {
            fprintf(stderr, "open: %s: %m", outfile);
            return 1;
        }
    }

    if(!device && !infile) {
        fprintf(stderr, "device required\n");
        return 1;
    }

    if (!device)
        device = infile;

    if((fd = open(device, O_RDONLY)) == -1) {
        fprintf(stderr, "%s: %m\n", device);
        free(device);
        return 1;
    }

    if (device != infile) {
        if(tcgetattr(fd, &tios) == -1) {
            fprintf(stderr, "tcgetattr: %m\n");
            close(fd);
            return 1;
        }

        cfmakeraw(&tios);

        cfsetispeed(&tios, B9600);
        cfsetospeed(&tios, B9600);

        tios.c_cflag |= PARENB;
        tios.c_cflag &= ~(CRTSCTS|PARODD);

        if(tcsetattr(fd, TCSANOW, &tios) == -1) {
            fprintf(stderr, "tcgetattr: %m\n");
            close(fd);
            return 1;
        }
    }

    rxpos = 0;
    memset(rxbuf, 0, sizeof(rxbuf));
    ctr = 0;

    for(;;) {
        if((len = read(fd, rxbuf + rxpos, 1)) == -1) {
            fprintf(stderr, "read: %m\n");
            close(fd);
            return 1;
        }

        if (!len) {
            printf("EOF\n");
            break;
        }

        if (len > 0 && outfd != -1)
            write(outfd, rxbuf + rxpos, 1);

        if(len == 1 && ++rxpos > RXBUF_SIZE)
            rxpos = 0;

        if(rxpos < 3)
            continue;

        for(i = 0; i+2 <= rxpos; i++) {
            src = rxbuf[i];
            len = rxbuf[i + 1];
            dst = rxbuf[i + 2];

            if(len+2 > rxpos)
                continue;

            if (parse_ibus_msg(rxbuf+i, len+2) == -1) {
                continue;
            } else {
                rxpos = 0;
            }
        }
    }
    return 0;
}
