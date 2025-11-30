#!/usr/bin/env python3
"""
Fix Prisma schema to use lowercase relation field names to match code usage.
Only changes field names like "User" to "user", NOT the type names.
"""
import re

with open('prisma/schema.prisma', 'r') as f:
    lines = f.readlines()

output = []
for line in lines:
    # Pattern: "  FieldName    TypeName    @relation(...)"
    # We want to lowercase FieldName only, keep TypeName as-is
    match = re.match(r'^(\s+)([A-Z][a-zA-Z0-9]*)\s+(.*?\s+@relation.*)$', line)
    if match:
        indent = match.group(1)
        field_name = match.group(2).lower()  # Lowercase the field name
        rest = match.group(3)  # Keep type and @relation as-is
        output.append(f"{indent}{field_name} {rest}\n")
    else:
        output.append(line)

with open('prisma/schema.prisma', 'w') as f:
    f.writelines(output)

print("Fixed all relation field names to lowercase!")
