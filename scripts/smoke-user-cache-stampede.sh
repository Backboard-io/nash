#!/usr/bin/env bash
# Smoke test: user-cache stampede resilience.
#
# The bug: when _user_cache TTL expires, N concurrent requests all call
# _load_users_from_backboard() simultaneously, flooding the shared async
# event loop.  With a 30s run_async timeout each queued coroutine fires
# TimeoutError before it is scheduled -> HTTP 500 on every route.
#
# This test fires a burst of concurrent requests across the affected
# endpoints and asserts all return 200 within budget.
#
# Usage:
#   export REFRESH_TOKEN=<cookie-value>   # preferred
#   export JWT_TOKEN=<bearer-token>       # or use JWT directly
#   export BASE_URL=https://nash.backboard.io
#   ./scripts/smoke-user-cache-stampede.sh
#
# Tuning:
#   CONCURRENCY=20     number of parallel requests in each wave
#   WAVES=3            number of waves to fire
#   REQ_TIMEOUT=20     per-request curl max-time in seconds
#   MAX_FAIL_PCT=0     % of failures tolerated (0 = all must pass)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ -f ".env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source ".env"
  set +a
fi

BASE_URL="${BASE_URL:-http://localhost:3080}"
JWT_TOKEN="${JWT_TOKEN:-}"
REFRESH_TOKEN="${REFRESH_TOKEN:-}"
CONCURRENCY="${CONCURRENCY:-20}"
WAVES="${WAVES:-3}"
REQ_TIMEOUT="${REQ_TIMEOUT:-20}"
MAX_FAIL_PCT="${MAX_FAIL_PCT:-0}"

WORK_DIR="/tmp/nash-stampede-$$"
mkdir -p "${WORK_DIR}"
cleanup() { rm -rf "${WORK_DIR}"; }
trap cleanup EXIT

# ── Auth ──────────────────────────────────────────────────────────────────────
_refresh_jwt() {
  local raw tok
  raw="$(curl -sS --max-time 8 \
    -H "Cookie: refreshToken=${REFRESH_TOKEN}" \
    "${BASE_URL}/api/auth/refresh" 2>/dev/null || true)"
  tok="$(echo "${raw}" | sed -n 's/.*"token"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"
  [[ -n "${tok}" ]] && JWT_TOKEN="${tok}"
}

if [[ -z "${JWT_TOKEN}" && -n "${REFRESH_TOKEN}" ]]; then
  echo "Refreshing JWT from REFRESH_TOKEN..."
  _refresh_jwt
fi

if [[ -z "${JWT_TOKEN}" ]]; then
  echo "ERROR: set JWT_TOKEN or REFRESH_TOKEN before running."
  exit 1
fi

echo "Nash user-cache stampede smoke test"
echo "  BASE_URL    : ${BASE_URL}"
echo "  CONCURRENCY : ${CONCURRENCY} concurrent requests per wave"
echo "  WAVES       : ${WAVES}"
echo "  REQ_TIMEOUT : ${REQ_TIMEOUT}s per request"
echo "  MAX_FAIL_PCT: ${MAX_FAIL_PCT}%"
echo ""

# ── Health gate ───────────────────────────────────────────────────────────────
hs="$(curl -sS --max-time 5 -o /dev/null -w "%{http_code}" "${BASE_URL}/health" 2>/dev/null || true)"
if [[ "${hs}" != "200" ]]; then
  echo "FAIL: /health returned ${hs} — server is not up"
  exit 1
fi
echo "PASS: /health → 200"
echo ""

# ── Endpoints under test (all call find_user_by_id internally) ────────────────
# These are the routes that were 500ing during the stampede incident.
ENDPOINTS=(
  "/api/init"
  "/api/convos"
  "/api/balance"
  "/api/billing/subscription"
)

# ── Single request worker ─────────────────────────────────────────────────────
_req() {
  local idx="$1" endpoint="$2"
  local body="${WORK_DIR}/resp-${idx}.json"
  local t0 t1 elapsed_ms status

  t0="$(perl -MTime::HiRes=time -e 'printf "%d", time()*1000')"
  status="$(curl -sS --max-time "${REQ_TIMEOUT}" \
    -o "${body}" -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT_TOKEN}" \
    "${BASE_URL}${endpoint}" 2>/dev/null || echo "000")"
  t1="$(perl -MTime::HiRes=time -e 'printf "%d", time()*1000')"
  elapsed_ms=$(( t1 - t0 ))

  echo "${status} ${elapsed_ms} ${endpoint}" >> "${WORK_DIR}/results.txt"

  if [[ "${status}" != "200" ]]; then
    echo "  FAIL [#${idx}] ${endpoint} → HTTP ${status} (${elapsed_ms}ms)"
    head -c 200 "${body}" 2>/dev/null || true
    echo ""
    return 1
  fi
  echo "  ok   [#${idx}] ${endpoint} → 200 (${elapsed_ms}ms)"
  return 0
}

# ── Fire waves ────────────────────────────────────────────────────────────────
total=0
total_fail=0
ep_count="${#ENDPOINTS[@]}"

for wave in $(seq 1 "${WAVES}"); do
  echo "── Wave ${wave}/${WAVES}: ${CONCURRENCY} concurrent requests ──────────────"
  pids=()
  > "${WORK_DIR}/results.txt"

  for i in $(seq 1 "${CONCURRENCY}"); do
    ep_idx=$(( (i - 1) % ep_count ))
    ep="${ENDPOINTS[${ep_idx}]}"
    _req "${i}" "${ep}" &
    pids+=("$!")
  done

  wave_fail=0
  for pid in "${pids[@]}"; do
    if ! wait "${pid}"; then
      wave_fail=$(( wave_fail + 1 ))
    fi
  done

  # Timing summary for this wave
  if [[ -s "${WORK_DIR}/results.txt" ]]; then
    max_ms="$(awk '{print $2}' "${WORK_DIR}/results.txt" | sort -n | tail -1)"
    min_ms="$(awk '{print $2}' "${WORK_DIR}/results.txt" | sort -n | head -1)"
    ok_n="$(grep -c '^200 ' "${WORK_DIR}/results.txt" || true)"
    fail_n="$(grep -cv '^200 ' "${WORK_DIR}/results.txt" || true)"
    echo "  wave ${wave} summary: ok=${ok_n} fail=${fail_n} min=${min_ms}ms max=${max_ms}ms"
    if [[ "${max_ms}" -ge $(( REQ_TIMEOUT * 900 )) ]]; then
      echo "  WARN: max response time ${max_ms}ms is near the ${REQ_TIMEOUT}s timeout — stampede likely"
    fi
  fi

  total=$(( total + CONCURRENCY ))
  total_fail=$(( total_fail + wave_fail ))
  echo ""
done

# ── Final verdict ─────────────────────────────────────────────────────────────
total_ok=$(( total - total_fail ))
fail_pct=$(( total_fail * 100 / total ))

echo "════════════════════════════════════"
echo "Total requests : ${total}"
echo "Passed (200)   : ${total_ok}"
echo "Failed         : ${total_fail} (${fail_pct}%)"
echo "════════════════════════════════════"

if [[ "${fail_pct}" -gt "${MAX_FAIL_PCT}" ]]; then
  echo "FAIL: ${fail_pct}% failure rate exceeds MAX_FAIL_PCT=${MAX_FAIL_PCT}%"
  echo "      This indicates user-cache stampede → TimeoutError on _load_users_from_backboard"
  exit 1
fi

echo "PASS: stampede smoke test — all requests within tolerance"
