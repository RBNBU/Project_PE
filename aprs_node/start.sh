#!/bin/bash
killall direwolf kissattach python3

# Start Direwolf and wait for pseudo-terminal
/usr/bin/direwolf -c /home/pi/direwolf.conf -p &
sleep 8

# Link AX.25 stack
/usr/sbin/kissattach /tmp/kisstnc radio
sleep 2

# Force Linux AX.25 to drop the CRC so Direwolf accepts the packets
/usr/sbin/kissparms -c 1 -p radio
sleep 1

# Start Python apps
cd /home/pi/aprs_node
/usr/bin/python3 tracker.py &
/usr/bin/python3 app.py &

wait
