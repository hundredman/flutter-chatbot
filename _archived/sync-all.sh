#!/bin/bash

# Flutter Chatbot - GitHub Full Sync Script
# This script runs the GitHub sync in batches until completion

FUNCTION_URL="https://rungithubsync-yt3kigee5a-uc.a.run.app"
BATCH_SIZE=3
MAX_ITERATIONS=300

echo "🚀 Starting GitHub Full Sync..."
echo "Target: 730 files"
echo "Batch size: $BATCH_SIZE files per run"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

for i in $(seq 1 $MAX_ITERATIONS); do
  echo "[$i] Running batch..."

  RESPONSE=$(curl -s -X POST "$FUNCTION_URL" \
    -H "Content-Type: application/json" \
    -d "{\"batchSize\": $BATCH_SIZE}" \
    --max-time 540)

  # Parse response
  SUCCESS=$(echo $RESPONSE | grep -o '"success":true' || echo "")
  IS_COMPLETE=$(echo $RESPONSE | grep -o '"isComplete":true' || echo "")
  COMPLETED=$(echo $RESPONSE | grep -o '"completed":[0-9]*' | grep -o '[0-9]*' || echo "0")
  TOTAL=$(echo $RESPONSE | grep -o '"total":[0-9]*' | grep -o '[0-9]*' || echo "730")
  PERCENTAGE=$(echo $RESPONSE | grep -o '"percentage":[0-9]*' | grep -o '[0-9]*' || echo "0")

  if [ -z "$SUCCESS" ]; then
    echo "❌ Batch failed. Response:"
    echo "$RESPONSE"
    echo ""
    echo "Retrying in 5 seconds..."
    sleep 5
    continue
  fi

  echo "✓ Progress: $COMPLETED/$TOTAL files ($PERCENTAGE%)"
  echo ""

  if [ -n "$IS_COMPLETE" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🎉 Sync Complete!"
    echo "Total files processed: $COMPLETED"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    exit 0
  fi

  # Wait between batches to avoid rate limits
  sleep 3
done

echo "⚠️  Reached max iterations ($MAX_ITERATIONS)"
echo "Current progress: $COMPLETED/$TOTAL"
