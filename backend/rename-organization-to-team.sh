#!/bin/bash

echo "🔄 Renaming Organization to Team across entire codebase..."
echo "=================================================="

# Backup the schema first
cp prisma/schema.prisma prisma/schema.prisma.backup
echo "✅ Created backup: prisma/schema.prisma.backup"

# Replace in schema.prisma
sed -i 's/model Organization/model Team/g' prisma/schema.prisma
sed -i 's/organizationId/teamId/g' prisma/schema.prisma
sed -i 's/organization   /team           /g' prisma/schema.prisma
sed -i 's/@relation(fields: \[team/@ relation(fields: [team/g' prisma/schema.prisma
sed -i 's/Team @relation/Team @relation/g' prisma/schema.prisma
sed -i 's/Multi-tenant Organization/Multi-tenant Team/g' prisma/schema.prisma

echo "✅ Updated prisma/schema.prisma"

echo ""
echo "=================================================="
echo "✅ Schema rename complete!"
echo "Next steps:"
echo "1. Review changes: git diff prisma/schema.prisma"
echo "2. Create migration: npx prisma migrate dev --name rename_organization_to_team"
echo "3. Update all TypeScript files to use teamId"
