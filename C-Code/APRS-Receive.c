//default libraries
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

//custom libraries
#include <mosquitto.h>


//define constants
//RTL SDR constants
#define APRS_FREQ 144800000 //144,800MHz (European APRS Frequency)
#define SDR_SAMPLE_RATE 2048000 //2.048MSPS (Good for APRS)
#define CALLSIGN_FILE "./Callsigns.txt"

//MQTT constants
//Sub / Raw
#define MQTT_SUB "localhost"
#define MQTT_SUB_PORT 1883
#define MQTT_SUB_TOPIC "RTL_SDR/RAW/APRS"

//Host / Filtered
#define MQTT_HOST "localhost"
#define MQTT_HOST_PORT 1883
#define MQTT_HOST_TOPIC "RTL_SDR/FILTERED/APRS"


int main()
{
    

    return 0;
}