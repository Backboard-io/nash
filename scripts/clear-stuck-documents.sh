#!/usr/bin/env bash
# Lists and optionally deletes PROCESSING-state documents on an assistant.
#
# SAFETY:
#   Default mode is DRY RUN — prints what would be deleted, does nothing.
#   Pass --delete to actually delete.
#   Only targets documents with status "processing" (not "indexed").
#
# Usage:
#   # Dry run (safe, default):
#   BACKBOARD_API_KEY=... ASSISTANT_ID=31a05cda-... bash scripts/clear-stuck-documents.sh
#
#   # Actually delete stuck docs:
#   BACKBOARD_API_KEY=... ASSISTANT_ID=31a05cda-... bash scripts/clear-stuck-documents.sh --delete
set -euo pipefail

BASE_URL="https://app.backboard.io/api"
API_KEY="${BACKBOARD_API_KEY:-}"
ASSISTANT_ID="${ASSISTANT_ID:-}"
DELETE_MODE=false

for arg in "$@"; do
  [[ "$arg" == "--delete" ]] && DELETE_MODE=true
done

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: BACKBOARD_API_KEY not set"; exit 1
fi
if [[ -z "$ASSISTANT_ID" ]]; then
  echo "ERROR: ASSISTANT_ID not set"; exit 1
fi

echo ""
echo "=== Stuck document cleanup ==="
echo "  Assistant : ${ASSISTANT_ID}"
echo "  Mode      : $([ "$DELETE_MODE" = true ] && echo '*** DELETE ***' || echo 'DRY RUN (safe)')"
echo "  Base URL  : ${BASE_URL}"
echo ""

# ── 1. List all documents on the assistant ─────────────────────────────────────
echo "Fetching documents..."
http_code=$(curl -sS -o /tmp/bb_docs.json -w "%{http_code}" \
  -X GET "${BASE_URL}/assistants/${ASSISTANT_ID}/documents" \
  -H "X-API-Key: ${API_KEY}")

if [[ "$http_code" != "200" ]]; then
  echo "ERROR: GET /assistants/{id}/documents returned ${http_code}"
  cat /tmp/bb_docs.json
  exit 1
fi

echo "Raw document list:"
cat /tmp/bb_docs.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_docs.json
echo ""

# ── 2. Extract stuck (processing) document IDs ────────────────────────────────
echo "Extracting stuck documents (status=processing)..."
python3 - <<'PYEOF'
import json, sys

with open('/tmp/bb_docs.json') as f:
    data = json.load(f)

# Handle both list and {documents: [...]} response shapes
docs = data if isinstance(data, list) else data.get('documents', [])

stuck = [d for d in docs if str(d.get('status', '')).lower() == 'processing']
indexed = [d for d in docs if str(d.get('status', '')).lower() == 'indexed']
other = [d for d in docs if d not in stuck and d not in indexed]

print(f"  Total documents : {len(docs)}")
print(f"  Indexed         : {len(indexed)}")
print(f"  Processing/stuck: {len(stuck)}")
print(f"  Other status    : {len(other)}")
print()

if not stuck:
    print("No stuck documents found — nothing to do.")
    sys.exit(0)

print("Stuck documents:")
for d in stuck:
    doc_id = d.get('document_id') or d.get('id', '?')
    name = d.get('filename') or d.get('name', '?')
    status = d.get('status', '?')
    print(f"  {doc_id}  {name}  ({status})")

# Write IDs to a file for the shell loop
with open('/tmp/bb_stuck_ids.txt', 'w') as f:
    for d in stuck:
        doc_id = d.get('document_id') or d.get('id', '')
        if doc_id:
            f.write(doc_id + '\n')
PYEOF

echo ""

# ── 3. Delete stuck docs (only if --delete passed) ────────────────────────────
if [[ ! -f /tmp/bb_stuck_ids.txt ]]; then
  echo "No stuck document IDs to process."
  exit 0
fi

stuck_count=$(wc -l < /tmp/bb_stuck_ids.txt | tr -d ' ')

if [[ "$stuck_count" -eq 0 ]]; then
  echo "No stuck documents found — nothing to do."
  exit 0
fi

if [[ "$DELETE_MODE" != true ]]; then
  echo "DRY RUN: Would delete ${stuck_count} stuck document(s)."
  echo "Re-run with --delete to actually remove them."
  echo ""
  echo "Command:"
  echo "  BACKBOARD_API_KEY=\$BACKBOARD_API_KEY ASSISTANT_ID=${ASSISTANT_ID} bash scripts/clear-stuck-documents.sh --delete"
  exit 0
fi

echo "*** DELETING ${stuck_count} stuck document(s) ***"
deleted=0
failed=0

while IFS= read -r doc_id; do
  [[ -z "$doc_id" ]] && continue
  http_code=$(curl -sS -o /tmp/bb_del_doc.json -w "%{http_code}" \
    -X DELETE "${BASE_URL}/documents/${doc_id}" \
    -H "X-API-Key: ${API_KEY}")
  if [[ "$http_code" == "200" || "$http_code" == "204" ]]; then
    echo "  DELETED  ${doc_id} (HTTP ${http_code})"
    deleted=$((deleted + 1))
  else
    echo "  FAILED   ${doc_id} (HTTP ${http_code})"
    cat /tmp/bb_del_doc.json 2>/dev/null || true
    failed=$((failed + 1))
  fi
done < /tmp/bb_stuck_ids.txt

echo ""
echo "  Deleted : ${deleted}"
echo "  Failed  : ${failed}"

# ── 4. Verify: re-list documents to confirm ───────────────────────────────────
echo ""
echo "Verifying — re-fetching documents..."
http_code=$(curl -sS -o /tmp/bb_docs_after.json -w "%{http_code}" \
  -X GET "${BASE_URL}/assistants/${ASSISTANT_ID}/documents" \
  -H "X-API-Key: ${API_KEY}")
cat /tmp/bb_docs_after.json | python3 -m json.tool 2>/dev/null || cat /tmp/bb_docs_after.json

echo ""
[[ $failed -eq 0 ]]
