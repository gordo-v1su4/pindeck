#!/bin/bash
# Kill any process using port 3000
PORT=3000

# Find and kill process on port 3000
if command -v lsof &> /dev/null; then
    PID=$(lsof -ti:$PORT)
    if [ ! -z "$PID" ]; then
        kill -9 $PID
        echo "Killed process $PID on port $PORT"
    else
        echo "No process found on port $PORT"
    fi
elif command -v netstat &> /dev/null; then
    PID=$(netstat -ano | grep ":$PORT " | awk '{print $5}' | head -1)
    if [ ! -z "$PID" ]; then
        kill -9 $PID
        echo "Killed process $PID on port $PORT"
    else
        echo "No process found on port $PORT"
    fi
else
    echo "Neither lsof nor netstat found. Cannot kill process on port $PORT"
fi





