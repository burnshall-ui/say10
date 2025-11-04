#!/bin/bash

# AI Server Admin MCP - Basic Test Script
# Tests the basic functionality without requiring full Ollama setup

set -e

echo "🧪 AI Server Admin MCP - Test Suite"
echo "===================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test Counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Test Function
test_command() {
    TESTS_TOTAL=$((TESTS_TOTAL + 1))
    local test_name="$1"
    local command="$2"
    
    echo -n "Test $TESTS_TOTAL: $test_name ... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Check Prerequisites
echo "📋 Checking Prerequisites..."
echo ""

test_command "Node.js installed" "command -v node"
test_command "npm installed" "command -v npm"
test_command "TypeScript files exist" "test -f src/index.ts"
test_command "Config exists" "test -f config/whitelist.json"

echo ""
echo "📦 Checking Dependencies..."
echo ""

test_command "node_modules exists" "test -d node_modules"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installing dependencies...${NC}"
    npm install
fi

echo ""
echo "🔨 Building Project..."
echo ""

test_command "TypeScript compiles" "npm run build"

echo ""
echo "🧩 Testing Modules..."
echo ""

# Test individual modules can be imported
test_command "Types module loads" "node -e \"import('./dist/src/types.js')\""
test_command "Whitelist module loads" "node -e \"import('./dist/src/safety/whitelist.js')\""
test_command "Approval module loads" "node -e \"import('./dist/src/safety/approval.js')\""

echo ""
echo "🔧 Testing MCP Tools..."
echo ""

# Create a simple test script for monitoring tools
cat > test-monitoring.mjs << 'EOF'
import { getMonitoringTools, handleMonitoringTool } from './dist/src/tools/monitoring.js';

const tools = getMonitoringTools();
console.log(`Found ${tools.length} monitoring tools`);

if (tools.length !== 4) {
    process.exit(1);
}

// Test system_status tool
try {
    const result = await handleMonitoringTool('system_status', {});
    if (result.content && result.content[0].text) {
        console.log('system_status tool works');
        process.exit(0);
    }
} catch (error) {
    console.error('Error:', error);
    process.exit(1);
}
EOF

test_command "Monitoring tools work" "node test-monitoring.mjs"
rm -f test-monitoring.mjs

# Test log tools
cat > test-logs.mjs << 'EOF'
import { getLogTools } from './dist/src/tools/logs.js';

const tools = getLogTools();
console.log(`Found ${tools.length} log tools`);

if (tools.length !== 4) {
    process.exit(1);
}
process.exit(0);
EOF

test_command "Log tools load" "node test-logs.mjs"
rm -f test-logs.mjs

# Test service tools
cat > test-services.mjs << 'EOF'
import { getServiceTools } from './dist/src/tools/services.js';

const tools = getServiceTools();
console.log(`Found ${tools.length} service tools`);

if (tools.length !== 5) {
    process.exit(1);
}
process.exit(0);
EOF

test_command "Service tools load" "node test-services.mjs"
rm -f test-services.mjs

echo ""
echo "🔒 Testing Safety System..."
echo ""

# Test whitelist
cat > test-whitelist.mjs << 'EOF'
import { isWhitelisted, isReadOnly } from './dist/src/safety/whitelist.js';

// Test whitelisted command
const result1 = await isWhitelisted('df -h');
if (!result1) {
    console.error('df -h should be whitelisted');
    process.exit(1);
}

// Test non-whitelisted command
const result2 = await isWhitelisted('rm -rf /');
if (result2) {
    console.error('rm -rf / should NOT be whitelisted');
    process.exit(1);
}

// Test read-only detection
const result3 = isReadOnly('cat /var/log/syslog');
if (!result3) {
    console.error('cat should be read-only');
    process.exit(1);
}

console.log('Whitelist system works correctly');
process.exit(0);
EOF

test_command "Whitelist system works" "node test-whitelist.mjs"
rm -f test-whitelist.mjs

# Test approval system
cat > test-approval.mjs << 'EOF'
import { needsApproval, isDestructive, requiresSudo } from './dist/src/safety/approval.js';

// Test read-only command (should NOT need approval)
const result1 = await needsApproval('df -h');
if (result1) {
    console.error('df -h should not need approval');
    process.exit(1);
}

// Test destructive detection
const result2 = isDestructive('systemctl restart nginx');
if (!result2) {
    console.error('systemctl restart should be destructive');
    process.exit(1);
}

// Test sudo detection
const result3 = requiresSudo('sudo systemctl restart nginx');
if (!result3) {
    console.error('sudo commands should be detected');
    process.exit(1);
}

console.log('Approval system works correctly');
process.exit(0);
EOF

test_command "Approval system works" "node test-approval.mjs"
rm -f test-approval.mjs

echo ""
echo "📊 Test Results"
echo "===================================="
echo -e "Total Tests: $TESTS_TOTAL"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Make sure Ollama is running: ollama serve"
    echo "2. Test the CLI: npm run admin status"
    echo "3. Start interactive chat: npm run admin"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Some tests failed!${NC}"
    echo ""
    echo "Please check the errors above and fix them."
    echo ""
    exit 1
fi

