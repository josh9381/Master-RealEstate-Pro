#!/bin/bash

# Master Real Estate Pro - Development Startup Script
# This script starts all required services for development

echo "🚀 Starting Master Real Estate Pro Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Kill any existing processes on our ports (except Prisma Studio)
echo -e "${YELLOW}🧹 Cleaning up existing processes...${NC}"
pkill -f "dist/server.js" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Build Backend first
echo -e "${BLUE}🔨 Building Backend...${NC}"
cd /workspaces/Master-RealEstate-Pro/backend
if ! npm run build > /tmp/backend-build.log 2>&1; then
  echo -e "${YELLOW}⚠️  Backend build failed! Check /tmp/backend-build.log for errors${NC}"
  cat /tmp/backend-build.log
  exit 1
fi
echo -e "${GREEN}✅ Backend built successfully${NC}"

# Start Backend Server
echo -e "${BLUE}📦 Starting Backend Server (Port 8000)...${NC}"
cd /workspaces/Master-RealEstate-Pro/backend
npm start > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
echo -e "${GREEN}✅ Backend started (PID: $BACKEND_PID)${NC}"

# Wait a moment for backend to initialize
sleep 3

# Check if backend is actually running
if ! ps -p $BACKEND_PID > /dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  Backend failed to start! Check /tmp/backend.log for errors${NC}"
  tail -20 /tmp/backend.log
  exit 1
fi

# Start Prisma Studio (if not already running)
echo -e "${BLUE}🗄️  Starting Prisma Studio (Port 5555)...${NC}"
cd /workspaces/Master-RealEstate-Pro/backend
EXISTING_PRISMA=$(pgrep -f "prisma studio")
if [ -n "$EXISTING_PRISMA" ]; then
  echo -e "${YELLOW}⚠️  Prisma Studio already running (PID: $EXISTING_PRISMA)${NC}"
  PRISMA_PID=$EXISTING_PRISMA
else
  npx prisma studio --port 5555 > /tmp/prisma-studio.log 2>&1 &
  PRISMA_PID=$!
  echo -e "${GREEN}✅ Prisma Studio started (PID: $PRISMA_PID)${NC}"
fi

# Start Frontend
echo -e "${BLUE}🎨 Starting Frontend (Port 3000)...${NC}"
cd /workspaces/Master-RealEstate-Pro
npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✅ Frontend started (PID: $FRONTEND_PID)${NC}"

echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service URLs:${NC}"
echo "   Frontend:      https://probable-fiesta-v65j576gg6qgfpp79-3000.app.github.dev"
echo "   Backend API:   https://probable-fiesta-v65j576gg6qgfpp79-8000.app.github.dev"
echo "   Prisma Studio: https://probable-fiesta-v65j576gg6qgfpp79-5555.app.github.dev"
echo ""
echo -e "${BLUE}📝 Process IDs:${NC}"
echo "   Backend:       $BACKEND_PID"
echo "   Prisma Studio: $PRISMA_PID"
echo "   Frontend:      $FRONTEND_PID"
echo ""
echo -e "${BLUE}📋 Logs:${NC}"
echo "   Backend:       tail -f /tmp/backend.log"
echo "   Prisma Studio: tail -f /tmp/prisma-studio.log"
echo "   Frontend:      tail -f /tmp/frontend.log"
echo ""
echo -e "${YELLOW}💡 Make sure ports 3000, 5555, and 8000 are set to PUBLIC in the Ports tab${NC}"
echo ""
echo -e "${BLUE}🛑 To stop all services, run: ./stop-dev.sh${NC}"

# Save PIDs to file for stop script
echo "$BACKEND_PID" > /tmp/dev-pids.txt
echo "$PRISMA_PID" >> /tmp/dev-pids.txt
echo "$FRONTEND_PID" >> /tmp/dev-pids.txt

# Disown processes so they continue running after script exits
disown $BACKEND_PID $PRISMA_PID $FRONTEND_PID 2>/dev/null

echo ""
echo -e "${GREEN}✨ All services are running in the background${NC}"
echo -e "${BLUE}🛑 To stop all services, run: ./stop-dev.sh${NC}"
echo ""
