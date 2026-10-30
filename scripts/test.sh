#!/usr/bin/env bash
# Usage: ./scripts/test.sh http://localhost:30080
BASE=${1:-http://localhost:30080}
echo "== cluster status =="; curl -s "$BASE/api/status"; echo
echo "== create order =="; curl -s -X POST "$BASE/api/order/items" -H 'Content-Type: application/json' -d '{"product":"book","qty":2}'; echo
echo "== list orders =="; curl -s "$BASE/api/order/items"; echo
