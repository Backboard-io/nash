#!/usr/bin/env bash
# Probes Backboard: create assistant -> create thread -> send message -> retrieve thread
# Mirrors the Nash pattern: bbAssistantId owns the thread; memory=Readonly on add_message.
set -euo pipefail

BASE_URL="https://app.backboard.io/api"
API_KEY="${BACKBOARD_API_KEY:-}"

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: BACKBOARD_API_KEY not set"
  exit 1
fi

AUTH=(-H "X-API-Key: ${API_KEY}" -H "Content-Type: application/json")

PASS=0
FAIL=0

check() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS  $label (${actual})"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $label — expected ${expected}, got ${actual}"
    FAIL=$((FAIL + 1))
  fi
}

extract() {
  python3 -c "import json; d=json.load(open('$1')); print(d.get('$2',''))" 2>/dev/null || true
}

echo ""
echo "=== Backboard assistant/thread/message probe ==="
echo "Base URL: ${BASE_URL}"
echo ""

# ── 1. Create assistant (mirrors nash-user-* pattern) ──────────────────────────
echo "1. Creating assistant..."
status=$(curl -sS -o /tmp/bb_assistant.json -w "%{http_code}" \
  -X POST "${BASE_URL}/assistants" \
  "${AUTH[@]}" \
  -d '{"name":"nash-probe-test","system_prompt":"You are Nash, a helpful AI assistant."}')
check "POST /assistants" "200" "$status"
cat /tmp/bb_assistant.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_assistant.json
ASSISTANT_ID=$(extract /tmp/bb_assistant.json assistant_id)
echo "  assistant_id: ${ASSISTANT_ID}"
echo ""

if [[ -z "$ASSISTANT_ID" ]]; then
  echo "FATAL: Could not extract assistant_id — cannot continue"
  exit 1
fi

# ── 2. Create thread under that assistant ──────────────────────────────────────
echo "2. Creating thread under assistant..."
status=$(curl -sS -o /tmp/bb_thread.json -w "%{http_code}" \
  -X POST "${BASE_URL}/assistants/${ASSISTANT_ID}/threads" \
  "${AUTH[@]}" \
  -d '{}')
check "POST /assistants/{id}/threads" "200" "$status"
cat /tmp/bb_thread.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_thread.json
THREAD_ID=$(extract /tmp/bb_thread.json thread_id)
echo "  thread_id: ${THREAD_ID}"
echo ""

if [[ -z "$THREAD_ID" ]]; then
  echo "FATAL: Could not extract thread_id — cannot continue"
  exit 1
fi

# ── 3. Send a message with memory=Readonly (Nash default for Memory On) ────────
echo "3. Sending message with memory=Readonly..."
status=$(curl -sS -o /tmp/bb_msg_readonly.json -w "%{http_code}" \
  -X POST "${BASE_URL}/threads/${THREAD_ID}/messages" \
  "${AUTH[@]}" \
  -d '{"content":"What is my name?","stream":false,"memory":"Readonly"}')
echo "  HTTP status: ${status}"
cat /tmp/bb_msg_readonly.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_msg_readonly.json
check "POST /threads/{id}/messages (memory=Readonly)" "200" "$status"
echo ""

# ── 4. Send a message with memory=Auto ────────────────────────────────────────
echo "4. Sending message with memory=Auto..."
status=$(curl -sS -o /tmp/bb_msg_auto.json -w "%{http_code}" \
  -X POST "${BASE_URL}/threads/${THREAD_ID}/messages" \
  "${AUTH[@]}" \
  -d '{"content":"My name is Chris King. Remember that.","stream":false,"memory":"Auto"}')
echo "  HTTP status: ${status}"
cat /tmp/bb_msg_auto.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_msg_auto.json
check "POST /threads/{id}/messages (memory=Auto)" "200" "$status"
echo ""

# ── 5. Send a message with memory=off ─────────────────────────────────────────
echo "5. Sending message with memory=off..."
status=$(curl -sS -o /tmp/bb_msg_off.json -w "%{http_code}" \
  -X POST "${BASE_URL}/threads/${THREAD_ID}/messages" \
  "${AUTH[@]}" \
  -d '{"content":"Hello with memory off.","stream":false,"memory":"off"}')
echo "  HTTP status: ${status}"
cat /tmp/bb_msg_off.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_msg_off.json
check "POST /threads/{id}/messages (memory=off)" "200" "$status"
echo ""

# ── 6. Retrieve thread with messages ──────────────────────────────────────────
echo "6. Retrieving thread contents..."
status=$(curl -sS -o /tmp/bb_thread_full.json -w "%{http_code}" \
  -X GET "${BASE_URL}/threads/${THREAD_ID}" \
  "${AUTH[@]}")
check "GET /threads/{id}" "200" "$status"
echo "  Thread metadata + messages:"
cat /tmp/bb_thread_full.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_thread_full.json
echo ""

# ── 7. List memories on the assistant (what memory=Auto would have written) ───
echo "7. Listing memories on the assistant..."
status=$(curl -sS -o /tmp/bb_memories.json -w "%{http_code}" \
  -X GET "${BASE_URL}/assistants/${ASSISTANT_ID}/memories" \
  "${AUTH[@]}")
check "GET /assistants/{id}/memories" "200" "$status"
echo "  Memories:"
cat /tmp/bb_memories.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_memories.json
echo ""

# ── 8. Cleanup — delete the test assistant ────────────────────────────────────
echo "8. Cleaning up test assistant..."
status=$(curl -sS -o /tmp/bb_del.json -w "%{http_code}" \
  -X DELETE "${BASE_URL}/assistants/${ASSISTANT_ID}" \
  "${AUTH[@]}")
echo "  HTTP status: ${status} (non-200 is OK if DELETE is not supported)"
echo ""

# ── Summary ────────────────────────────────────────────────────────────────────
echo "============================================"
echo "  PASSED: ${PASS}"
echo "  FAILED: ${FAIL}"
echo "============================================"
[[ $FAIL -eq 0 ]]
