#!/bin/bash

# Script to fix Prisma schema relation names to match TypeScript code expectations
# This ensures all relation names in schema match what the controllers expect

echo "🔧 Fixing Prisma schema relations..."

cd /workspaces/Master-RealEstate-Pro/backend/prisma

# Create backup
cp schema.prisma schema.prisma.pre-fix-backup

# Fix: _count properties need plurals in schema
# The TypeScript uses _count.activities, _count.leads, _count.notes
# So array relations should be plural in the schema

# Already correct in backup:
# - activities (Campaign and Lead have this)
# - appointments (Lead has this)  
# - notes (Lead has this)
# - tags (Campaign and Lead have this)
# - leads (Tag has this)
# - campaigns (Tag has this)

# The issue is some includes in TypeScript still reference wrong names
# But looking at errors, the main issues are:

# 1. Some TypeScript code uses 'tag' but should use 'tags' (for includes)
# 2. Some TypeScript code uses 'note' but should use 'notes' (for includes)
# 3. Some TypeScript code uses 'activity' but should use 'activities' (for _count)
# 4. Some TypeScript code references properties that don't exist when relation isn't loaded

# Since you said the TypeScript code should be correct, let's check what the 
# error messages are telling us. They say things like:
# "'tag' does not exist... Did you mean 'tags'?"
# "'note' does not exist... Did you mean 'notes'?"
# "'activity' does not exist... Did you mean 'activities'?"

# This means the SCHEMA is already correct with plurals!
# The TypeScript code has the wrong names (singular instead of plural)

echo "✅ Schema is already correct!"
echo "❌ The issue is in the TypeScript code, not the schema."
echo ""
echo "The schema already has:"
echo "  - tags (plural)"
echo "  - notes (plural)"  
echo "  - activities (plural)"
echo "  - leads (plural)"
echo "  - campaigns (plural)"
echo ""
echo "But some TypeScript code is trying to use:"
echo "  - tag (singular) ❌"
echo "  - note (singular) ❌"
echo "  - activity (singular) ❌"
echo "  - lead (singular) ❌"
echo ""
echo "We need to fix the TypeScript code, not the schema!"
