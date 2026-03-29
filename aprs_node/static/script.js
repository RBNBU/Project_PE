function updateLog() {
    fetch('/api/data') 
        .then(response => {
            if (!response.ok) throw new Error("Network error");
            return response.json();
        })
        .then(data => {
            const logDiv = document.getElementById('log');
            
            // Clear the empty state if we have data
            if (data && data.length > 0 && logDiv.querySelector('.empty-state')) {
                logDiv.innerHTML = ''; 
            }

            data.forEach(packet => {
                const dateObj = packet.timestamp ? new Date(packet.timestamp * 1000) : new Date();
                const timeString = dateObj.toLocaleTimeString();
                
                const entry = document.createElement('div');
                entry.className = 'packet';
                
                // HTML for the modern card
                entry.innerHTML = `
                    <div class="packet-header">
                        <span class="callsign">${packet.callsign || 'UNKNOWN'}</span>
                        <span class="timestamp">${timeString}</span>
                    </div>
                    <span class="data">Lat: ${packet.lat || 'N/A'}, Lon: ${packet.lon || 'N/A'}</span>
                    <span class="comment">${packet.comment || ''}</span>
                `;
                
                logDiv.appendChild(entry);
            });
            
            // Auto-scroll to bottom
            logDiv.scrollTop = logDiv.scrollHeight;
        })
        .catch(error => console.error("Waiting for data..."));
}

updateLog();
setInterval(updateLog, 5000);