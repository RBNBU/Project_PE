import time
import subprocess
import math
from gps import gps, WATCH_ENABLE, WATCH_NEWSTYLE
from gpiozero import Button

# Configuration
CALLSIGN = "ON3RBU-9"
AX25_PORT = "radio"
BTN_0_PIN = 17
BTN_1_PIN = 27

# SmartBeaconing Parameters
MAX_TIME_SEC = 300  # Max time between beacons (5 mins)
MIN_DIST_KM = 2.0    # Min distance before beaconing
MIN_COURSE_DEG = 35  # Min course change (corner pegging)

# Global state
last_sent_time = 0
last_sent_lat = 0.0
last_sent_lon = 0.0
last_sent_course = 0.0

current_lat = 0.0
current_lon = 0.0
current_course = 0.0
current_speed_knots = 0.0
current_alt_m = 0.0

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def calculate_course_diff(c1, c2):
    diff = abs(c1 - c2)
    return min(diff, 360 - diff)

def dec_to_aprs(deg, is_lat):
    direction = ""
    if is_lat:
        direction = "N" if deg >= 0 else "S"
    else:
        direction = "E" if deg >= 0 else "W"
    deg = abs(deg)
    d = int(deg)
    m = (deg - d) * 60
    if is_lat:
        return f"{d:02d}{m:05.2f}{direction}"
    else:
        return f"{d:03d}{m:05.2f}{direction}"

def send_aprs_packet(comment="0"):
    global last_sent_time, last_sent_lat, last_sent_lon, last_sent_course
    if current_lat == 0.0 or current_lon == 0.0:
        print("No GPS fix yet, cannot transmit.")
        return

    lat_str = dec_to_aprs(current_lat, True)
    lon_str = dec_to_aprs(current_lon, False)
    
    # Convert meters to feet for the APRS spec
    alt_ft = int(current_alt_m * 3.28084)
    # Format altitude as 6 digits (e.g. /A=000123)
    alt_string = f"/A={max(0, alt_ft):06d}"
    
    # Payload structure
    payload = f"!{lat_str}/{lon_str}>{int(current_course):03d}/{int(current_speed_knots):03d}{alt_string}{comment}"
    
    print(f"Transmitting: {payload}")
    subprocess.run(["beacon", "-c", CALLSIGN, "-d", "APRS WIDE1-1 WIDE2-1", AX25_PORT, payload])
    
    last_sent_time = time.time()
    last_sent_lat = current_lat
    last_sent_lon = current_lon
    last_sent_course = current_course

if __name__ == '__main__':
    # Setup buttons and assign to variables to prevent garbage collection
    btn0 = Button(BTN_0_PIN, pull_up=True, bounce_time=0.1)
    btn0.when_pressed = lambda: send_aprs_packet(comment="0")
    
    btn1 = Button(BTN_1_PIN, pull_up=True, bounce_time=0.1)
    btn1.when_pressed = lambda: send_aprs_packet(comment="1")
    
    # Setup GPS
    try:
        session = gps(mode=WATCH_ENABLE | WATCH_NEWSTYLE)
    except Exception as e:
        print(f"Failed to connect to gpsd: {e}")
        exit(1)
        
    print("APRS Tracker started. Waiting for GPS fix...")
    
    try:
        while True:
            report = session.next()
            if report['class'] == 'TPV':
                current_lat = getattr(report, 'lat', 0.0)
                current_lon = getattr(report, 'lon', 0.0)
                current_course = getattr(report, 'track', 0.0)
                current_speed_knots = getattr(report, 'speed', 0.0) * 1.94384
                current_alt_m = getattr(report, 'alt', 0.0)
                
                if current_lat == 0.0:
                    continue
                    
                time_elapsed = time.time() - last_sent_time
                dist_moved = calculate_distance(last_sent_lat, last_sent_lon, current_lat, current_lon)
                course_diff = calculate_course_diff(last_sent_course, current_course)
                
                if time_elapsed >= MAX_TIME_SEC or dist_moved >= MIN_DIST_KM or (course_diff >= MIN_COURSE_DEG and current_speed_knots > 2.0):
                    send_aprs_packet()
                    
    except (StopIteration, KeyboardInterrupt):
        print("Tracker stopped.")
        pass
