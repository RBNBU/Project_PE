from flask import Flask, request, jsonify, render_template
import subprocess, threading, aprslib, time, os

app = Flask(__name__)
received_packets = []

def send_aprs_message(target_call, message):
    payload = f":{target_call.ljust(9)}:{message}{{01"
    subprocess.run(["beacon", "-c", "ON3RBU-9", "-d", "APRS WIDE1-1 WIDE2-1", "radio", payload])

@app.route('/send', methods=['POST'])
def handle_send():
    data = request.json
    send_aprs_message(data.get('target', 'APRS'), data.get('message', ''))
    return jsonify({"status": "sent"})

# --- NEW ROUTE: TELLS TRACKER.PY TO SEND A LOCATION BEACON ---
@app.route('/beacon', methods=['POST'])
def handle_beacon():
    data = request.json
    comment = data.get('comment')
    if comment in ['0', '1']:
        try:
            # Create a dummy file in the Pi's RAM
            with open(f'/tmp/aprs_trigger_{comment}', 'w') as f:
                f.write('trigger')
            return jsonify({"status": "beacon queued"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Invalid comment"}), 400

def listen_to_ax25():
    process = subprocess.Popen(['stdbuf', '-oL', 'axlisten', '-a'], stdout=subprocess.PIPE, universal_newlines=True)
    current_sender = ""
    current_dest = ""
    
    for line in process.stdout:
        line = line.strip()
        
        if line.startswith("radio: fm"):
            parts = line.split()
            try:
                current_sender = parts[2]
                current_dest = parts[4]
            except: 
                pass
                
        elif current_sender and line and not line.startswith("radio:"):
            tnc2_packet = f"{current_sender}>{current_dest}:{line}"
            try:
                parsed = aprslib.parse(tnc2_packet)
                
                formatted_packet = {
                    'callsign': parsed.get('from', 'UNKNOWN'),
                    'lat': parsed.get('latitude', 'N/A'),
                    'lon': parsed.get('longitude', 'N/A'),
                    'comment': parsed.get('comment', ''),
                    'timestamp': time.time()
                }
                
                received_packets.insert(0, formatted_packet)
                if len(received_packets) > 100: 
                    received_packets.pop()
                    
            except Exception:
                pass
                
            current_sender = ""

@app.route('/api/data')
def get_packets(): 
    return jsonify(received_packets)

@app.route('/')
def index(): 
    return render_template('index.html')

if __name__ == '__main__':
    threading.Thread(target=listen_to_ax25, daemon=True).start()
    app.run(host='0.0.0.0', port=80)
