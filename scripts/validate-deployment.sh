#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Get API URL from command line or file
if [ ! -z "$1" ]; then
    API_URL="$1"
elif [ -f .app-url ]; then
    API_URL=$(cat .app-url)
else
    print_message "$RED" "Error: No API URL provided"
    echo "Usage: $0 <api-url>"
    echo "Or run ./scripts/deploy.sh first to generate .app-url file"
    exit 1
fi

# Remove trailing slash if present
API_URL=${API_URL%/}

print_message "$BLUE" "========================================="
print_message "$BLUE" "   Validating Lectio API Deployment"
print_message "$BLUE" "========================================="
print_message "$YELLOW" "API URL: $API_URL"
echo ""

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    print_message "$YELLOW" "Testing: $description"
    print_message "$BLUE" "  $method $API_URL$endpoint"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$API_URL$endpoint")
    
    if [ "$response" -eq "$expected_status" ]; then
        print_message "$GREEN" "  ✓ Passed (HTTP $response)"
        ((TESTS_PASSED++))
        return 0
    else
        print_message "$RED" "  ✗ Failed (Expected: $expected_status, Got: $response)"
        ((TESTS_FAILED++))
        return 1
    fi
    echo ""
}

# Function to test endpoint with data validation
test_endpoint_json() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    local json_check=$5
    
    print_message "$YELLOW" "Testing: $description"
    print_message "$BLUE" "  $method $API_URL$endpoint"
    
    response=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq "$expected_status" ]; then
        print_message "$GREEN" "  ✓ Status check passed (HTTP $http_code)"
        
        # Validate JSON if check provided
        if [ ! -z "$json_check" ]; then
            if echo "$body" | grep -q "$json_check"; then
                print_message "$GREEN" "  ✓ Response validation passed"
                ((TESTS_PASSED++))
            else
                print_message "$RED" "  ✗ Response validation failed (missing: $json_check)"
                ((TESTS_FAILED++))
            fi
        else
            ((TESTS_PASSED++))
        fi
    else
        print_message "$RED" "  ✗ Failed (Expected: $expected_status, Got: $http_code)"
        ((TESTS_FAILED++))
    fi
    echo ""
}

# Start tests
print_message "$BLUE" "1. Health Check Tests"
print_message "$BLUE" "---------------------"
test_endpoint_json "GET" "/health" 200 "Health endpoint" '"status":"healthy"'

print_message "$BLUE" "2. API Documentation Tests"
print_message "$BLUE" "--------------------------"
test_endpoint "GET" "/api/docs" 200 "Swagger UI"
test_endpoint_json "GET" "/api/docs.json" 200 "OpenAPI spec" '"openapi"'

print_message "$BLUE" "3. Core API Endpoints Tests"
print_message "$BLUE" "---------------------------"
test_endpoint_json "GET" "/api/v1/traditions" 200 "List traditions" '\['
test_endpoint_json "GET" "/api/v1/readings/today" 200 "Today's readings" '"date"'
test_endpoint_json "GET" "/api/v1/calendar/current" 200 "Current calendar" '"season"'

print_message "$BLUE" "4. Error Handling Tests"
print_message "$BLUE" "-----------------------"
test_endpoint "GET" "/api/v1/invalid-endpoint" 404 "404 Not Found"
test_endpoint "GET" "/api/v1/traditions/999999" 404 "Non-existent resource"

print_message "$BLUE" "5. Performance Tests"
print_message "$BLUE" "--------------------"
start_time=$(date +%s%N)
curl -s -o /dev/null "$API_URL/health"
end_time=$(date +%s%N)
response_time=$((($end_time - $start_time) / 1000000))

if [ $response_time -lt 1000 ]; then
    print_message "$GREEN" "  ✓ Response time: ${response_time}ms (< 1s)"
    ((TESTS_PASSED++))
else
    print_message "$RED" "  ✗ Response time: ${response_time}ms (> 1s)"
    ((TESTS_FAILED++))
fi

echo ""
print_message "$BLUE" "========================================="
print_message "$BLUE" "           Test Summary"
print_message "$BLUE" "========================================="
print_message "$GREEN" "Tests Passed: $TESTS_PASSED"
if [ $TESTS_FAILED -gt 0 ]; then
    print_message "$RED" "Tests Failed: $TESTS_FAILED"
else
    print_message "$GREEN" "Tests Failed: $TESTS_FAILED"
fi

echo ""
if [ $TESTS_FAILED -eq 0 ]; then
    print_message "$GREEN" "🎉 All tests passed! The API is working correctly."
    exit 0
else
    print_message "$RED" "⚠️  Some tests failed. Please review the deployment."
    exit 1
fi