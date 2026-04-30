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
chat_id = os.environ.get('CHAT_ID')
bot_token = os.environ.get('BOT_TOKEN')

# --- CONFIGURATION ---
DB_CONFIG = {
    'host': db_host,
    'user': db_user,
    'password': db_pass,
    'database': db_name
}

API_KEY = api_key
MQTT_BROKER = "localhost"
MQTT_TOPIC = "RTL_SDR/FILTERED/APRS"

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
        speed    = data.get("speed",0)
        course   = data.get("course",0)

    
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

        # Create a UTC Timestamp (No summer/winter time issues)

        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')

        # Show data in the terminal for debugging purposes
        print("\n" + "="*30)
        print("DATA TO BE PUSHED:")
        print(f"Callsign:      {callsign}")
        print(f"Timestamp:     {timestamp}")
        print(f"Message/Alarm: {message}")
        print(f"Latitude:      {lat}")
        print(f"Longitude:     {lon}")
        print(f"Altitude:      {altitude}")
        print(f"Speed:         {speed}")
        print(f"Course:        {course}")
        print(f"Temperature:   {temperature}°C")
        print(f"Precipitation: {precipitation}mm")
        print(f"Clouds:        {clouds}%")
        print(f"Wind Speed:    {wind_speed} m/s")
        print(f"Humidity:      {humidity}%")
        print("="*30 + "\n")

        # Send messages to mobile phone if message equals 1 (alarm)
        if message == '1':
            allert_message = "⚠️ CAR ALARM STATUS ON ⚠️"
            url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
            payload = {
                'chat_id': chat_id,
                'text': allert_message
                }
            
            response = requests.post(url, json=payload)
            print(response.json())
        
        # Send message to mobile phone if there is rain detected
        if precipitation > 5:
            allert_message = "🌧️ HIGH AMOUNT OF RAIN DETECTED 🌧️"
            url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
            payload = {
                'chat_id': chat_id,
                'text': allert_message
                }
            
            response = requests.post(url, json=payload)
            print(response.json())
        
        # Send message to mobile phone if the windspeed is high
        if wind_speed > 13:
            allert_message = "💨 STRONG WIND DETECTED 💨"
            url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
            payload = {
                'chat_id': chat_id,
                'text': allert_message
                }
            
            response = requests.post(url, json=payload)
            print(response.json())
        
        # Send message to mobile phone if the temperature is below 0
        if temperature < 0:
            allert_message = "❄️ IT IS FREEZING ❄️"
            url = f'https://api.telegram.org/bot{bot_token}/sendMessage'
            payload = {
                'chat_id': chat_id,
                'text': allert_message
                }
            
            response = requests.post(url, json=payload)
            print(response.json())




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


    except Exception as e:
        print(f"Error: {e}")


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

    except Exception as e:
        print(f"Error: requesting API. {e}")
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
    
    except Exception as e:
        print(f"Error: MariaDB Database. {e}")



# --- MAIN START ---

# Setup the MQTT client
client = mqtt.Client()
client.on_connect = on_connect
client.on_message = on_message

# Start connection loop
print("waiting for APRS data ... ")
client.connect(MQTT_BROKER, 1883, 60)
client.loop_forever()