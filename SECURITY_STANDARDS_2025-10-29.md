# 🔒 Security Standards & Best Practices

**Last Updated:** October 28, 2025  
**Version:** 1.0.0  
**Status:** Active

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Input Validation](#input-validation)
6. [Secrets Management](#secrets-management)
7. [Database Security](#database-security)
8. [Communication Security](#communication-security)
9. [Error Handling](#error-handling)
10. [Compliance & Standards](#compliance--standards)
11. [Security Checklist](#security-checklist)

---

## Overview

This document outlines the security standards and best practices followed in the Master RealEstate Pro CRM application. All developers must adhere to these guidelines.

### Security Principles

✅ **Defense in Depth** - Multiple layers of security  
✅ **Least Privilege** - Minimal access rights  
✅ **Fail Secure** - Fail to a secure state  
✅ **Separation of Duties** - No single point of control  
✅ **Zero Trust** - Verify everything  
✅ **Security by Design** - Built-in from the start

---

## Authentication & Authorization

### JWT Token Strategy

**Access Tokens:**
- ✅ Short-lived (15 minutes)
- ✅ Stateless validation
- ✅ Contains: userId, email, role
- ✅ Signed with strong secret (256-bit minimum)
- ✅ Includes issuer and audience claims

**Refresh Tokens:**
- ✅ Long-lived (7 days)
- ✅ Single-use recommended (not implemented yet)
- ✅ Separate secret from access tokens
- ✅ Can be revoked

**Implementation:**
```typescript
// backend/src/utils/jwt.ts
- ACCESS_TOKEN_EXPIRY = "15m"
- REFRESH_TOKEN_EXPIRY = "7d"
- Separate secrets for access & refresh
- Proper error handling (expired, invalid, malformed)
```

### Password Security

**Standards:**
- ✅ **Hashing:** bcrypt with salt rounds = 10
- ✅ **Minimum Length:** 8 characters (enforced by validation)
- ✅ **Complexity:** Letters, numbers, special chars (recommended)
- ✅ **Storage:** Never store plaintext passwords
- ✅ **Transmission:** Only over HTTPS in production

**Best Practices:**
```typescript
// Registration
const hashedPassword = await bcrypt.hash(password, 10);

// Login
const isValid = await bcrypt.compare(password, user.password);
```

### Role-Based Access Control (RBAC)

**Roles:**
- `ADMIN` - Full system access
- `MANAGER` - Team management + user permissions
- `USER` - Standard user permissions

**Middleware:**
```typescript
// Require authentication
router.use(authenticate)

// Require admin role
router.use(requireAdmin)
```

**Current Implementation:**
- ✅ `authenticate` middleware on all protected routes
- ✅ `requireAdmin` middleware for admin-only routes
- ✅ User role attached to JWT payload
- ⚠️ Resource-level authorization (check if user owns resource)

---

## Data Protection

### Sensitive Data Handling

**PII (Personally Identifiable Information):**
- Names, emails, phone numbers, addresses
- ✅ Encrypted in transit (HTTPS)
- ⚠️ Not encrypted at rest (database level encryption recommended)
- ✅ Access controlled via authentication
- ✅ Audit logs for access (not implemented yet)

**API Keys & Credentials:**
- SendGrid API keys
- Twilio credentials
- JWT secrets
- Database credentials

**Storage:**
- ✅ Environment variables (.env)
- ✅ Never committed to git (.env in .gitignore)
- ✅ Separate secrets for dev/staging/prod
- ⚠️ Encryption at rest (database) - recommended for production

**Best Practices:**
```typescript
// ✅ Good - Read from environment
const apiKey = process.env.SENDGRID_API_KEY;

// ❌ Bad - Hardcoded secrets
const apiKey = "SG.xxxxxxxxxxxxx";
```

### Data Encryption

**In Transit:**
- ✅ HTTPS enforced in production
- ✅ TLS 1.2+ minimum
- ✅ Secure WebSocket connections (WSS)

**At Rest:**
- ⚠️ Database encryption (recommended for production)
- ⚠️ File storage encryption (if storing uploads)
- ⚠️ Backup encryption (recommended)

---

## API Security

### Rate Limiting

**Current Implementation:**
```typescript
// backend/src/middleware/rateLimiter.ts
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP'
});
```

**Standards:**
- ✅ General rate limit: 100 requests / 15 minutes
- ⚠️ Auth endpoints: Should have stricter limits (10-20 / 15 min)
- ⚠️ Per-user rate limiting (not implemented)
- ✅ Trust proxy configuration enabled

**Recommended Enhancements:**
```typescript
// Strict rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Only 10 login attempts per 15 min
  message: 'Too many authentication attempts'
});
```

### CORS (Cross-Origin Resource Sharing)

**Current Configuration:**
```typescript
// Allowed origins
- http://localhost:3000
- http://localhost:5173
- GitHub Codespaces URLs
- Any localhost or .app.github.dev (dev mode)
```

**Production Standards:**
- ✅ Whitelist specific origins
- ✅ Credentials enabled
- ⚠️ Wildcard (*) never used
- ⚠️ Dynamic origin validation needs tightening for production

**Recommended:**
```typescript
// Production CORS
const allowedOrigins = [
  'https://yourdomain.com',
  'https://app.yourdomain.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### Security Headers

**Missing (High Priority):**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true
}));
```

**Headers to Add:**
- ⚠️ `Strict-Transport-Security` (HSTS)
- ⚠️ `X-Frame-Options` (Clickjacking protection)
- ⚠️ `X-Content-Type-Options` (MIME sniffing protection)
- ⚠️ `X-XSS-Protection`
- ⚠️ `Content-Security-Policy`
- ⚠️ `Referrer-Policy`
- ⚠️ `Permissions-Policy`

---

## Input Validation

### Validation Strategy

**Current Implementation:**
- ✅ Zod schemas for all request validation
- ✅ Middleware validation before controller execution
- ✅ Type safety with TypeScript
- ✅ Sanitization via Zod transforms

**Example:**
```typescript
// Good - Validated input
export const createLeadSchema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().optional(),
  company: z.string().max(255).optional(),
});

router.post('/', validateBody(createLeadSchema), createLead);
```

### SQL Injection Prevention

**Prisma ORM Protection:**
- ✅ Parameterized queries (automatic)
- ✅ No raw SQL queries (except health check)
- ✅ Type-safe query builder

**Safe:**
```typescript
// ✅ Prisma automatically parameterizes
await prisma.user.findUnique({
  where: { email: userInput }
});
```

**Unsafe (Avoid):**
```typescript
// ❌ Raw SQL with user input
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${userInput}`;

// ✅ Use parameterized if raw SQL needed
await prisma.$queryRaw`SELECT * FROM users WHERE email = ${Prisma.sql`${userInput}`}`;
```

**Current Status:**
- ✅ Only one raw query: `SELECT 1` (health check - no user input)
- ✅ All other queries use Prisma's safe query builder

### XSS (Cross-Site Scripting) Prevention

**Frontend Protection:**
- ✅ React escapes by default
- ✅ No `dangerouslySetInnerHTML` without sanitization
- ⚠️ Use DOMPurify for rich text content

**Backend Protection:**
- ✅ Validation strips/rejects script tags
- ✅ Content-Type headers set correctly
- ⚠️ CSP headers (Content Security Policy) - needs implementation

**Recommended:**
```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML content
const clean = DOMPurify.sanitize(dirtyHTML);
```

### CSRF (Cross-Site Request Forgery) Prevention

**Current Implementation:**
- ✅ JWT tokens in Authorization header (not cookies)
- ✅ CORS restrictions

**Not Needed (Currently):**
- CSRF tokens (because using JWT in headers, not cookies)

**If Using Cookies (Future):**
```typescript
import csrf from 'csurf';
app.use(csrf({ cookie: true }));
```

---

## Secrets Management

### Environment Variables

**Current Setup:**
```bash
# .env (gitignored)
JWT_ACCESS_SECRET=xxxxx
JWT_REFRESH_SECRET=xxxxx
SENDGRID_API_KEY=xxxxx
TWILIO_ACCOUNT_SID=xxxxx
TWILIO_AUTH_TOKEN=xxxxx
DATABASE_URL=xxxxx
```

**Best Practices:**
- ✅ Never commit .env to git
- ✅ Use .env.example as template (no real secrets)
- ✅ Different secrets for dev/staging/prod
- ⚠️ Use secret management service (AWS Secrets Manager, Vault)
- ⚠️ Rotate secrets regularly

### Secret Generation

**Generate Strong Secrets:**
```bash
# 256-bit secret (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use
openssl rand -hex 32
```

**Standards:**
- ✅ Minimum 256-bit (32 bytes) for JWT secrets
- ✅ Cryptographically random
- ✅ Never reuse across environments
- ✅ Never share between services

### API Key Security

**Third-Party Services:**
```typescript
// ✅ Good - Check if configured, fail gracefully
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
if (!SENDGRID_API_KEY) {
  console.warn('[EMAIL] SendGrid not configured, using mock mode');
}

// ❌ Bad - Hard fail
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) throw new Error('Missing API key');
```

**Best Practices:**
- ✅ Mock mode for development (implemented)
- ✅ Log warnings when API keys missing
- ✅ Validate API key format before use
- ⚠️ Implement key rotation policy

---

## Database Security

### Connection Security

**Current:**
```env
DATABASE_URL="file:./dev.db"  # SQLite for development
```

**Production:**
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"
```

**Standards:**
- ✅ Use connection pooling (Prisma handles this)
- ✅ SSL/TLS for database connections
- ✅ Least privilege database users
- ⚠️ Connection string encryption
- ⚠️ Read replicas for scaling

### Query Security

**Prisma Protection:**
- ✅ Prevents SQL injection (parameterized queries)
- ✅ Type safety
- ✅ Schema validation

**Best Practices:**
```typescript
// ✅ Good - Prisma's safe methods
await prisma.user.findMany({
  where: { email: { contains: searchTerm } }
});

// ❌ Avoid - Raw SQL with user input
await prisma.$executeRaw`DELETE FROM users WHERE id = ${userId}`;

// ✅ If raw SQL needed - Use sql template
import { Prisma } from '@prisma/client';
await prisma.$executeRaw(
  Prisma.sql`DELETE FROM users WHERE id = ${userId}`
);
```

### Data Access Control

**Current Implementation:**
- ✅ JWT authentication required for all protected routes
- ⚠️ Row-level security (check user owns resource)
- ⚠️ Audit logging (who accessed what, when)

**Recommended Enhancements:**
```typescript
// Check resource ownership
export async function checkLeadOwnership(
  leadId: string,
  userId: string
): Promise<boolean> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId }
  });
  
  if (!lead) return false;
  if (lead.assignedToId !== userId && userRole !== 'ADMIN') {
    throw new ForbiddenError('Access denied to this resource');
  }
  
  return true;
}
```

### Backup Security

**Recommendations:**
- ⚠️ Encrypted backups
- ⚠️ Separate backup storage
- ⚠️ Regular backup testing
- ⚠️ Backup retention policy
- ⚠️ Point-in-time recovery

---

## Communication Security

### Email Security

**SendGrid Integration:**
```typescript
// Current implementation
- ✅ API key stored in environment
- ✅ HTTPS communication
- ✅ Email validation before sending
- ✅ Template variables escaped
- ⚠️ SPF/DKIM/DMARC records (DNS configuration)
- ⚠️ Email content sanitization
```

**Best Practices:**
- ✅ Validate email addresses
- ✅ Rate limit email sending
- ⚠️ Implement unsubscribe mechanism
- ⚠️ Track bounce rates
- ⚠️ Prevent email injection attacks

### SMS Security

**Twilio Integration:**
```typescript
// Current implementation
- ✅ Credentials in environment
- ✅ Phone number validation
- ✅ Character limit enforcement
- ✅ Rate limiting (1 sec between bulk messages)
- ⚠️ Cost monitoring/alerts
```

**Best Practices:**
- ✅ Validate phone number format
- ✅ Prevent SMS flooding
- ⚠️ Implement opt-out/STOP keyword
- ⚠️ Two-factor authentication (2FA) for critical actions
- ⚠️ Monitor for unusual sending patterns

---

## Error Handling

### Secure Error Messages

**Current Implementation:**
```typescript
// ✅ Good - Generic error in production
const message = process.env.NODE_ENV === 'development' 
  ? err.message 
  : 'Internal server error';

// ✅ Good - No stack traces in production
if (process.env.NODE_ENV === 'development') {
  response.stack = err.stack;
}
```

**Standards:**
- ✅ Generic errors in production
- ✅ Detailed errors in development
- ✅ No sensitive data in error messages
- ✅ No stack traces in production
- ⚠️ Error tracking service (Sentry, Rollbar)

**Examples:**
```typescript
// ❌ Bad - Exposes database structure
throw new Error(`User with email ${email} not found in users table`);

// ✅ Good - Generic message
throw new NotFoundError('User not found');

// ❌ Bad - Exposes query structure
throw new Error(`Query failed: SELECT * FROM users WHERE id = ${id}`);

// ✅ Good - No implementation details
throw new Error('Failed to retrieve user');
```

### Logging Security

**Current Implementation:**
```typescript
// Development logging
console.error('❌ Error:', {
  name: err.name,
  message: err.message,
  stack: err.stack
});

// Production logging (minimal)
console.error('❌ Error:', {
  statusCode,
  message,
  path: req.path,
  method: req.method
});
```

**Standards:**
- ✅ No sensitive data in logs
- ✅ Different verbosity for dev/prod
- ⚠️ Centralized logging (CloudWatch, Datadog)
- ⚠️ Log rotation
- ⚠️ Audit trail for critical actions

**Don't Log:**
- ❌ Passwords (plaintext or hashed)
- ❌ API keys
- ❌ JWT tokens
- ❌ Credit card numbers
- ❌ SSNs or other PII

---

## Compliance & Standards

### OWASP Top 10 (2021)

| Risk | Status | Notes |
|------|--------|-------|
| A01: Broken Access Control | ⚠️ Partial | JWT auth implemented, resource-level checks needed |
| A02: Cryptographic Failures | ✅ Good | bcrypt for passwords, HTTPS in prod |
| A03: Injection | ✅ Good | Prisma ORM prevents SQL injection |
| A04: Insecure Design | ✅ Good | Security by design principles followed |
| A05: Security Misconfiguration | ⚠️ Needs Work | Missing helmet, strict CORS for prod |
| A06: Vulnerable Components | ✅ Good | Regular npm audit, dependencies updated |
| A07: Authentication Failures | ✅ Good | JWT, bcrypt, rate limiting |
| A08: Software/Data Integrity | ✅ Good | Package lock files, validation |
| A09: Logging/Monitoring Failures | ⚠️ Needs Work | Basic logging, needs centralization |
| A10: Server-Side Request Forgery | ✅ Good | No SSRF vectors identified |

### GDPR Compliance

**Required for EU Users:**
- ⚠️ Privacy policy
- ⚠️ Terms of service
- ⚠️ Cookie consent
- ⚠️ Right to access data
- ⚠️ Right to deletion
- ⚠️ Data portability
- ⚠️ Data breach notification

**Current Status:**
- ❌ Not implemented (required for production)

### CAN-SPAM Act (Email)

**Requirements:**
- ⚠️ Unsubscribe mechanism
- ⚠️ Physical mailing address
- ⚠️ Clear "From" information
- ⚠️ Accurate subject lines
- ⚠️ Honor opt-out within 10 days

**Current Status:**
- ❌ Not implemented (required for email campaigns)

### TCPA (SMS)

**Requirements:**
- ⚠️ Prior express consent
- ⚠️ Opt-out mechanism (STOP keyword)
- ⚠️ Time restrictions (8am-9pm local time)
- ⚠️ No autodialed marketing without consent

**Current Status:**
- ❌ Not implemented (required for SMS campaigns)

---

## Security Checklist

### ✅ Currently Implemented

- [x] JWT authentication with access & refresh tokens
- [x] bcrypt password hashing (10 rounds)
- [x] Input validation with Zod schemas
- [x] SQL injection prevention (Prisma ORM)
- [x] CORS configuration
- [x] Rate limiting (general)
- [x] Request logging
- [x] Error handling with no sensitive data exposure
- [x] Environment variable usage for secrets
- [x] HTTPS enforcement (production ready)
- [x] Type safety with TypeScript
- [x] Role-based access control (basic)
- [x] Email/phone validation
- [x] XSS prevention (React default escaping)

### ⚠️ Needs Implementation (High Priority)

- [ ] **Helmet middleware** (security headers)
- [ ] **Stricter rate limiting** for auth endpoints
- [ ] **Resource ownership validation** (user can only access their data)
- [ ] **API key rotation policy**
- [ ] **Audit logging** (who did what, when)
- [ ] **2FA (Two-Factor Authentication)**
- [ ] **Session management** (revoke refresh tokens)
- [ ] **Database encryption at rest**
- [ ] **Backup encryption**

### ⚠️ Needs Implementation (Medium Priority)

- [ ] **Centralized logging** (Sentry, LogRocket)
- [ ] **Monitoring & alerts** (Datadog, New Relic)
- [ ] **Security scanning** (Snyk, npm audit automated)
- [ ] **Penetration testing**
- [ ] **Vulnerability management program**
- [ ] **Incident response plan**
- [ ] **Data retention policy**
- [ ] **GDPR compliance** (if serving EU)

### ⚠️ Needs Implementation (Nice to Have)

- [ ] **IP whitelisting** for admin actions
- [ ] **Geofencing** (restrict access by location)
- [ ] **Device fingerprinting**
- [ ] **Anomaly detection** (unusual behavior)
- [ ] **Honeypot endpoints** (detect attackers)
- [ ] **Web Application Firewall (WAF)**
- [ ] **DDoS protection** (Cloudflare)
- [ ] **Regular security audits**

---

## Security Incident Response

### Incident Response Plan

**Steps:**
1. **Detect** - Identify security incident
2. **Contain** - Prevent further damage
3. **Eradicate** - Remove threat
4. **Recover** - Restore normal operations
5. **Review** - Post-incident analysis

### Contact Information

**Security Team:**
- Security Lead: [Email]
- DevOps Lead: [Email]
- CTO/Technical Lead: [Email]

**Reporting:**
- Email: security@yourdomain.com
- PGP Key: [Link]

---

## Regular Security Tasks

### Daily
- Monitor error logs for suspicious activity
- Check rate limiting logs
- Review failed login attempts

### Weekly
- Review access logs
- Check dependency vulnerabilities (`npm audit`)
- Monitor API usage patterns

### Monthly
- Rotate API keys (if applicable)
- Review user permissions
- Update dependencies
- Security training

### Quarterly
- Security audit
- Penetration testing
- Compliance review
- Backup testing

### Annually
- Full security assessment
- Update security policies
- Review incident response plan
- Renew SSL certificates

---

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

**Document Version:** 1.0.0  
**Last Review:** October 28, 2025  
**Next Review:** January 28, 2026  
**Owner:** Development Team
