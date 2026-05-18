# CarRadio Monitor

Een robuust systeem voor real-time voertuigbeheer en telemetrie, gebruikmakend van het decentrale APRS-protocol (2-meter VHF-band) en SDR-technologie om data-integriteit te garanderen in afgelegen gebieden (dead zones) onafhankelijk van reguliere gsm-netwerken.

---

### Projectomschrijving
Dit project omvat een end-to-end radioverbinding vanuit een rijdend voertuig naar een centraal ontvangststation. Een 'Carbeacon' (Raspberry Pi + GPS + Yaesu FTM-300DE zendontvanger) verzendt actuele locatie- en statusgegevens. De gegevens worden via de ether opgevangen door een basisstation met een Diamond X50 antenne en een RTL-SDR ontvanger, waarna ze lokaal worden gedemoduleerd, gefilterd en verwerkt in een veilige Proxmox virtuele infrastructuur.

---

### Kernfuncties
* **Live Telemetrie & Tracking**: Real-time monitoring van locatie, snelheid, hoogte en koers via een dynamisch Leaflet-dashboard.
* **SmartBeaconing**: Intelligente algoritmes op de Raspberry Pi die transmissies optimaliseren op basis van bochten (corner pegging) en afgelegde afstand.
* **Weather & Environment Integratie**: Automatische verrijking van inkomende APRS-pakketten met actuele OpenWeatherMap-data op basis van de doorgegeven GPS-coördinaten.
* **Telegram Alarmsysteem**: Directe push-notificaties bij noodsignalen via de fysieke stuurknoppen in het voertuig of bij extreme weersomstandigheden (vrieskou, zware regen, harde wind).
* **Hardware-Level Filtering**: Een uiterst efficiënt, in C geschreven "Man-in-the-Middle" MQTT-filterprogramma met SSID-stripping en dynamische whitelisting.

---

### Systeemarchitectuur
De backend-infrastructuur is ondergebracht in een geavanceerde Proxmox VM-structuur voor maximale isolatie en veiligheid:

* **1. Security & Gateway (VM 1):** De centrale toegangspoort. Behandelt al het verkeer via Cloudflare Zero Trust Tunnels en functioneert als Nginx Reverse Proxy met geconfigureerde NAT-routing (iptables).
* **2. Application Server (VM 2):** Het rekenhart van het systeem. Host OpenWebRX voor de SDR-demodulatie, de C-Filter logica, en de Python scripts (`push_database.py` & `pull_database.py`) voor verwerking en API-hosting.
* **3. Data Vault (VM 3):** Een volledig afgeschermd en geïsoleerd netwerksegment voor de MariaDB SQL-server waar alle telemetrie permanent en veilig wordt opgeslagen.

---

### Installatie & Configuratie (How to setup)

#### 1. Vereisten (Prerequisites)
* Een werkende Proxmox/Ubuntu server met MQTT-broker (Mosquitto) en MariaDB geïnstalleerd.
* RTL-SDR v4 dongle (met USB-passthrough naar de server) & OpenWebRX.
* Python 3.x, `pip`, en GCC (voor de C-compiler).

#### 2. Installatiestappen

**Stap 1: Repository klonen**
```bash
git clone [https://github.com/RBNBU/Project_PE.git](https://github.com/RBNBU/Project_PE.git)
cd Project_PE
```

**Stap 2: Database Setup**
Navigeer naar de map `Database` en importeer het meegeleverde SQL-schema in je MariaDB server om de tabellen `current_data` en `daily_statistics` aan te maken. Stel tevens de nachtelijke SQL-timer in voor de data-aggregatie.

**Stap 3: C-Filter Compileren & Configureren**
Navigeer naar de map `C-Code` en compileer het filterprogramma (dit vereist de Paho MQTT en cJSON libraries):
```bash
cd C-Code
gcc -o aprs_filter filter.c -lpaho-mqtt3c -lcjson
```
Zorg dat je het bestand `Callsigns.txt` aanpast met de specifieke roepnamen (zonder SSID) die je wilt whitelisten, bijvoorbeeld: `ON3RBU`.

**Stap 4: Python Backend & API**
Navigeer naar de map `Python-Backend` en installeer de benodigde Python packages handmatig via pip:
```bash
cd ../Python-Backend
pip install paho-mqtt requests Flask mysql-connector-python
```
Zet je credentials (DB wachtwoord, OpenWeather API Key, Telegram Token) in je OS Environment Variables. Start vervolgens de verwerkings- en API-services:
```bash
python3 push_database.py &
python3 pull_database.py &
```

**Stap 5: Carbeacon (Voertuig Setup)**
Ga op de Raspberry Pi naar de map `aprs_node` en installeer de voertuig-specifieke libraries:
```bash
cd ../aprs_node
pip install aprslib gpiozero Flask
```
Zorg dat `direwolf` en de AX.25 netwerktools zijn geïnstalleerd op het systeem. Draai `start.sh` om de virtuele radiopoort op te zetten en start `tracker.py` om de telemetrie-uitzendingen te starten. Serveer de Flask-app (`app.py`) om het lokale dashboard in de wagen bereikbaar te maken.

**Stap 6: Web Dashboard**
Plaats de inhoud van de map `Webserver` in de web-directory van Nginx of Apache om de grafische frontend toegankelijk te maken voor gebruikers.

---

### Het Team
* **Jasper Artoos** (Server, Netwerk & Database)
* **Ruben Buelens** (Hardware, C-programmatie & Voertuig-integratie)

---
![Schema werking](schema.png)

*Gerealiseerd in het kader van het vak Practice Enterprise ICT aan de Thomas More Hogeschool (Campus De Nayer).*
