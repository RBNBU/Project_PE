# 🛰️ Vehicle Tracking & Monitoring System

[cite_start]Een robuust systeem voor real-time voertuigbeheer, gebruikmakend van het **APRS-protocol** en **SDR-technologie** om data-integriteit te garanderen in kritieke situaties[cite: 7, 11].

## 📖 Projectomschrijving
[cite_start]Dit project simuleert een radioverbinding vanuit een voertuig (Jeep) die telemetrie verzendt naar een ontvangststation[cite: 7]. [cite_start]De gegevens worden opgevangen via een **Software Defined Radio (SDR)** en verwerkt door een gelaagde infrastructuur[cite: 9, 35].

### ✨ Kernfuncties
* [cite_start]**📡 Live Telemetrie:** Monitoring van locatie, snelheid, heading en signaalsterkte (RSSI)[cite: 8].
* [cite_start]**🌦️ Weather Safety:** Automatische waarschuwingen bij extreem weer op de huidige locatie via een Weer-API[cite: 13, 24].
* [cite_start]**🐕 Connection Watchdog:** Directe detectie van verbindingsverlies met visuele statusupdates[cite: 14, 27].
* [cite_start]**🛡️ Data Vault:** Beveiligde opslag met gelaagde netwerkisolatie en fysiek gescheiden back-ups[cite: 17, 33].

---

## 🏗️ Systeemarchitectuur
[cite_start]Het systeem draait op een geavanceerde VM-structuur voor maximale isolatie[cite: 35]:

* [cite_start]**Gateway (VM 1):** Beheert de toegang en zorgt voor **High Availability** door gecrashte servers automatisch te herstellen[cite: 36, 37].
* [cite_start]**Application (VM 2):** Host de webinterface, de C-decoder en de API-logica[cite: 38].
* [cite_start]**Database (VM 3):** Een geïsoleerd segment voor veilige data-opslag en onderhoudstaken[cite: 39, 40].



---

## 👥 Het Team
* [cite_start]**Jasper Artoos** [cite: 4]
* [cite_start]**Ruben Buelens** [cite: 5]

---
[cite_start]*Project ontwikkeld in het kader van Practice Enterprise.* [cite: 1]
