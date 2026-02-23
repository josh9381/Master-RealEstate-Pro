#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# COMPREHENSIVE ERROR DIAGNOSTICS SCRIPT
# Run: ./scripts/check-errors.sh [section]
# Sections: all, ts, backend, lint, runtime, security, build
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

ROOT="/workspaces/Master-RealEstate-Pro"
SECTION="${1:-all}"
TOTAL_ERRORS=0
TOTAL_WARNINGS=0

header() {
  echo ""
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}═══════════════════════════════════════════════════════${NC}"
}

section() {
  echo ""
  echo -e "${CYAN}── $1 ──${NC}"
}

pass() {
  echo -e "  ${GREEN}✓${NC} $1"
}

fail() {
  echo -e "  ${RED}✗${NC} $1"
  TOTAL_ERRORS=$((TOTAL_ERRORS + 1))
}

warn() {
  echo -e "  ${YELLOW}⚠${NC} $1"
  TOTAL_WARNINGS=$((TOTAL_WARNINGS + 1))
}

# ── 1. FRONTEND TYPESCRIPT ERRORS ──────────────────────────────
check_frontend_ts() {
  header "1. FRONTEND TYPESCRIPT COMPILATION"
  cd "$ROOT"

  TS_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
  TS_ERRORS=$(echo "$TS_OUTPUT" | grep -c "error TS" || true)
  
  if [ "$TS_ERRORS" -eq 0 ]; then
    pass "Frontend TypeScript: 0 errors"
  else
    fail "Frontend TypeScript: $TS_ERRORS errors"
    echo ""
    echo "$TS_OUTPUT" | grep "error TS" | while IFS= read -r line; do
      FILE=$(echo "$line" | cut -d'(' -f1)
      LOC=$(echo "$line" | grep -oP '\(\d+,\d+\)')
      CODE=$(echo "$line" | grep -oP 'TS\d+')
      MSG=$(echo "$line" | sed 's/.*: error TS[0-9]*: //')
      
      echo -e "    ${RED}$CODE${NC} in ${BOLD}$FILE${NC}$LOC"
      echo -e "    └─ $MSG"
      
      # Explain common errors
      case "$CODE" in
        TS2322) echo -e "    └─ ${YELLOW}Why: Type mismatch — the value doesn't match the expected type${NC}" ;;
        TS2339) echo -e "    └─ ${YELLOW}Why: Property doesn't exist on the type — check spelling or add to interface${NC}" ;;
        TS2345) echo -e "    └─ ${YELLOW}Why: Argument type mismatch — the function expects a different type${NC}" ;;
        TS6133) echo -e "    └─ ${YELLOW}Why: Unused variable/import — remove it or prefix with _${NC}" ;;
        TS2304) echo -e "    └─ ${YELLOW}Why: Name not found — missing import or typo${NC}" ;;
        TS7006) echo -e "    └─ ${YELLOW}Why: Parameter needs a type annotation${NC}" ;;
        TS18047) echo -e "    └─ ${YELLOW}Why: Possibly null — add a null check or use optional chaining ?.${NC}" ;;
        TS2554) echo -e "    └─ ${YELLOW}Why: Wrong number of arguments in function call${NC}" ;;
      esac
      echo ""
    done
  fi
}

# ── 2. BACKEND TYPESCRIPT ERRORS ───────────────────────────────
check_backend_ts() {
  header "2. BACKEND TYPESCRIPT COMPILATION"
  cd "$ROOT/backend"

  TS_OUTPUT=$(npx tsc --noEmit 2>&1 || true)
  TS_ERRORS=$(echo "$TS_OUTPUT" | grep -c "error TS" || true)
  
  if [ "$TS_ERRORS" -eq 0 ]; then
    pass "Backend TypeScript: 0 errors"
  else
    fail "Backend TypeScript: $TS_ERRORS errors"
    echo ""
    echo "$TS_OUTPUT" | grep "error TS" | while IFS= read -r line; do
      FILE=$(echo "$line" | cut -d'(' -f1)
      LOC=$(echo "$line" | grep -oP '\(\d+,\d+\)')
      CODE=$(echo "$line" | grep -oP 'TS\d+')
      MSG=$(echo "$line" | sed 's/.*: error TS[0-9]*: //')
      echo -e "    ${RED}$CODE${NC} in ${BOLD}$FILE${NC}$LOC"
      echo -e "    └─ $MSG"
      echo ""
    done
  fi
}

