#!/bin/bash

# Master Real Estate Pro - Stop Development Services Script

echo "🛑 Stopping Master Real Estate Pro Development Services..."

# Kill processes by PID if file exists
if [ -f /tmp/dev-pids.txt ]; then
    while read pid; do
        if ps -p $pid > /dev/null 2>&1; then
            kill $pid 2>/dev/null
            echo "✅ Stopped process: $pid"
        fi
    done < /tmp/dev-pids.txt
    rm -f /tmp/dev-pids.txt
fi

# Kill by process name as backup
pkill -f "dist/server.js" 2>/dev/null && echo "✅ Stopped backend server"
pkill -f "prisma studio" 2>/dev/null && echo "✅ Stopped Prisma Studio"
pkill -f "vite" 2>/dev/null && echo "✅ Stopped frontend"

# Clean up log files
rm -f /tmp/backend.log /tmp/prisma-studio.log /tmp/frontend.log

echo ""
echo "🎉 All services stopped successfully!"
