# Vehicle Tracking & Monitoring System

Een robuust systeem voor real-time voertuigbeheer, gebruikmakend van het APRS-protocol en SDR-technologie om data-integriteit te garanderen in kritieke situaties.

---

### Projectomschrijving
Dit project simuleert een radioverbinding vanuit een voertuig (Jeep) die telemetrie verzendt naar een ontvangststation. De gegevens worden opgevangen via een Software Defined Radio (SDR) en verwerkt door een gelaagde infrastructuur.

---

### Kernfuncties
* **Live Telemetrie**: Monitoring van locatie, status, snelheid, heading en signaalsterkte (RSSI).
* **Weather Safety**: Real-time integratie die de bestuurder waarschuwt bij gevaarlijk weer op de huidige locatie.
* **Connection Watchdog**: Automatische detectie van verbindingsstoringen waarbij het systeem direct schakelt naar "Connection Lost".
* **Data Vault**: Bescherming van gevoelige gegevens via gelaagde netwerkisolatie en fysiek gescheiden back-ups.

---

### Systeemarchitectuur
De infrastructuur is ondergebracht in een geavanceerde VM-structuur voor maximale isolatie en veiligheid:

**1. Security & Gateway (VM 1)**
De centrale toegangspoort via Cloudflare en Nginx. Bevat een monitoringscript voor High Availability dat de status van de overige VM's controleert en bij een crash automatisch nieuwe instanties uitrolt.

**2. Application Server (VM 2)**
Host de webinterface, de logica voor de Weer-API en de hardware-interfacing voor de SDR en de C-decoder.

**3. Data Vault (VM 3)**
Een volledig geïsoleerd segment voor de SQL-server. Hier draaien de onderhoudstaken en de Backup Agent die de integriteit van de opgeslagen data bewaakt.



---

### Het Team
* **Jasper Artoos**
* **Ruben Buelens**

---
![Jeep Wrangler](/schema.png)
*Project ontwikkeld in het kader van Practice Enterprise.*
