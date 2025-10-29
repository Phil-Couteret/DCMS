#!/bin/bash

# Verification Script for DCMS Anonymization
# Checks for remaining business-specific references

echo "🔍 DCMS Anonymization Verification Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track issues
ISSUES=0

# Function to search for patterns
check_pattern() {
    local pattern=$1
    local description=$2
    local count=$(grep -r -i "$pattern" . --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=build --exclude-dir=dist --exclude="*.log" --exclude="verify-anonymization.sh" 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$count" -gt 0 ]; then
        echo -e "${RED}✗${NC} Found $count instances of: $description"
        echo "   Pattern: $pattern"
        ISSUES=$((ISSUES + 1))
        return 1
    else
        echo -e "${GREEN}✓${NC} No instances found: $description"
        return 0
    fi
}

echo "Checking for business-specific references..."
echo ""

# Check for business name
check_pattern "Deep Blue" "Deep Blue Diving business name"

# Check for location names
check_pattern "Fuerteventura" "Fuerteventura location"
check_pattern "Caleta de Fuste" "Caleta de Fuste location"
check_pattern "Las Playitas" "Las Playitas location"

# Check for business emails
check_pattern "deep-blue-diving.com" "Deep Blue Diving email domain"
check_pattern "@deep-blue-diving" "Deep Blue Diving email addresses"

# Check for business phone numbers
check_pattern "\+34 928 163" "Deep Blue Diving phone numbers"
check_pattern "\+34 606 275" "Deep Blue Diving mobile numbers"
check_pattern "\+34 653 512" "Las Playitas phone numbers"

# Check for specific addresses
check_pattern "Muelle Deportivo" "Specific street address"
check_pattern "Calle Teneriffe" "Specific street address"
check_pattern "Hotel Gran Resort Las Playitas" "Specific location address"

# Check for postal codes
check_pattern "35610" "Fuerteventura postal code"

# Check for dive site names (if they're specific)
check_pattern "Castillo Reef" "Castillo Reef dive site"
check_pattern "Salinas Reef" "Salinas Reef dive site"
check_pattern "Nuevo Horizonte" "Nuevo Horizonte dive site"

echo ""
echo "=========================================="

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed! No business-specific references found.${NC}"
    exit 0
else
    echo -e "${RED}❌ Found $ISSUES issue(s). Please review and anonymize remaining references.${NC}"
    echo ""
    echo "To see detailed results, run:"
    echo "  grep -r -i 'pattern' . --exclude-dir=node_modules --exclude-dir=.git"
    exit 1
fi

