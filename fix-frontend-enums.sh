#!/bin/bash

# Fix campaign status and type enums to UPPERCASE in frontend

cd /workspaces/Master-RealEstate-Pro/src

# Fix campaign status enums
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/status: 'draft'/status: 'DRAFT'/g" {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/status: 'scheduled'/status: 'SCHEDULED'/g" {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/status: 'active'/status: 'ACTIVE'/g" {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/status: 'paused'/status: 'PAUSED'/g" {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/status: 'completed'/status: 'COMPLETED'/g" {} \;

# Fix campaign type enums
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/type: 'email'/type: 'EMAIL'/g" {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/type: 'sms'/type: 'SMS'/g" {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/type: 'phone'/type: 'PHONE'/g" {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i "s/type: 'social'/type: 'SOCIAL'/g" {} \;

# Fix value assignments with quotes
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i 's/"draft"/"DRAFT"/g' {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i 's/"scheduled"/"SCHEDULED"/g' {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i 's/"active"/"ACTIVE"/g' {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i 's/"paused"/"PAUSED"/g' {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i 's/"completed"/"COMPLETED"/g' {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i 's/"email"/"EMAIL"/g' {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i 's/"sms"/"SMS"/g' {} \;
find . -name "*.tsx" -name "*.ts" -type f -exec sed -i 's/"phone"/"PHONE"/g' {} \;

echo "Frontend enum fixes applied!"
