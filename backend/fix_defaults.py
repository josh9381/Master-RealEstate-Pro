#!/usr/bin/env python3
"""
Fix Prisma schema after db pull to add proper defaults.
"""
import re

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Fix: id String @id -> id String @id @default(cuid())
content = re.sub(r'(\s+id\s+String\s+@id)(\s)', r'\1 @default(cuid())\2', content)

# Fix: updatedAt DateTime -> updatedAt DateTime @updatedAt
content = re.sub(r'(\s+updatedAt\s+DateTime)(\s)', r'\1 @updatedAt\2', content)

# Fix relation arrays that need @relation attribute
# These are array fields like "User[]" that reference relation names
relations_to_fix = [
    ('users User[]', 'users User[]'),  # Organization.users
    ('results ABTestResult[]', 'results ABTestResult[]'),  # ABTest.results -> ABTestResult
    ('creator User', 'creator User'),  # ABTest.creator
]

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)

print("Fixed schema defaults!")
