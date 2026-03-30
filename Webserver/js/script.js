// The new API URL
const API_URL = 'https://carradio-monitor.com/api/current_aprs';

let map;
let marker;
let routeLine;
let firstLoad = true;

/**
 * Converts degrees (0-360) to compass point abbreviations
 */
function getCompassPoint(graden) {
    if (graden === undefined || graden === null || graden === "") return "-";
    const streken = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    const index = Math.round(graden / 45) % 8;
    return streken[index];
}

/**
 * Initializes the OpenStreetMap using Leaflet
 */
function initMap() {
    map = L.map('map').setView([0, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    marker = L.marker([0, 0]).addTo(map);
    routeLine = L.polyline([], { color: '#38bdf8', weight: 5 }).addTo(map);
}

function setupUI() {
    const toggleBtn = document.getElementById('toggle-stats');
    const panel = document.getElementById('stats-panel');
    
    toggleBtn.addEventListener('click', () => {
        panel.classList.toggle('collapsed');
        // Tell leaflet the container size changed
        setTimeout(() => map.invalidateSize(), 400);
    });
}

/**
 * Fetches data from the API and fills the HTML fields
 */
async function updateDashboard() {
    try {
        console.log("Fetching data from:", API_URL);
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Network response was not ok: ${response.status}`);
        }

        const data = await response.json();

        // Check if we have usable data (usually an array)
        if (!data || (Array.isArray(data) && data.length === 0)) {
            console.warn("API returned no data.");
            return;
        }

        // If the API sends an array, we take the first object.
        // If it's directly an object, we use 'data'.
        const d = Array.isArray(data) ? data[0] : data;

        // --- FILL DATA ---
        // Use .toFixed(4) only if it's a number to avoid errors
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

        // --- MAP UPDATE ---
        if (Array.isArray(data)) {
            const coords = data.map(item => [item.Latitude, item.Longitude]);
            if (coords.length > 0) {
                marker.setLatLng(coords[0]);
                routeLine.setLatLngs(coords);
                if (firstLoad) {
                    map.setView(coords[0], 15);
                    firstLoad = false;
                }
            }
        }
        
        // Header info
        document.getElementById('callsign').innerText = d.Callsign || "---";
        document.getElementById('time').innerText = d.Timestamp || "---";

        // --- ALARM LOGIC ---
        const alarmCard = document.getElementById('alarm-card');
        const alarmText = document.getElementById('alarm-text');
        
        // Check if Alarm_Status exists and is not equal to 0
        if (d.Alarm_Status && d.Alarm_Status !== 0 && d.Alarm_Status !== "0") {
            alarmText.innerText = "ALARM ACTIVE";
            alarmCard.classList.add('alarm-active');
        } else {
            alarmText.innerText = "System OK";
            alarmCard.classList.remove('alarm-active');
        }

    } catch (error) {
        console.error("Error fetching APRS data:", error);
        // Optional: show an error message in the UI
        const alarmText = document.getElementById('alarm-text');
        if (alarmText) alarmText.innerText = "API ERROR";
    }
}

// Start the update when the page is loaded
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    setupUI();
    updateDashboard();
    // Update every 5 seconds
    setInterval(updateDashboard, 5000);
});