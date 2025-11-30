#!/bin/bash

echo "🔧 Fixing Prisma schema - relation field names to lowercase, type names capitalized..."

# Fix: lowercase field names, but keep type names capitalized
# Pattern: fieldName TypeName @relation(...)

# For Organization model relations
sed -i 's/  Activity         Activity\[\]/  activities       Activity[]/g' prisma/schema.prisma
sed -i 's/  Appointment      Appointment\[\]/  appointments     Appointment[]/g' prisma/schema.prisma
sed -i 's/  Campaign         Campaign\[\]/  campaigns        Campaign[]/g' prisma/schema.prisma
sed -i 's/  EmailTemplate    EmailTemplate\[\]/  emailTemplates   EmailTemplate[]/g' prisma/schema.prisma
sed -i 's/  Lead             Lead\[\]/  leads            Lead[]/g' prisma/schema.prisma
sed -i 's/  SMSTemplate      SMSTemplate\[\]/  smsTemplates     SMSTemplate[]/g' prisma/schema.prisma
sed -i 's/  Tag              Tag\[\]/  tags             Tag[]/g' prisma/schema.prisma
sed -i 's/  User             User\[\]/  users            User[]/g' prisma/schema.prisma
sed -i 's/  Workflow         Workflow\[\]/  workflows        Workflow[]/g' prisma/schema.prisma

# For other model relations (singular)
sed -i 's/  Campaign         Campaign?/  campaign         Campaign?/g' prisma/schema.prisma
sed -i 's/  Lead             Lead?/  lead             Lead?/g' prisma/schema.prisma
sed -i 's/  Organization     Organization/  organization     Organization/g' prisma/schema.prisma
sed -i 's/  User             User?/  user             User?/g' prisma/schema.prisma
sed -i 's/  User             User$/  user             User/g' prisma/schema.prisma
sed -i 's/  Workflow         Workflow/  workflow         Workflow/g' prisma/schema.prisma
sed -i 's/  Team             Team/  team             Team/g' prisma/schema.prisma
sed -i 's/  EmailConfig      EmailConfig?/  emailConfig      EmailConfig?/g' prisma/schema.prisma
sed -i 's/  SMSConfig        SMSConfig?/  smsConfig        SMSConfig?/g' prisma/schema.prisma

echo "✅ Fixed relation field names"

