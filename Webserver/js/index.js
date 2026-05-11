const API_URL = 'https://carradio-monitor.com/api/current_aprs';

let map;
let marker;
let routeLine;
let firstLoad = true;

function getCompassPoint(graden) {
    if (graden === undefined || graden === null || graden === "") return "-";
    const streken = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    const index = Math.round(graden / 45) % 8;
    return streken[index];
}

function initMap() {
    map = L.map('map').setView([0, 0], 2); // Initial world view
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Don't create the marker here yet
    routeLine = L.polyline([], { color: '#ff0000', weight: 5 }).addTo(map);
}

function setupUI() {
    const toggleBtn = document.getElementById('toggle-stats');
    const panel = document.getElementById('stats-panel');
    
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        setTimeout(() => map.invalidateSize(), 400);
    });
}

async function updateDashboard() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }

        const data = await response.json();
        
        // Ensure we have data to work with
        if (!data || (Array.isArray(data) && data.length === 0)) {
            console.warn("No data received from API");
            return;
        }

        // Standardize data: handle both single object and array of objects
        const history = Array.isArray(data) ? data : [data];
        const latest = history[0];

        // 1. Update Text Statistics
        document.getElementById('lat').innerText = latest.Latitude ? parseFloat(latest.Latitude).toFixed(4) : "-";
        document.getElementById('lon').innerText = latest.Longitude ? parseFloat(latest.Longitude).toFixed(4) : "-";
        document.getElementById('alt').innerText = latest.Altitude ? latest.Altitude + "m" : "-";
        document.getElementById('speed').innerText = latest.Speed ?? "0";
        document.getElementById('course-deg').innerText = latest.Course_Degree ?? "-";
        document.getElementById('course-text').innerText = getCompassPoint(latest.Course_Degree);
        
        // 2. Update Weather Information
        document.getElementById('temp').innerText = latest.Temperature ?? "-";
        document.getElementById('hum').innerText = (latest.Humidity ?? "-") + "%";
        document.getElementById('clouds').innerText = (latest.Clouds ?? "-") + "%";
        document.getElementById('wind').innerText = (latest.Wind_Speed ?? "-") + " m/s";
        document.getElementById('rain').innerText = (latest.Precipitation ?? "0") + " mm";

        // 3. Map Logic - Fixes the "Pin in middle of world" issue
        if (latest.Latitude && latest.Longitude) {
            const latestPos = [latest.Latitude, latest.Longitude];
            
            // Create marker only on first valid data point
            if (!marker) {
                marker = L.marker(latestPos).addTo(map);
            } else {
                marker.setLatLng(latestPos);
            }

            // Update the trailing route line
            const coords = history
                .filter(item => item.Latitude && item.Longitude)
                .map(item => [item.Latitude, item.Longitude]);
            routeLine.setLatLngs(coords);

            // Zoom to car on first load
            if (firstLoad) {
                map.setView(latestPos, 15);
                firstLoad = false;
            }
        }

        // 4. Update Header/Callsign Info
        document.getElementById('callsign').innerText = latest.Callsign || "---";
        if (latest.Timestamp) {
            const date = new Date(latest.Timestamp);
            if (!isNaN(date.getTime())) {
                const dd = String(date.getUTCDate()).padStart(2, '0');
                const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
                const yy = String(date.getUTCFullYear()).slice(-2);
                const hh = String(date.getUTCHours()).padStart(2, '0');
                const min = String(date.getUTCMinutes()).padStart(2, '0');
                const ss = String(date.getUTCSeconds()).padStart(2, '0');
                document.getElementById('time').innerText = `${dd}:${mm}:${yy} ${hh}:${min}:${ss} UTC`;
            } else {
                document.getElementById('time').innerText = latest.Timestamp;
            }
        }

        // 5. Alarm Status
        const alarmCard = document.getElementById('alarm-card');
        const alarmText = document.getElementById('alarm-text');
        if (latest.Alarm_Status && latest.Alarm_Status != 0) {
            alarmText.innerText = "ALARM ACTIVE";
            alarmCard.classList.add('alarm-active');
        } else {
            alarmText.innerText = "System OK";
            alarmCard.classList.remove('alarm-active');
        }

    } catch (error) {
        console.error("Dashboard Update Error:", error);
        const alarmText = document.getElementById('alarm-text');
        if (alarmText) alarmText.innerText = "API ERROR";
    }
}
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupUI();
    updateDashboard();
    setInterval(updateDashboard, 5000);
});