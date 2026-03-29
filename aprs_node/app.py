from flask import Flask, request, jsonify, render_template
import subprocess, threading, aprslib, time

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

def listen_to_ax25():
    process = subprocess.Popen(['axlisten', '-a'], stdout=subprocess.PIPE, universal_newlines=True)
    current_sender = ""
    current_dest = ""
    
    for line in process.stdout:
        line = line.strip()
        # Catch header line
        if line.startswith("radio: fm"):
            parts = line.split()
            try:
                current_sender = parts[2]
                current_dest = parts[4]
            except: pass
            
        # Catch payload line after header line
        elif current_sender and line and not line.startswith("radio:"):
            # Stitch together to standard TNC2 format
            tnc2_packet = f"{current_sender}>{current_dest}:{line}"
            try:
                parsed = aprslib.parse(tnc2_packet)
                parsed['local_time'] = time.strftime('%H:%M:%S')
                received_packets.insert(0, parsed)
                if len(received_packets) > 100: received_packets.pop()
            except Exception: pass
            
            # Reset next packet
            current_sender = ""

@app.route('/api/packets')
def get_packets(): return jsonify(received_packets)

@app.route('/')
def index(): return render_template('index.html')

if __name__ == '__main__':
    threading.Thread(target=listen_to_ax25, daemon=True).start()
    app.run(host='0.0.0.0', port=80)