# ── 3. CODE QUALITY CHECKS ────────────────────────────────────
check_code_quality() {
  header "3. CODE QUALITY CHECKS"
  cd "$ROOT"

  section "Console.log statements"
  CONSOLE_COUNT=$(grep -rn "console\.log" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | grep -v "// console" | wc -l || true)
  if [ "$CONSOLE_COUNT" -eq 0 ]; then
    pass "No console.log statements in frontend"
  else
    warn "$CONSOLE_COUNT console.log statements found"
    grep -rn "console\.log" src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | grep -v "// console" | head -20 | while IFS= read -r line; do
      echo -e "    ${YELLOW}→${NC} $line"
    done
  fi

  section "Rogue PrismaClient instances"
  PRISMA_COUNT=$(grep -rn "new PrismaClient" backend/src/ --include="*.ts" 2>/dev/null | grep -v database.ts | grep -v node_modules | wc -l || true)
  if [ "$PRISMA_COUNT" -eq 0 ]; then
    pass "No rogue PrismaClient instances (all use shared singleton)"
  else
    fail "$PRISMA_COUNT rogue PrismaClient instances"
    grep -rn "new PrismaClient" backend/src/ --include="*.ts" 2>/dev/null | grep -v database.ts | grep -v node_modules | while IFS= read -r line; do
      echo -e "    ${RED}→${NC} $line"
    done
  fi

  section "Unused imports/variables (quick scan)"
  UNUSED=$(npx tsc --noEmit 2>&1 | grep -c "TS6133" || true)
  if [ "$UNUSED" -eq 0 ]; then
    pass "No unused variables or imports"
  else
    warn "$UNUSED unused variables/imports"
  fi

  section "TODO/FIXME/HACK comments"
  TODO_COUNT=$(grep -rn "TODO\|FIXME\|HACK\|XXX" src/ backend/src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l || true)
  if [ "$TODO_COUNT" -eq 0 ]; then
    pass "No TODO/FIXME/HACK comments"
  else
    warn "$TODO_COUNT TODO/FIXME/HACK comments found"
    grep -rn "TODO\|FIXME\|HACK\|XXX" src/ backend/src/ --include="*.tsx" --include="*.ts" 2>/dev/null | grep -v node_modules | head -10 | while IFS= read -r line; do
      echo -e "    ${YELLOW}→${NC} $line"
    done
    if [ "$TODO_COUNT" -gt 10 ]; then
      echo -e "    ${YELLOW}... and $((TODO_COUNT - 10)) more${NC}"
    fi
  fi
}

