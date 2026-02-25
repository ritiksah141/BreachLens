#!/bin/bash
# generate_newman_report.sh - Generate Newman HTML report for BreachLens
# Usage: ./generate_newman_report.sh

set -e  # Exit on error

echo "🚀 BreachLens Newman Report Generator"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if newman is installed
if ! command -v newman &> /dev/null; then
    echo -e "${RED}❌ Newman is not installed${NC}"
    echo "Install with: npm install -g newman newman-reporter-htmlextra"
    exit 1
fi

echo -e "${GREEN}✓ Newman is installed${NC}"

# Check if newman-reporter-htmlextra is installed
if ! npm list -g newman-reporter-htmlextra &> /dev/null; then
    echo -e "${YELLOW}⚠ newman-reporter-htmlextra not found, installing...${NC}"
    if ! npm install -g newman-reporter-htmlextra; then
        echo -e "${RED}❌ Failed to install newman-reporter-htmlextra${NC}"
        echo "Try running: sudo npm install -g newman-reporter-htmlextra"
        exit 1
    fi
fi

echo -e "${GREEN}✓ Newman HTML reporter is installed${NC}"
echo ""

# Navigate to backend directory
cd "$(dirname "$0")"
BACKEND_DIR="$(pwd)"
PROJECT_ROOT="$(dirname "$BACKEND_DIR")"

echo "📂 Backend directory: $BACKEND_DIR"
echo "📂 Project root: $PROJECT_ROOT"
echo ""
    if [ -f "$BACKEND_DIR/.env" ]; then
        # Source only MONGO_URI from .env, handling quotes
        MONGO_URI=$(grep -E '^MONGO_URI=' "$BACKEND_DIR/.env" | head -1 | cut -d'=' -f2- | sed 's/^["'\'']\|["'\'']$//g')
        export MONGO_URI
    fi
    echo -e "${YELLOW}⚠ MONGO_URI not set in environment, will use .env file${NC}"
    if [ -f "$BACKEND_DIR/.env" ]; then
        export $(cat "$BACKEND_DIR/.env" | grep MONGO_URI | xargs)
    fi
fi

# Start Flask API in background
echo "🔧 Starting Flask API..."
source "$PROJECT_ROOT/venv/bin/activate"

# Check if MongoDB is reachable before starting API
echo "🔍 Checking MongoDB connection..."
python3 << EOF || MONGO_CHECK_FAILED=1
import sys
import os
from pymongo import MongoClient
from urllib.parse import urlparse

mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/breachlens')
try:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    client.server_info()  # Force connection
    print("✓ MongoDB is accessible")
    sys.exit(0)
except Exception as e:
    print(f"❌ MongoDB connection failed: {e}")
    print(f"   URI: {urlparse(mongo_uri).netloc}")
    sys.exit(1)
EOF

if [ "${MONGO_CHECK_FAILED:-0}" -eq 1 ]; then
    echo -e "${RED}Cannot proceed without MongoDB${NC}"
    exit 1
fi

# Start Flask
python "$BACKEND_DIR/run.py" > "$BACKEND_DIR/api_output.log" 2>&1 &
API_PID=$!

echo "🔧 Flask API started (PID: $API_PID)"
echo "📝 Logs: $BACKEND_DIR/api_output.log"

# Wait for API to be ready
echo "⏳ Waiting for API to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:5001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ API is ready!${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}❌ API failed to start after 30 seconds${NC}"
        echo "Check logs: $BACKEND_DIR/api_output.log"
        kill $API_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo ""

# Update Postman environment with credentials from seed data
echo "🔐 Setting up Postman environment..."
TEMP_ENV=$(mktemp)
cat "$BACKEND_DIR/postman/BreachLens.postman_environment.json" | \
    sed 's|"value": "<your-admin-email>"|"value": "admin@breachlens.io"|' | \
    sed 's|"value": "<your-admin-password>"|"value": "Admin@123"|' | \
    sed 's|"value": "<your-analyst-email>"|"value": "priya@breachlens.io"|' | \
    sed 's|"value": "<your-analyst-password>"|"value": "Analyst@123"|' \
    > "$TEMP_ENV"

echo -e "${GREEN}✓ Environment configured (using seed data credentials)${NC}"
echo ""

# Run Newman
echo "🧪 Running Newman collection..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

EVIDENCE_DIR="$PROJECT_ROOT/evidence/backend"
mkdir -p "$EVIDENCE_DIR"

newman run "$BACKEND_DIR/postman/BreachLens.postman_collection.json" \
    --environment "$TEMP_ENV" \
    --reporters cli,htmlextra \
    --reporter-htmlextra-export "$EVIDENCE_DIR/newman-report.html" \
    --reporter-htmlextra-title "BreachLens API Test Report - COM661 CW1" \
    --reporter-htmlextra-darkTheme \
    --timeout-request 10000 \
    --delay-request 100

# Capture Newman's actual exit code (don't use || true which masks failures)
NEWMAN_EXIT_CODE=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Cleanup
rm "$TEMP_ENV"
kill $API_PID 2>/dev/null || true

if [ $NEWMAN_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Newman tests completed successfully!${NC}"
    echo ""
    echo "📊 Report generated:"
    echo "   $EVIDENCE_DIR/newman-report.html"
    echo ""
    echo "📸 Next steps for submission:"
    echo "   1. Open the Newman report in your browser"
    echo "   2. Take screenshot of collection structure in Postman UI"
    echo "   3. Take screenshot of Collection Runner (all green checks)"
    echo ""
    echo -e "${GREEN}✨ Ready for CW1 submission!${NC}"
else
    echo -e "${RED}❌ Some Newman tests failed (exit code: $NEWMAN_EXIT_CODE)${NC}"
    echo "   This may be expected if database is not seeded or some endpoints require data"
    echo "   Report still generated at: $EVIDENCE_DIR/newman-report.html"
    exit 1
fi
