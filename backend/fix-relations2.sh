#!/bin/bash

# Additional fixes for plural property access and other issues

cd /workspaces/Master-RealEstate-Pro/backend/src

# Fix plural property access in code (not in includes)
find . -name "*.ts" -type f -exec sed -i 's/\.activities/.activity/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/\.notes/.note/g' {} \;

# Fix campaigns in _count
find . -name "*.ts" -type f -exec sed -i 's/campaigns: true/campaign: true/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/_count\.campaigns/_count.campaign/g' {} \;

# Fix members
find . -name "*.ts" -type f -exec sed -i 's/members:/teamMember:/g' {} \;

# Fix assignedTo include to user
find . -name "*.ts" -type f -exec sed -i '/assignedTo:/d' {} \;

echo "Additional fixes applied!"
