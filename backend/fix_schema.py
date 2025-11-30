#!/usr/bin/env python3
import re

# Read the schema
with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Restore from git first
import subprocess
subprocess.run(['git', 'checkout', 'HEAD', '--', 'prisma/schema.prisma'], check=True)

# Read fresh content
with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Now change only relation FIELD names to lowercase, keeping TYPE names capitalized
# Pattern: field_name Type @relation(...)
# We want: lowercase_field_name Type @relation(...)

# Find all relation fields and convert to lowercase
lines = content.split('\n')
result_lines = []

for line in lines:
    # Match pattern like "  User     User     @relation"
    # We want the FIRST word (field name) lowercase, SECOND word (Type) capitalized
    match = re.match(r'^(\s+)([A-Z][a-zA-Z]*\s+)([A-Z][a-zA-Z]*[\[\]?\s]+)(@relation.*)$', line)
    if match:
        indent = match.group(1)
        field_name = match.group(2).strip().lower()  # Make field name lowercase
        type_name = match.group(3)  # Keep type as-is
        relation = match.group(4)
        # Reconstruct with proper spacing
        result_lines.append(f"{indent}{field_name:<15} {type_name:<15} {relation}")
    else:
        result_lines.append(line)

# Write back
with open('prisma/schema.prisma', 'w') as f:
    f.write('\n'.join(result_lines))

print("Schema fixed!")
