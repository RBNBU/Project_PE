# --- LIBRARIES ---
import os
import json
import requests
import mysql.connector
import paho.mqtt.client as mqtt
from datetime import datetime, timezone

# --- COLLECT VARIABLES FROM OPERATING SYSTEM (OS) ---
db_host = os.environ.get('DB_HOST')
db_user = os.environ.get('DB_USER')
db_pass = os.environ.get('DB_PASS')
db_name = os.environ.get('DB_NAME')
api_key = os.environ.get('OWM_API_KEY')

# --- CONFIGURATION ---
DB_CONFIG = {
    'host': db_host,
    'user': db_user,
    'password': db_pass,
    'database': db_name
}

API_KEY = api_key
MQTT_BROKER = "localhost"
MQTT_TOPIC = "aprs/packets"

# --- FUNCTIONS ---

# This function runs when the script connects to the MQTT broker
# ---------------------------------------------------------------
def on_connect(client, userdata, flags, rc):

    print(f"Connected to broker {MQTT_TOPIC} .")
    client.subscribe(MQTT_TOPIC)


# This function runs every time a new MQTT message arrives 
# ---------------------------------------------------------------
def on_message(client, userdata, msg):
    
    try:
        
        # Convert raw MQTT data to a Python object
        raw_payload = msg.payload.decode('utf-8')
        data = json.loads(raw_payload)

        # Get APRS data from the message
        callsign = data.get("source")
        lat      = data.get("lat")
        lon      = data.get("lon")
        message  = data.get("comment") 
        altitude = data.get("altitude")
        speed    = data.get("speed")
        course   = data.get("course")

        # Get Weather data using coordinates
        weather_data = get_weather(lat, lon)
        
        # Extract specific weather values
        temperature   = weather_data.get('main', {}).get('temp')          
        wind_speed    = weather_data.get('wind', {}).get('speed')         
        clouds        = weather_data.get('clouds', {}).get('all')
        humidity      = weather_data.get("main", {}).get("humidity")

        # Check for rain (default to 0 if no rain)
        rain_data     = weather_data.get('rain', {})
        precipitation = rain_data.get('1h', 0) 

        # Show data in the terminal for checking
        print("-" * 15)
        print(f"Station: {callsign} | Msg: {message}")
        print(f"Location: {lat:.4f}, {lon:.4f} | Alt: {altitude}m")
        print(f"Weather: Temp: {temperature}°C | Humidity: {humidity}%")
        print("-" * 15)

        # Create a UTC Timestamp (No summer/winter time issues)
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

        # Organize data for the Database
        data_to_push = (
            callsign,
            timestamp,
            message,
            lat,
            lon,
            altitude,
            speed,
            course,
            temperature,
            precipitation,
            clouds,
            wind_speed,
            humidity
        )

        # Push the data to MariaDB
        push_to_db(data_to_push)


    except:
        print(f"Error: processing message. ")


# This function gets weather data from OpenWeather API 
# ---------------------------------------------------------------
def get_weather(lat, lon):
    
    try:
        url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={API_KEY}&units=metric&lang=nl"
        response = requests.get(url, timeout=5)
        
        # If the connection is successful return weather data
        if response.status_code == 200:
            return response.json()
        
        # If the API returns an error
        else:
            print("Weather API error (Wrong status code)")
            return {}

    except:
        print(f"Error: requesting API.")
        return {}


# This function Connects to MariaDB and saves the data
# ---------------------------------------------------------------
def push_to_db(data_tuple):
    
    try:

        # Open a connection to the MariaDB server
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        
        # SQL Command to insert data into columns
        sql = """
            INSERT INTO current_data 
            (Callsign, Timestamp, Alarm_Status, Latitude, Longitude, Altitude, Speed, Course_Degree, Temperature, Precipitation, Clouds, Wind_Speed, Humidity) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        # Send the SQL command and the data to the database
        cursor.execute(sql, data_tuple)
        conn.commit()
        
        # Close the connection to free up memory
        cursor.close()
        conn.close()
        print(f"Successfully pushed to Database.")
    
    except:
        print(f"Error: MariaDB Database.")



# --- MAIN START ---

# Setup the MQTT client
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

# Start connection loop
print("waiting for APRS data ... ")
client.connect(MQTT_BROKER, 1883, 60)
client.loop_forever()