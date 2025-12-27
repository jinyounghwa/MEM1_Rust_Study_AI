#!/bin/bash
# Monitor MLX Model Download Progress

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║           📦 MLX Model Download & Cache Monitor                        ║"
echo "║              Qwen 2.5 7B Instruct 4-bit Status                         ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"

MLX_CACHE_DIR="$HOME/.cache/huggingface/hub"
QWEN_DIR=$(find "$MLX_CACHE_DIR" -maxdepth 2 -name "*Qwen*" -type d 2>/dev/null | head -1)

if [ ! -z "$QWEN_DIR" ]; then
  echo ""
  echo "✅ QWEN MODEL DIRECTORY FOUND"
  echo "═══════════════════════════════════════════════════════════════════════"
  echo "Location: $QWEN_DIR"
  echo ""

  TOTAL_SIZE=$(du -sh "$QWEN_DIR" 2>/dev/null | awk '{print $1}')
  echo "📊 Total Size: $TOTAL_SIZE"
  echo ""

  echo "✅ MODEL STATUS: DOWNLOADED"
else
  echo ""
  echo "❌ Qwen model not cached yet"
  echo ""
  echo "💡 The model will be downloaded on first server startup"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
echo ""
echo "🔍 MLX SERVER STATUS"
echo "═══════════════════════════════════════════════════════════════════════"

if lsof -Pi :8080 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "✅ MLX Server is RUNNING on port 8080"
  if MODELS=$(curl -s http://localhost:8080/v1/models 2>/dev/null); then
    COUNT=$(echo "$MODELS" | grep -o '"id":"[^"]*"' | wc -l)
    echo "  - Models loaded: $COUNT"
  fi
else
  echo "⏸️  MLX Server is NOT RUNNING"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════════"
