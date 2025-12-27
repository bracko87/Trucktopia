#!/usr/bin/env bash
#
# finance-idempotency-test.sh
#
# Bash script to test finance-apply idempotency using curl.
# Usage:
#   chmod +x finance-idempotency-test.sh
#   ./finance-idempotency-test.sh
#
ENDPOINT="https://www.trucktopia.org/.netlify/functions/finance-apply"
COMPANY_ID="<PASTE_COMPANY_ID_HERE>"
IDEMPOTENCY=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || python3 -c "import uuid; print(uuid.uuid4())")
BODY=$(jq -n --arg cid "$COMPANY_ID" --arg ik "$IDEMPOTENCY" '{ companyId: $cid, deltaCents: 10000, type: "income", description: "E2E idempotency test", idempotencyKey: $ik, meta: {} }')

echo "Idempotency key: $IDEMPOTENCY"
echo "Attempt 1..."
RESP1=$(curl -s -X POST "$ENDPOINT" -H "Content-Type: application/json" -d "$BODY")
echo "Response 1: $RESP1" | jq -C .

sleep 1

echo "Attempt 2..."
RESP2=$(curl -s -X POST "$ENDPOINT" -H "Content-Type: application/json" -d "$BODY")
echo "Response 2: $RESP2" | jq -C .

echo
echo "First transaction id: $(echo "$RESP1" | jq -r '.transaction.id')"
echo "Second transaction id: $(echo "$RESP2" | jq -r '.transaction.id')"
