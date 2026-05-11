const API_URL = 'https://carradio-monitor.com/api/current_aprs';

let map;
let marker; // This starts as undefined
let routeLine;
let firstLoad = true;

function getCompassPoint(graden) {
    if (graden === undefined || graden === null || graden === "") return "-";
    const streken = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    const index = Math.round(graden / 45) % 8;
    return streken[index];
}

function initMap() {
    // Initialize map focused on a world view
    map = L.map('map').setView([0, 0], 2);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Initialize the line but don't add points yet
    routeLine = L.polyline([], { color: '#ff0000', weight: 5 }).addTo(map);
    
    // NOTE: marker is NOT added to the map here to avoid the [0,0] pin
}

function setupUI() {
    const toggleBtn = document.getElementById('toggle-stats');
    const panel = document.getElementById('stats-panel');
    
    if (toggleBtn && panel) {
        toggleBtn.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            setTimeout(() => map.invalidateSize(), 400);
        });
    }
}

async function updateDashboard() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Exit if there is no data or an empty array
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return;
        }

        const d = Array.isArray(data) ? data[0] : data;

        // Update Text Stats
        document.getElementById('lat').innerText = d.Latitude ? parseFloat(d.Latitude).toFixed(4) : "-";
        document.getElementById('lon').innerText = d.Longitude ? parseFloat(d.Longitude).toFixed(4) : "-";
        document.getElementById('alt').innerText = d.Altitude ? d.Altitude + "m" : "-";
        
        document.getElementById('speed').innerText = d.Speed ?? "0";
        document.getElementById('course-deg').innerText = d.Course_Degree ?? "-";
        document.getElementById('course-text').innerText = getCompassPoint(d.Course_Degree);
        
        document.getElementById('temp').innerText = d.Temperature ?? "-";
        document.getElementById('hum').innerText = (d.Humidity ?? "-") + "%";
        document.getElementById('clouds').innerText = (d.Clouds ?? "-") + "%";
        document.getElementById('wind').innerText = (d.Wind_Speed ?? "-") + " m/s";
        document.getElementById('rain').innerText = (d.Precipitation ?? "0") + " mm";

        // Map and Route Update
        if (Array.isArray(data)) {
            // Filter out any data points missing coordinates to prevent jumps to [0,0]
            const coords = data
                .filter(item => item.Latitude && item.Longitude)
                .map(item => [parseFloat(item.Latitude), parseFloat(item.Longitude)]);

            if (coords.length > 0) {
                // If the marker doesn't exist on the map yet, create it
                if (!marker) {
                    marker = L.marker(coords[0]).addTo(map);
                } else {
                    marker.setLatLng(coords[0]);
                }

                routeLine.setLatLngs(coords);

                // On first valid data load, zoom into the car's location
                if (firstLoad) {
                    map.setView(coords[0], 15);
                    firstLoad = false;
                }
            }
        }
        
        // Callsign and Timestamp logic
        document.getElementById('callsign').innerText = d.Callsign || "---";
        if (d.Timestamp) {
            const date = new Date(d.Timestamp);
            if (!isNaN(date.getTime())) {
                const dd = String(date.getUTCDate()).padStart(2, '0');
                const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
                const yy = String(date.getUTCFullYear()).slice(-2);
                const hh = String(date.getUTCHours()).padStart(2, '0');
                const min = String(date.getUTCMinutes()).padStart(2, '0');
                const ss = String(date.getUTCSeconds()).padStart(2, '0');
                document.getElementById('time').innerText = `${dd}:${mm}:${yy} ${hh}:${min}:${ss} UTC`;
            } else {
                document.getElementById('time').innerText = d.Timestamp;
            }
        } else {
            document.getElementById('time').innerText = "---";
        }

        // Alarm logic
        const alarmCard = document.getElementById('alarm-card');
        const alarmText = document.getElementById('alarm-text');
        
        if (alarmCard && alarmText) {
            if (d.Alarm_Status && d.Alarm_Status !== 0 && d.Alarm_Status !== "0") {
                alarmText.innerText = "ALARM ACTIVE";
                alarmCard.classList.add('alarm-active');
            } else {
                alarmText.innerText = "System OK";
                alarmCard.classList.remove('alarm-active');
            }
        }

    } catch (error) {
        console.error("Error updating dashboard:", error);
        const alarmText = document.getElementById('alarm-text');
        if (alarmText) alarmText.innerText = "API ERROR";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupUI();
    updateDashboard();
    // Refresh data every 5 seconds
    setInterval(updateDashboard, 5000);
});