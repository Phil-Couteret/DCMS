#!/bin/bash

# Script to create a partner account via the DCMS API
# Usage: ./create-partner.sh

API_URL="${API_URL:-http://localhost:3003/api/partners}"

echo "Creating partner account..."
echo ""

# Prompt for required fields
read -p "Partner Name: " PARTNER_NAME
read -p "Company Name: " COMPANY_NAME
read -p "Contact Email: " CONTACT_EMAIL
read -p "Contact Phone (optional): " CONTACT_PHONE
read -p "Commission Rate (e.g., 0.10 for 10%, optional): " COMMISSION_RATE
read -p "Location IDs (comma-separated, optional. Available: 550e8400-e29b-41d4-a716-446655440001, 550e8400-e29b-41d4-a716-446655440002): " LOCATION_IDS

# Build JSON payload
JSON_PAYLOAD="{"
JSON_PAYLOAD+="\"name\":\"$PARTNER_NAME\","
JSON_PAYLOAD+="\"companyName\":\"$COMPANY_NAME\","
JSON_PAYLOAD+="\"contactEmail\":\"$CONTACT_EMAIL\""

if [ ! -z "$CONTACT_PHONE" ]; then
  JSON_PAYLOAD+=",\"contactPhone\":\"$CONTACT_PHONE\""
fi

if [ ! -z "$COMMISSION_RATE" ]; then
  JSON_PAYLOAD+=",\"commissionRate\":$COMMISSION_RATE"
fi

if [ ! -z "$LOCATION_IDS" ]; then
  # Convert comma-separated to JSON array
  LOCATION_ARRAY="["
  IFS=',' read -ra LOCS <<< "$LOCATION_IDS"
  for i in "${!LOCS[@]}"; do
    if [ $i -gt 0 ]; then
      LOCATION_ARRAY+=","
    fi
    LOCATION_ARRAY+="\"${LOCS[$i]}\""
  done
  LOCATION_ARRAY+="]"
  JSON_PAYLOAD+=",\"allowedLocations\":$LOCATION_ARRAY"
fi

JSON_PAYLOAD+="}"

echo ""
echo "Creating partner with payload:"
echo "$JSON_PAYLOAD" | python3 -m json.tool 2>/dev/null || echo "$JSON_PAYLOAD"
echo ""

# Make the API call
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 201 ] || [ "$HTTP_CODE" -eq 200 ]; then
  echo "✅ Partner created successfully!"
  echo ""
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  echo ""
  echo "⚠️  IMPORTANT: Save the 'apiSecret' from the response above!"
  echo "   It will only be shown once."
else
  echo "❌ Error creating partner (HTTP $HTTP_CODE)"
  echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
  exit 1
fi

