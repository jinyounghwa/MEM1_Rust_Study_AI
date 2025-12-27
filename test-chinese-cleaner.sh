#!/bin/bash

# 중국어 정제 시스템 테스트

API="http://localhost:3001/api/rust-learn"
USER="test-chinese-cleaner"

echo "========================================"
echo "중국어 정제 시스템 테스트"
echo "========================================"
echo ""

# 1. 학습 시작
echo "[1/4] 학습 세션 시작..."
START_RESPONSE=$(curl -s -X POST "$API/start" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER\", \"topics\": \"Option 타입\"}")
echo "$START_RESPONSE" | jq .

echo ""
echo "[2/4] 초기 설명 받기..."
sleep 2

# 2. 초기 설명 요청 (이 부분에서 중국어가 섞여나올 가능성)
EXPLAIN_RESPONSE=$(curl -s -X POST "$API/chat" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER\", \"message\": \"Option 타입이 뭐야?\"}")

echo "=== AI 응답 (정제됨) ==="
echo "$EXPLAIN_RESPONSE" | jq '.response'

echo ""
echo "[3/4] 정제된 응답 분석..."
RESPONSE_TEXT=$(echo "$EXPLAIN_RESPONSE" | jq -r '.response')

# 중국어 문자가 있는지 검사
CHINESE_COUNT=$(echo "$RESPONSE_TEXT" | grep -o '[^\x00-\x7F]' | wc -l)
echo "비ASCII 문자 개수: $CHINESE_COUNT"

# 한국어가 있는지 확인
if echo "$RESPONSE_TEXT" | grep -q '[가-힣]'; then
  echo "✅ 한국어 포함: 예"
else
  echo "❌ 한국어 포함: 아니오"
fi

echo ""
echo "[4/4] 헬스 체크..."
HEALTH=$(curl -s "$API/health")
echo "$HEALTH" | jq .

echo ""
echo "========================================"
echo "테스트 완료"
echo "========================================"
