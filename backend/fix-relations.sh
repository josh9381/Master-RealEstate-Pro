#!/bin/bash

# Script to fix all Prisma relation names to lowercase

cd /workspaces/Master-RealEstate-Pro/backend/src

# Fix 'author:' to 'user:' in note controller (author relation doesn't exist)
find . -name "*.ts" -type f -exec sed -i 's/author: {/user: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/author:/user:/g' {} \;

# Fix PascalCase relations in include/select statements
find . -name "*.ts" -type f -exec sed -i 's/User: {/user: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Lead: {/lead: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Note: {/note: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Activity: {/activity: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Tag: {/tag: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Team: {/team: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Campaign: {/campaign: {/g' {} \;

# Fix standalone boolean includes
find . -name "*.ts" -type f -exec sed -i 's/User: true/user: true/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Lead: true/lead: true/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Note: true/note: true/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Activity: true/activity: true/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/Tag: true/tag: true/g' {} \;

# Fix _count properties
find . -name "*.ts" -type f -exec sed -i 's/leads: true/lead: true/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/activities: true/activity: true/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/tags: true/tag: true/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/notes: true/note: true/g' {} \;

# Fix property access in _count
find . -name "*.ts" -type f -exec sed -i 's/_count\.leads/_count.lead/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/_count\.activities/_count.activity/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/_count\.tags/_count.tag/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/_count\.notes/_count.note/g' {} \;

# Remove createdBy (doesn't exist - should use 'user')
find . -name "*.ts" -type f -exec sed -i 's/createdBy: {/user: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/createdBy:/user:/g' {} \;

# Fix tags/leads/activities/notes in include statements (plural to singular)
find . -name "*.ts" -type f -exec sed -i 's/tags: {/tag: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/leads: {/lead: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/activities: {/activity: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/notes: {/note: {/g' {} \;

# Fix assignedTo property access (should be 'user')
find . -name "*.ts" -type f -exec sed -i 's/\.assignedTo/.user/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/assignedTo: {/user: {/g' {} \;

# Fix .tags property access on lead objects
find . -name "*.ts" -type f -exec sed -i 's/\.tags/.tag/g' {} \;

# Fix executionLogs to workflowExecution
find . -name "*.ts" -type f -exec sed -i 's/executionLogs:/workflowExecution:/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/executionLogs: {/workflowExecution: {/g' {} \;

# Fix members to teamMember
find . -name "*.ts" -type f -exec sed -i 's/members: {/teamMember: {/g' {} \;
find . -name "*.ts" -type f -exec sed -i 's/\.members/.teamMember/g' {} \;

# Fix team property
find . -name "*.ts" -type f -exec sed -i 's/team: {/team: {/g' {} \;

echo "All relation names have been updated to lowercase!"
