#!/usr/bin/env bash
set -euo pipefail

BACKEND_URL="http://localhost:48293"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  MCP PM - 데모 데이터 시딩${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check backend
if ! curl -sf "$BACKEND_URL/health" &>/dev/null; then
  echo -e "${RED}[ERROR]${NC} 백엔드가 실행 중이 아닙니다 ($BACKEND_URL)"
  exit 1
fi

case "${1:-seed}" in
  seed)
    echo -e "${BLUE}[INFO]${NC} 데모 데이터 삽입 중..."
    RESULT=$(curl -sf -X POST "$BACKEND_URL/api/seed/demo" -H "Content-Type: application/json")
    echo -e "${GREEN}[OK]${NC} 데모 데이터 삽입 완료!"
    echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
    ;;
  reset)
    echo -e "${BLUE}[INFO]${NC} 모든 데이터 초기화 중..."
    RESULT=$(curl -sf -X POST "$BACKEND_URL/api/seed/reset" -H "Content-Type: application/json")
    echo -e "${GREEN}[OK]${NC} 데이터 초기화 완료!"
    echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"
    ;;
  *)
    echo "사용법: $0 [seed|reset]"
    exit 1
    ;;
esac

echo ""
echo -e "${BLUE}대시보드:${NC} http://localhost:48294"
echo ""
