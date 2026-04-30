#!/bin/bash

# 1. Paden naar venv en scripts
VENV_PYTHON="/home/vm2/Code/Python-Backend/Project_PE/Python-Backend/python-backend/bin/python3"
PY_DIR="/home/vm2/Code/Python-Backend/Project_PE/Python-Backend"
C_DIR="/home/vm2/Code/C-Code/Project_PE/C-Code"

# 2. Start Python scripts in de achtergrond
$VENV_PYTHON $PY_DIR/push_database.py &
$VENV_PYTHON $PY_DIR/pull_database.py &
$VENV_PYTHON $PY_DIR/pull_databaseHistory.py &



# 3. Start C programma (ga eerst naar de juiste map!)
cd $C_DIR
./APRS-Receive &

# Wacht op alles
wait