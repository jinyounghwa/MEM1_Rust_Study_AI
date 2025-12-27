#!/bin/bash
# MLX Dashboard - Real-time monitoring of all services

clear

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║           🚀 RustLearn-MEM1 MLX System Dashboard                       ║"
echo "║                    Real-time Service Monitor                           ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"

check_port() {
  local port=$1
  local name=$2
  if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ $name (port $port) - RUNNING"
    return 0
  else
    echo "❌ $name (port $port) - NOT RUNNING"
    return 1
  fi
}

echo ""
echo "📊 SERVICE STATUS"
echo "═══════════════════════════════════════════════════════════════════════════"

check_port 8080 "MLX Server (Python)"
check_port 3001 "Backend API (NestJS)"
check_port 3000 "Frontend (Next.js)"
check_port 5432 "PostgreSQL Database"

echo ""
echo "🔍 API HEALTH CHECKS"
echo "═══════════════════════════════════════════════════════════════════════════"

echo ""
echo "MLX Server Health:"
if curl -s http://localhost:8080/v1/models >/dev/null 2>&1; then
  MODELS=$(curl -s http://localhost:8080/v1/models | grep -o '"id":"[^"]*"' | wc -l)
  echo "  ✅ Models available: $MODELS"
else
  echo "  ❌ MLX server not responding"
fi

echo ""
echo "Backend Health:"
if HEALTH=$(curl -s http://localhost:3001/api/rust-learn/health 2>/dev/null); then
  STATUS=$(echo "$HEALTH" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  echo "  ✅ Status: $STATUS"
else
  echo "  ❌ Backend health check failed"
fi

echo ""
echo "📈 SYSTEM RESOURCES"
echo "═══════════════════════════════════════════════════════════════════════════"

MLX_PID=$(lsof -t -i :8080 2>/dev/null | head -1)
if [ ! -z "$MLX_PID" ]; then
  CPU=$(ps -p $MLX_PID -o %cpu= 2>/dev/null | tr -d ' ')
  MEM=$(ps -p $MLX_PID -o %mem= 2>/dev/null | tr -d ' ')
  echo "MLX Server (PID: $MLX_PID)"
  echo "  CPU: ${CPU}% | Memory: ${MEM}%"
fi

echo ""
echo "📍 ACCESS URLS"
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  🌐 Frontend:       http://localhost:3000"
echo "  🔌 Backend API:    http://localhost:3001"
echo "  📡 MLX Server:     http://localhost:8080"
echo "  🗄️  PostgreSQL:     localhost:5432"

echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
