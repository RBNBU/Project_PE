// Default libraries
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

// Custom libraries
#include <mosquitto.h>
#include <cjson/cJSON.h>

/*-------------------------------------------------------------------------------*/

// Define constants
// RTL SDR constants
#define APRS_FREQ 144800000 // 144,800MHz (European APRS Frequency)
#define SDR_SAMPLE_RATE 2048000 // 2.048MSPS (Good for APRS)
#define CALLSIGN_FILE "./Callsigns.txt" // File with all allowed callsigns ex. "ON0CLL;P4CLL"


// MQTT constants
// Sub / Raw
#define MQTT_SUB "localhost"
#define MQTT_SUB_PORT 1883
#define MQTT_SUB_TOPIC "RTL_SDR/RAW/APRS"
#define MQTT_SUB_QOS 2

// Host / Filtered
#define MQTT_HOST "localhost"
#define MQTT_HOST_PORT 1883
#define MQTT_HOST_TOPIC "RTL_SDR/FILTERED/APRS"
#define MQTT_HOST_QOS 2


// Callsign constants
#define MAX_CALLSIGNS 100
#define CALLSIGN_LEN 16

/*-------------------------------------------------------------------------------*/

// Global variables
char (*allowedCallsigns)[CALLSIGN_LEN]; // Array of allowed callsigns
int callsignCount = 0;

/*-------------------------------------------------------------------------------*/

// Function declarations
void loadCallsigns(); // Function used to load callsings from text file
int matchCallsign(const char *incoming, const char *allowedFilter); // Check if callsign matches to an allowed one
void on_MQTT_Message(struct mosquitto *p_mosq, void *obj, const struct mosquitto_message *p_message); //When a MQTT message arrives
void on_MQTT_Connect(struct mosquitto *p_mosq, void *obj, int rc);

/*-------------------------------------------------------------------------------*/

int main()
{
    // Declare variables
    struct mosquitto *mosq = NULL;
    int mosquitto_status;

    // Load callsigns into array;
    loadCallsigns();
    if (callsignCount == 0) // Check for empty callsign file
    {
        fprintf(stderr, "No callsigns found in file!\nFile: %s\n", CALLSIGN_FILE);
        return -1;
    }

    // Initialize mosquitto library
    mosquitto_lib_init();

    // Create new MQTT client
    mosq = mosquitto_new("APRS_Filter_C", false, NULL);
    /*
    station id: APRS_Filter_C
    false: to make connection to broker persistent -> ex. broker sends missed packets after loss of connection
    */
    if(!mosq)
    {
        fprintf(stderr, "Error while creating MQTT instance");
        return -1;
    }

    // Set Callbacks
    mosquitto_connect_callback_set(mosq, on_MQTT_Connect);
    mosquitto_message_callback_set(mosq, on_MQTT_Message);

    // Connect to MQTT broker
    if (mosquitto_connect(mosq, MQTT_SUB, MQTT_SUB_PORT, 60) != MOSQ_ERR_SUCCESS)
    {
        fprintf(stderr, "Error while connecting to MQTT Broker!");
        return -1;
    }

    // Print startup message
    printf("Filter started!\nMQTT Sub: %s\nQOS: %d\n", MQTT_SUB_TOPIC, MQTT_SUB_QOS);
    printf("Loaded %d callsigns from file!\n", callsignCount);
    printf("\n<------------------------------>\n\n");

    // Start infinite loop to scan for messages
    mosquitto_loop_forever(mosq, -1, 1); // Auto-reconnects when needed

    // Cleanup code
    if (allowedCallsigns != 0)
    {
        free(allowedCallsigns);
    }

    mosquitto_destroy(mosq);
    mosquitto_lib_cleanup();

    return 0;
}

/*-------------------------------------------------------------------------------*/

void loadCallsigns()
{
    // Declarations
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

    // Insert CSV file into array
    if(fgets(buffer, sizeof(buffer), fptr))
    {
        buffer[strcspn(buffer, "\r\n")] = 0; // Removes \r and \n at the end of the file
        current_callsign = strtok(buffer, ";"); // Remove separator: ";"

        while((current_callsign != NULL) && (callsignCount < MAX_CALLSIGNS))
        {
            strncpy(allowedCallsigns[callsignCount], current_callsign, CALLSIGN_LEN - 1); // Copy callsign into array
            allowedCallsigns[callsignCount][CALLSIGN_LEN - 1] = '\0'; // Add null terminator
            
            callsignCount++;
            current_callsign = strtok(NULL, ";"); // Remove separator: ";"
        }
    }

    // Close file
    fclose(fptr);

    // Realloc the array
    if(callsignCount > 0)
    {
        temp = realloc(allowedCallsigns, callsignCount * sizeof(char) * CALLSIGN_LEN);

        if(temp != NULL)
        {
            allowedCallsigns = temp;
        }
    }
    else // No callsigns present in file, free all
    {
        free(allowedCallsigns);
        // CallsignCount will stay 0
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
    
    checkForLen = strlen(allowedFilter); // Only check for the length of the filter
    
    if(strncmp(incoming, allowedFilter, checkForLen) == 0)
    {
        if((incoming[checkForLen] == 0) || (incoming[checkForLen] == '-')) // If callsign ends or SSID begins (-9, -10, ...)
        {
            return 1;
        }
    }
    return 0;
}

/*-------------------------------------------------------------------------------*/

void on_MQTT_Message(struct mosquitto *p_mosq, void *obj, const struct mosquitto_message *p_message)
/* 
p_mosq: pointer to MQTT client that connected
obj: user data pointer
message: pointer to MQTT message
*/
{
    if (p_message->payloadlen == 0) // If message is empty
    return;
    
    
    cJSON *json, *source;
    int matchFound = 0, i;
    
    json = cJSON_Parse((char*)p_message->payload); // Parse mqtt message
    if(json == NULL)
    {
        fprintf(stderr, "Error while parsing JSON!");
        return;
    }
    
    source = cJSON_GetObjectItemCaseSensitive(json, "source"); // Source field, who sent the message
    
    if(cJSON_IsString(source) && (source->valuestring != NULL)) // If source is string and it is not empty
    {
        for (i = 0; i < callsignCount; i++)
        {
            if(matchCallsign(source->valuestring, allowedCallsigns[i])) // Look for callsign in list of allowed callsigns
            {
                matchFound = 1;
                break;
            }
        }
        
        if (matchFound)
        {
            printf("Match found!\nUser: %s\n\n", source->valuestring);
            mosquitto_publish(p_mosq, NULL, MQTT_HOST_TOPIC, p_message->payloadlen, p_message->payload, MQTT_HOST_QOS, false); //send match to MQTT
        }
    }
    
    cJSON_Delete(json); // Also automatically deletes "source"
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