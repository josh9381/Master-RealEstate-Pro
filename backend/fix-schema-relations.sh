#!/bin/bash

echo "🔧 Fixing Prisma schema relation names..."

# The issue: prisma db pull creates capitalized relation names
# Controllers expect lowercase relation names
# Fix: Change all relation field names to lowercase

sed -i 's/  Activity         Activity/  activities       Activity/g' prisma/schema.prisma
sed -i 's/  Appointment      Appointment/  appointments     Appointment/g' prisma/schema.prisma
sed -i 's/  Campaign         Campaign/  campaigns        Campaign/g' prisma/schema.prisma
sed -i 's/  EmailTemplate    EmailTemplate/  emailTemplates   EmailTemplate/g' prisma/schema.prisma
sed -i 's/  Lead             Lead/  leads            Lead/g' prisma/schema.prisma
sed -i 's/  SMSTemplate      SMSTemplate/  smsTemplates     SMSTemplate/g' prisma/schema.prisma
sed -i 's/  Tag              Tag/  tags             Tag/g' prisma/schema.prisma
sed -i 's/  User             User/  users            User/g' prisma/schema.prisma
sed -i 's/  Workflow         Workflow/  workflows        Workflow/g' prisma/schema.prisma
sed -i 's/  Organization     Organization/  organization     Organization/g' prisma/schema.prisma
sed -i 's/  Lead             Lead\[\]/  lead             Lead?/g' prisma/schema.prisma
sed -i 's/  Campaign         Campaign\?/  campaign         Campaign?/g' prisma/schema.prisma
sed -i 's/  User             User\?/  user             User?/g' prisma/schema.prisma

echo "✅ Fixed relation names"
echo "Running prisma format to validate..."

