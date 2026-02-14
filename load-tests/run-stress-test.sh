#!/bin/bash

BASE_URL="${BASE_URL:-http://localhost:5000}"
RESULTS_DIR="load-tests/results"

mkdir -p "$RESULTS_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔══════════════════════════════════════════════════════════╗"
echo "║          AOK PROGRESSIVE STRESS TEST RUNNER              ║"
echo "║                                                          ║"
echo "║  Target: ${BASE_URL}                                     "
echo "║  Tests:  baseline → small → medium → large → stress      ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

run_test() {
  local level=$1
  local vus=$2
  local description=$3
  
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}  Starting: ${description} (${vus} virtual users)${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  k6 run \
    --env BASE_URL="$BASE_URL" \
    --env TEST_LEVEL="$level" \
    load-tests/stress-test.js 2>&1
  
  local exit_code=$?
  
  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}[PASS] ${description} completed successfully${NC}"
  else
    echo -e "${RED}[WARN] ${description} completed with threshold failures (exit code: ${exit_code})${NC}"
  fi
  
  echo ""
  echo -e "${BLUE}Pausing 10 seconds before next test to let the server recover...${NC}"
  sleep 10
  
  return $exit_code
}

LEVEL="${1:-all}"

case "$LEVEL" in
  baseline)
    run_test "baseline" 10 "Baseline Test (10 users)"
    ;;
  small)
    run_test "small" 100 "Small Load (100 users)"
    ;;
  medium)
    run_test "medium" 500 "Medium Load (500 users)"
    ;;
  large)
    run_test "large" 1000 "Large Load (1,000 users)"
    ;;
  stress)
    run_test "stress" 5000 "Stress Test (5,000 users)"
    ;;
  extreme)
    run_test "extreme" 10000 "Extreme Test (10,000 users)"
    ;;
  all)
    echo -e "${BLUE}Running progressive stress test: baseline → small → medium → large → stress → extreme${NC}"
    echo ""
    
    FAILED=0
    
    run_test "baseline" 10 "Stage 1: Baseline (10 users)"
    
    run_test "small" 100 "Stage 2: Small Load (100 users)"
    
    run_test "medium" 500 "Stage 3: Medium Load (500 users)"
    
    run_test "large" 1000 "Stage 4: Large Load (1,000 users)"
    if [ $? -ne 0 ]; then
      echo -e "${RED}Large test had failures. Continue anyway? Proceeding in 5 seconds...${NC}"
      sleep 5
    fi
    
    run_test "stress" 5000 "Stage 5: Stress (5,000 users)"
    if [ $? -ne 0 ]; then
      echo -e "${RED}Stress test had failures. Continue to extreme? Proceeding in 5 seconds...${NC}"
      sleep 5
    fi
    
    run_test "extreme" 10000 "Stage 6: Extreme (10,000 users)"
    
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║        ALL STRESS TESTS COMPLETE                        ║${NC}"
    echo -e "${BLUE}║  Results saved to: ${RESULTS_DIR}/                       ${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    ;;
  *)
    echo "Usage: $0 [baseline|small|medium|large|stress|extreme|all]"
    echo ""
    echo "Levels:"
    echo "  baseline  - 10 virtual users (~30s)"
    echo "  small     - 100 virtual users (~1m)"
    echo "  medium    - 500 virtual users (~1.5m)"
    echo "  large     - 1,000 virtual users (~1.5m)"
    echo "  stress    - 5,000 virtual users (~1.5m)"
    echo "  extreme   - 10,000 virtual users (~1.5m)"
    echo "  all       - Run all levels progressively"
    exit 1
    ;;
esac
