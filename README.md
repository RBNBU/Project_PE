# Vehicle Tracking & Monitoring System

Een compact systeem dat voertuigtelemetrie ontvangt via het APRS‑protocol.  
Een RTL‑SDR vangt de radiosignalen op, een C‑decoder verwerkt de pakketten en een Python‑backend toont alle data in een webdashboard.

## Features
- Realtime ontvangst van APRS‑telemetrie via RTL‑SDR  
- Automatische decodering van locatie, snelheid, heading, status en RSSI  
- Python‑backend met API voor dataopslag en visualisatie  
- Weather API integratie voor waarschuwingen bij extreem weer  
- Connection Watchdog voor directe detectie van verbindingsverlies  
- Dagelijkse statistieken & automatische database‑opschoning

## Werking
1. Een voertuig zendt APRS‑telemetrie uit.  
2. De SDR ontvangt het signaal en stuurt het naar de C‑decoder.  
3. De decoder haalt telemetriedata uit het pakket.  
4. De backend verwerkt de gegevens, vraagt weerinfo op en slaat alles op in de database.  
5. Het webdashboard toont realtime status, locatie en waarschuwingen.
