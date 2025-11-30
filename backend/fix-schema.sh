#!/bin/bash

echo "�� Fixing Prisma schema relation names..."

# The issue: prisma db pull creates capitalized relation names like "Lead", "User", "Campaign"
# But our code expects lowercase like "lead", "user", "campaign"

# Backup current schema
cp prisma/schema.prisma prisma/schema.prisma.pulled

# Fix relation names to match what the code expects
sed -i 's/  Campaign /  campaign /g' prisma/schema.prisma
sed -i 's/  Lead /  lead /g' prisma/schema.prisma
sed -i 's/  User /  user /g' prisma/schema.prisma
sed -i 's/  Organization /  organization /g' prisma/schema.prisma
sed -i 's/  Tag /  tags /g' prisma/schema.prisma
sed -i 's/  Activity /  activities /g' prisma/schema.prisma
sed -i 's/  Appointment /  appointments /g' prisma/schema.prisma
sed -i 's/  EmailTemplate /  emailTemplates /g' prisma/schema.prisma
sed -i 's/  SMSTemplate /  smsTemplates /g' prisma/schema.prisma
sed -i 's/  Workflow /  workflows /g' prisma/schema.prisma
sed -i 's/  Message /  messages /g' prisma/schema.prisma
sed -i 's/  Note /  notes /g' prisma/schema.prisma
sed -i 's/  Task /  tasks /g' prisma/schema.prisma
sed -i 's/  TeamMember /  teamMembers /g' prisma/schema.prisma

echo "✅ Fixed relation names"
echo "Running prisma format..."

