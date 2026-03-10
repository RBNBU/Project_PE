//Default libraries
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

//Custom libraries
#include <mosquitto.h>
#include <cjson/cJSON.h>

/*-------------------------------------------------------------------------------*/

//Define constants
//RTL SDR constants
#define APRS_FREQ 144800000 //144,800MHz (European APRS Frequency)
#define SDR_SAMPLE_RATE 2048000 //2.048MSPS (Good for APRS)
#define CALLSIGN_FILE "./Callsigns.txt" //file with all allowed callsigns ex. "ON0CLL;P4CLL"


//MQTT constants
//Sub / Raw
#define MQTT_SUB "localhost"
#define MQTT_SUB_PORT 1883
#define MQTT_SUB_TOPIC "RTL_SDR/RAW/APRS"
#define MQTT_SUB_QOS 2

//Host / Filtered
#define MQTT_HOST "localhost"
#define MQTT_HOST_PORT 1883
#define MQTT_HOST_TOPIC "RTL_SDR/FILTERED/APRS"
#define MQTT_HOST_QOS 2


//Callsign constants
#define MAX_CALLSIGNS 100
#define CALLSIGN_LEN 16

/*-------------------------------------------------------------------------------*/

//Global variables
char (*allowedCallsigns)[CALLSIGN_LEN]; //Array of allowed callsigns
int callsignCount = 0;

/*-------------------------------------------------------------------------------*/

//Function declarations
void loadCallsigns(); //Function used to load callsings from text file
int matchCallsign(const char *incoming, const char *allowedFilter); //Check if callsign matches to an allowed one
void on_MQTT_Message(struct mosquitto *p_mosq, void *obj, const struct mosquitto_message *message); //When a MQTT message arrives
void on_MQTT_Connect(struct mosquitto *p_mosq, void *obj, int rc);

/*-------------------------------------------------------------------------------*/

int main()
{
    

    return 0;
}

/*-------------------------------------------------------------------------------*/

void loadCallsigns()
{
    //Declarations
    allowedCallsigns = calloc(MAX_CALLSIGNS, sizeof(char) * CALLSIGN_LEN);
    if (!allowedCallsigns)
    {
        fprintf(stderr, "Error while allocating memory!") ;
        return;
    }

    FILE *fptr = fopen(CALLSIGN_FILE, "r");
    if (!fptr)
    {
        fprintf(stderr, "Error while opening file: %s", CALLSIGN_FILE) ;
        return;
    }

    char buffer[2048], *current_callsign, (*temp)[CALLSIGN_LEN];

    //insert CSV file into array
    if(fgets(buffer, sizeof(buffer), fptr))
    {
        buffer[strcspn(buffer, "\r\n")] = 0; //removes \r and \n at the end of the file
        current_callsign = strtok(buffer, ";"); //remove separator: ";"

        while((current_callsign != NULL) && (callsignCount < MAX_CALLSIGNS))
        {
            strncpy(allowedCallsigns[callsignCount], current_callsign, CALLSIGN_LEN - 1); //copy callsign into array
            callsignCount++;
            current_callsign = strtok(NULL, ";"); //remove separator: ";"
        }
    }

    //close file
    fclose(fptr);

    //realloc the array
    if(callsignCount > 0)
    {
        temp = realloc(allowedCallsigns, callsignCount * sizeof(char) * CALLSIGN_LEN);

        if(temp != NULL)
        {
            allowedCallsigns = temp;
        }
    }
    else //no callsigns present in file, free all
    {
        free(allowedCallsigns);
        //callsignCount will stay 0
        fprintf(stderr, "Error while realloc allowedCallsigns!");
    }
}

/*-------------------------------------------------------------------------------*/

int matchCallsign(const char *incoming, const char *allowedFilter)
/*
incoming: incoming callsign
allowedFilter: allowed callsign to compare with
*/
{
    int checkForLen;
    
    checkForLen = strlen(allowedFilter); //only check for the length of the filter
    
    if(strncmp(incoming, allowedFilter, checkForLen) == 0)
    {
        if((incoming[checkForLen] == 0) || (incoming[checkForLen] == '-')) //if callsign ends or SSID begins (-9, -10, ...)
        {
            return 1;
        }
    }
    return 0;
}

/*-------------------------------------------------------------------------------*/

void on_MQTT_Message(struct mosquitto *p_mosq, void *obj, const struct mosquitto_message *message)
/* 
p_mosq: pointer to MQTT client that connected
obj: user data pointer
message: pointer to MQTT message
*/
{
    if (message->payloadlen == 0) //if message is empty
    return;
    
    
    cJSON *json, *source;
    int matchFound = 0, i;
    
    json = cJSON_Parse((char*)message->payload); //parse mqtt message
    if(json == NULL)
    {
        fprintf(stderr, "Error while parsing JSON!");
        return;
    }
    
    source = cJSON_GetObjectItemCaseSensitive(json, "source"); //source field, who sent the message
    
    if(cJSON_IsString(source) && (source->valuestring != NULL)) //if source is string and it is not empty
    {
        for (i = 0; i < callsignCount; i++)
        {
            if(matchCallsign(source->valuestring, allowedCallsigns[i])) //look for callsign in list of allowed callsigns
            {
                matchFound = 1;
                break;
            }
        }
        
        if (matchFound)
        {
            printf("Match found!\nUser: %s\n\n", source->valuestring);
            mosquitto_publish(p_mosq, NULL, MQTT_HOST_TOPIC, message->payloadlen, message->payload, MQTT_HOST_QOS, false); //send match to MQTT
        }
    }
    
    cJSON_Delete(json); //also automatically deletes "source"
}

/*-------------------------------------------------------------------------------*/

void on_MQTT_Connect(struct mosquitto *p_mosq, void *obj, int rc)
/*
p_mosq: pointer to MQTT client that connected
obj: user data pointer
rc: return code -> connection succes/fail and why
*/
{
    if(rc == 0)
    {
        mosquitto_subscribe(p_mosq, NULL, MQTT_SUB_TOPIC, MQTT_SUB_QOS);
    }
    else
    {
        fprintf(stderr, "Error while connecting to MQTT!\nReturn code: %d\n", rc);
    }
}