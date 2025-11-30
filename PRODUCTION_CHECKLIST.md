# Production Deployment Checklist

## ⚠️ CRITICAL - Before Going Live

### OpenAI Data Sharing
- [ ] **DISABLE OpenAI Data Sharing**
  - Go to: https://platform.openai.com/settings/organization/data-controls/sharing
  - Turn OFF "Share inputs and outputs with OpenAI"
  - This is currently ENABLED for free testing tokens
  - Must be disabled when using real customer data (GDPR/CCPA compliance)

### API Keys & Secrets
- [ ] Rotate all API keys
- [ ] Ensure JWT secrets are production-grade
- [ ] Enable rate limiting on all endpoints
- [ ] Set up OpenAI usage limits/alerts

### Database
- [ ] Run production migrations
- [ ] Set up automated backups
- [ ] Configure connection pooling

### Security
- [ ] Update CORS settings for production domain
- [ ] Enable HTTPS only
- [ ] Set up API rate limiting
- [ ] Configure CSP headers

### Monitoring
- [ ] Set up error tracking (Sentry/similar)
- [ ] Configure uptime monitoring
- [ ] Set up log aggregation
- [ ] Create alerting rules

### Performance
- [ ] Enable Redis caching
- [ ] Optimize database queries
- [ ] Set up CDN for static assets
- [ ] Load test critical endpoints

### Compliance
- [ ] Update Privacy Policy
- [ ] Update Terms of Service
- [ ] Ensure GDPR compliance
- [ ] Set up data retention policies

---

**Last Updated:** November 20, 2025