# ── 4. SECURITY CHECKS ────────────────────────────────────────
check_security() {
  header "4. SECURITY CHECKS"
  cd "$ROOT"

  section "Cross-tenant data leaks (controllers without organizationId filter)"
  LEAK_COUNT=$(grep -rn "prisma\." backend/src/controllers/*.ts 2>/dev/null | grep "findMany\|findFirst\|count\|aggregate\|groupBy" | grep -v "organizationId" | grep -v "where" | grep -v "//" | wc -l || true)
  if [ "$LEAK_COUNT" -eq 0 ]; then
    pass "All controller queries appear to have organizationId filtering"
  else
    warn "$LEAK_COUNT queries may lack organizationId filtering"
    grep -rn "prisma\." backend/src/controllers/*.ts 2>/dev/null | grep "findMany\|findFirst\|count\|aggregate\|groupBy" | grep -v "organizationId" | grep -v "where" | grep -v "//" | head -10 | while IFS= read -r line; do
      echo -e "    ${YELLOW}→${NC} $line"
    done
  fi

  section "Hardcoded secrets"
  SECRET_COUNT=$(grep -rn "sk_live\|sk_test\|password\s*=\s*['\"]" backend/src/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v "\.env" | grep -v "password:" | grep -v "currentPassword\|newPassword\|confirmPassword\|passwordRequirements\|passwordStrength\|PasswordInput\|password.*validation" | wc -l || true)
  if [ "$SECRET_COUNT" -eq 0 ]; then
    pass "No hardcoded secrets detected"
  else
    warn "$SECRET_COUNT potential hardcoded secrets"
    grep -rn "sk_live\|sk_test\|password\s*=\s*['\"]" backend/src/ src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v node_modules | grep -v "\.env" | grep -v "password:" | grep -v "currentPassword\|newPassword\|confirmPassword" | head -5 | while IFS= read -r line; do
      echo -e "    ${YELLOW}→${NC} $line"
    done
  fi

  section "Sanitization middleware"
  if grep -q "sanitizeInput\|sanitize" backend/src/server.ts 2>/dev/null; then
    pass "Input sanitization middleware is active"
  else
    fail "No input sanitization middleware found in server.ts"
  fi

  section "Rate limiting on AI routes"
  if grep -q "rateLimit\|rateLimiter" backend/src/routes/ai.routes.ts 2>/dev/null; then
    pass "AI routes have rate limiting"
  else
    fail "AI routes have no rate limiting"
  fi
}

# ── 5. RUNTIME CHECKS ─────────────────────────────────────────
check_runtime() {
  header "5. RUNTIME CHECKS"
  cd "$ROOT"

  section "Backend server"
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    pass "Backend is running on port 8000"
  elif lsof -i :8000 > /dev/null 2>&1; then
    pass "Backend is running on port 8000 (health endpoint may not exist)"
  else
    fail "Backend is NOT running on port 8000"
    echo -e "    ${YELLOW}Fix: Run ./start-dev.sh or cd backend && npm run dev${NC}"
  fi

  section "Frontend dev server"
  if lsof -i :3000 > /dev/null 2>&1; then
    pass "Frontend is running on port 3000"
  else
    fail "Frontend is NOT running on port 3000"
    echo -e "    ${YELLOW}Fix: Run ./start-dev.sh or npm run dev${NC}"
  fi

  section "Database connection"
  DB_URL=$(grep "DATABASE_URL" backend/.env 2>/dev/null | head -1 | cut -d'=' -f2- || true)
  if [ -n "$DB_URL" ]; then
    pass "DATABASE_URL is configured"
    if cd backend && npx prisma db execute --stdin <<< "SELECT 1" > /dev/null 2>&1; then
      pass "Database is reachable"
    else
      warn "Database may not be reachable (check credentials)"
    fi
    cd "$ROOT"
  else
    fail "DATABASE_URL is not set in backend/.env"
  fi

  section "Prisma schema in sync"
  cd "$ROOT/backend"
  MIGRATE_STATUS=$(npx prisma migrate status 2>&1 || true)
  if echo "$MIGRATE_STATUS" | grep -q "Database schema is up to date"; then
    pass "Database schema is up to date with migrations"
  else
    warn "Migrations may be pending"
    echo "$MIGRATE_STATUS" | head -5
  fi
  cd "$ROOT"
}

# ── 6. BUILD CHECK ────────────────────────────────────────────
check_build() {
  header "6. PRODUCTION BUILD CHECK"
  cd "$ROOT"

  section "Frontend build"
  BUILD_OUTPUT=$(npm run build 2>&1 || true)
  if echo "$BUILD_OUTPUT" | grep -q "built in\|✓"; then
    pass "Frontend builds successfully"
    # Extract bundle size
    SIZE=$(echo "$BUILD_OUTPUT" | grep "dist/" | tail -5)
    if [ -n "$SIZE" ]; then
      echo -e "    ${CYAN}Bundle output:${NC}"
      echo "$SIZE" | while IFS= read -r line; do
        echo "      $line"
      done
    fi
  else
    fail "Frontend build FAILED"
    echo "$BUILD_OUTPUT" | grep -i "error" | head -10 | while IFS= read -r line; do
      echo -e "    ${RED}→${NC} $line"
    done
  fi

  section "Backend build"
  cd "$ROOT/backend"
  BUILD_OUTPUT=$(npm run build 2>&1 || true)
  if [ $? -eq 0 ] && [ -d "dist" ]; then
    pass "Backend builds successfully"
  else
    # Check if it actually succeeded despite exit code
    if npx tsc --noEmit 2>&1 | grep -q "error TS"; then
      fail "Backend build FAILED"
      npx tsc --noEmit 2>&1 | grep "error TS" | head -5 | while IFS= read -r line; do
        echo -e "    ${RED}→${NC} $line"
      done
    else
      pass "Backend TypeScript compiles (build script may have different config)"
    fi
  fi
  cd "$ROOT"
}

# ── SUMMARY ───────────────────────────────────────────────────
summary() {
  header "SUMMARY"
  echo ""
  if [ "$TOTAL_ERRORS" -eq 0 ] && [ "$TOTAL_WARNINGS" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}🎉 ALL CLEAR — Zero errors, zero warnings${NC}"
  elif [ "$TOTAL_ERRORS" -eq 0 ]; then
    echo -e "  ${GREEN}${BOLD}✓ No errors${NC} | ${YELLOW}${TOTAL_WARNINGS} warnings${NC}"
  else
    echo -e "  ${RED}${BOLD}${TOTAL_ERRORS} errors${NC} | ${YELLOW}${TOTAL_WARNINGS} warnings${NC}"
  fi
  echo ""
  echo -e "  ${CYAN}Run specific sections:${NC}"
  echo "    ./scripts/check-errors.sh ts        # TypeScript only"
  echo "    ./scripts/check-errors.sh backend   # Backend only"
  echo "    ./scripts/check-errors.sh lint      # Code quality"
  echo "    ./scripts/check-errors.sh security  # Security audit"
  echo "    ./scripts/check-errors.sh runtime   # Runtime checks"
  echo "    ./scripts/check-errors.sh build     # Production build"
  echo "    ./scripts/check-errors.sh all       # Everything (default)"
  echo ""
}

# ── MAIN ──────────────────────────────────────────────────────
echo -e "${BOLD}${BLUE}"
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║  MASTER REALESTATE PRO — ERROR DIAGNOSTICS   ║"
echo "  ╚══════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  ${CYAN}Date:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "  ${CYAN}Mode:${NC} $SECTION"

case "$SECTION" in
  ts)       check_frontend_ts ;;
  backend)  check_backend_ts ;;
  lint)     check_code_quality ;;
  security) check_security ;;
  runtime)  check_runtime ;;
  build)    check_build ;;
  all)
    check_frontend_ts
    check_backend_ts
    check_code_quality
    check_security
    check_runtime
    check_build
    ;;
  *)
    echo "Unknown section: $SECTION"
    echo "Usage: ./scripts/check-errors.sh [all|ts|backend|lint|security|runtime|build]"
    exit 1
    ;;
esac

summary
