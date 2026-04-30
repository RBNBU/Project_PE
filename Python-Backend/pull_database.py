# --- LIBRARIES ---
from flask import Flask, jsonify
from flask_cors import CORS
import mysql.connector
import os

app = Flask(__name__)
CORS(app)

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

@app.route('/api/current_aprs')

# This function retrieves the latest APRS data from the database and sends it as JSON to the API
def get_now():
    conn = None
    try:
        # Connect with Database
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)

        # Take the latest row from the current_data table
        query = "SELECT * FROM current_data ORDER BY Timestamp DESC"
        cursor.execute(query)
        data = cursor.fetchall()

        cursor.close()
        conn.close()

        if data:

            #Send the data as JSON to the API
            return jsonify(data)
        
        else:

            return jsonify({"error": "Geen data gevonden in de tabel 'current_data'"}), 404

    
    except:
        print(f"Error: Database")
    
    finally:

        # close database connection if it is open
        if conn and conn.is_connected():
            conn.close()

@app.route('/api/history')
def get_history():
    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM daily_statistics ORDER BY Date DESC"
        cursor.execute(query)
        data = cursor.fetchall()
        cursor.close()
        return jsonify(data) if data else (jsonify({"error": "No history found"}), 404)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if conn and conn.is_connected(): conn.close()


if __name__ == '__main__':
    
    # Start API on localhost port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)