#!/usr/bin/env bash
# Probes Backboard streaming: create assistant -> thread -> stream message -> read SSE
# Mirrors exactly how Nash calls add_message(stream=True, memory=Readonly/Auto/off)
set -euo pipefail

BASE_URL="https://app.backboard.io/api"
API_KEY="${BACKBOARD_API_KEY:-}"

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: BACKBOARD_API_KEY not set"
  exit 1
fi

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

stream_message() {
  local thread_id="$1" content="$2" memory="$3" outfile="$4"
  echo "  Sending: \"${content}\" (memory=${memory}, stream=true)"
  # curl reads SSE lines; we capture them all into outfile
  http_code=$(curl -sS -w "%{http_code}" -o "${outfile}" \
    -X POST "${BASE_URL}/threads/${thread_id}/messages" \
    -H "X-API-Key: ${API_KEY}" \
    -F "content=${content}" \
    -F "stream=true" \
    -F "memory=${memory}")
  echo "  HTTP status: ${http_code}"
  echo "  Raw SSE output:"
  cat "${outfile}"
  echo ""
  echo "$http_code"
}

echo ""
echo "=== Backboard streaming probe ==="
echo "Base URL: ${BASE_URL}"
echo ""

# ── 1. Create assistant ────────────────────────────────────────────────────────
echo "1. Creating assistant..."
status=$(curl -sS -o /tmp/bb_s_assistant.json -w "%{http_code}" \
  -X POST "${BASE_URL}/assistants" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"name":"nash-stream-probe","system_prompt":"You are Nash, a helpful AI assistant. Be concise."}')
check "POST /assistants" "200" "$status"
cat /tmp/bb_s_assistant.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_s_assistant.json
ASSISTANT_ID=$(extract /tmp/bb_s_assistant.json assistant_id)
echo "  assistant_id: ${ASSISTANT_ID}"
echo ""

if [[ -z "$ASSISTANT_ID" ]]; then
  echo "FATAL: no assistant_id"; exit 1
fi

# ── 2. Create thread ───────────────────────────────────────────────────────────
echo "2. Creating thread..."
status=$(curl -sS -o /tmp/bb_s_thread.json -w "%{http_code}" \
  -X POST "${BASE_URL}/assistants/${ASSISTANT_ID}/threads" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{}')
check "POST /assistants/{id}/threads" "200" "$status"
THREAD_ID=$(extract /tmp/bb_s_thread.json thread_id)
echo "  thread_id: ${THREAD_ID}"
echo ""

if [[ -z "$THREAD_ID" ]]; then
  echo "FATAL: no thread_id"; exit 1
fi

# ── 3. Stream with memory=Readonly ────────────────────────────────────────────
echo "3. Stream message — memory=Readonly (Nash 'Memory On' mode)..."
code=$(stream_message "$THREAD_ID" "What is my name?" "Readonly" /tmp/bb_stream_readonly.txt)
check "POST /threads/{id}/messages stream=true memory=Readonly" "200" "$code"

# ── 4. Stream with memory=Auto ────────────────────────────────────────────────
echo "4. Stream message — memory=Auto..."
code=$(stream_message "$THREAD_ID" "My name is Chris King. Remember that." "Auto" /tmp/bb_stream_auto.txt)
check "POST /threads/{id}/messages stream=true memory=Auto" "200" "$code"

# ── 5. Stream with memory=off ─────────────────────────────────────────────────
echo "5. Stream message — memory=off..."
code=$(stream_message "$THREAD_ID" "Hello." "off" /tmp/bb_stream_off.txt)
check "POST /threads/{id}/messages stream=true memory=off" "200" "$code"

# ── 6. Now test with the REAL bbAssistantId used by Nash ──────────────────────
# Pull from env if set, otherwise skip
BB_ASSISTANT_ID="${BB_PERSONAL_ASSISTANT_ID:-}"
if [[ -n "$BB_ASSISTANT_ID" ]]; then
  echo "6. Testing real Nash personal assistant (bbAssistantId=${BB_ASSISTANT_ID})..."
  status=$(curl -sS -o /tmp/bb_s_real_thread.json -w "%{http_code}" \
    -X POST "${BASE_URL}/assistants/${BB_ASSISTANT_ID}/threads" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d '{}')
  check "POST /assistants/bbAssistantId/threads" "200" "$status"
  REAL_THREAD_ID=$(extract /tmp/bb_s_real_thread.json thread_id)
  echo "  thread_id: ${REAL_THREAD_ID}"

  if [[ -n "$REAL_THREAD_ID" ]]; then
    code=$(stream_message "$REAL_THREAD_ID" "What is my name?" "Readonly" /tmp/bb_stream_real.txt)
    check "POST /threads/{real}/messages stream=true memory=Readonly" "200" "$code"
  fi
else
  echo "6. Skipping real-assistant test (set BB_PERSONAL_ASSISTANT_ID=<id> to enable)"
fi
echo ""

# ── 7. Cleanup ─────────────────────────────────────────────────────────────────
echo "7. Cleanup..."
curl -sS -o /dev/null -w "  DELETE /assistants status: %{http_code}\n" \
  -X DELETE "${BASE_URL}/assistants/${ASSISTANT_ID}" \
  -H "X-API-Key: ${API_KEY}" || true
echo ""

echo "============================================"
echo "  PASSED: ${PASS}"
echo "  FAILED: ${FAIL}"
echo "============================================"
[[ $FAIL -eq 0 ]]
