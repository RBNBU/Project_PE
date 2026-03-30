const API_URL = 'https://carradio-monitor.com/api/current_aprs'; //API URL, defined in Python-Backend

let lastUpdateTimestamp = null;

// variables for map
let map = null;
let car_marker = null;
let route_line = null;

async function getCurData()
{
    const curData_Container = document.getElementById('curData_Container');

    try
    {
        const response = await fetch(API_URL);

        if (!response.ok)
        {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const allCurData = await response.json();
        const latestData = allCurData[0]; //get newest data

        if (latestData.Timestamp != lastUpdateTimestamp)
        {
            lastUpdateTimestamp = latestData.Timestamp; //update last update

            console.log("New data recorded!. Checked at: " + new Date().toLocaleTimeString());

            // grouping the data and adding units
            curData_Container.innerHTML = `
            <h3>Vehicle & Status</h3>
            <ul>
                <li><strong>Callsign:</strong> ${latestData.Callsign}</li>
                <li><strong>Timestamp:</strong> ${latestData.Timestamp}</li>
                <li><strong>Alarm Status:</strong> ${latestData.Alarm_Status}</li>
            </ul>
            
            <h3>Location & Movement</h3>
            <ul>
                <li><strong>Coordinates:</strong> ${latestData.Latitude}, ${latestData.Longitude}</li>
                <li><strong>Altitude:</strong> ${latestData.Altitude} m</li>
                <li><strong>Speed:</strong> ${latestData.Speed} km/h</li>
                <li><strong>Course:</strong> ${latestData.Course_Degree}°</li>
            </ul>

            <h3>Weather & Environment</h3>
            <ul>
                <li><strong>Temperature:</strong> ${latestData.Temperature}°C</li>
                <li><strong>Humidity:</strong> ${latestData.Humidity}%</li>
                <li><strong>Wind Speed:</strong> ${latestData.Wind_Speed} m/s</li>
                <li><strong>Cloud Cover:</strong> ${latestData.Clouds}%</li>
                <li><strong>Precipitation:</strong> ${latestData.Precipitation} mm</li>
            </ul>
            `;

            // draw map
            const curLat = latestData.Latitude;
            const curLang = latestData.Longitude;

            //reverse to draw oldest to newest
            const route_coordinates = allCurData.map(row => [row.Latitude, row.Longitude]).reverse();

            if (!map) //if map does not exist
            {
                map = L.map('map_Container').setView([curLat, curLang], 15); //center on first coordinates

                //fetch openstreetmap
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    maxZoom: 19,
                    attribution: '© OpenStreetMap'
                }).addTo(map);

                car_marker = L.marker([curLat, curLang]).addTo(map);
                route_line = L.polyline(route_coordinates, {color: 'red', weight: 4}).addTo(map);
            }
            else //if map already exists
            {
                route_line.setLatLngs(route_coordinates);
                car_marker.setLatLng([curLat, curLang]);
                map.panTo([curLat, curLang]);
            }
        }
        else
        {
            console.log("No new data recorded. Checked at: " + new Date().toLocaleTimeString());
        }
    }
    catch (error)
    {
        console.error('Failed to fetch API data!\n', error);
        curData_Container.innerHTML = `<p class="error">Error while fetching data from API!</p>`;
    }
}

getCurData(); //run function

setInterval(getCurData, 5000); //check for updates every 5 seconds