const API_URL = 'http://localhost:5000/api/current_aprs' //API URL, defined in Python-Backend

let lastUpdateTimestamp = null;

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

        const curData = await response.json();

        if (data.Timestamp != lastUpdateTimestamp)
        {
            lastUpdateTimestamp = data.Timestamp; //update last update

            curData_Container.innerHTML = `
            <p>Timestamp: ${data.Timestamp}</p>
            <p>Callsign: ${data.Callsign}</p>
            <p>Alarm Status: ${data.Alarm_Status}</p>
            `
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