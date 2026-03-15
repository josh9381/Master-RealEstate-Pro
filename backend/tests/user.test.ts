import request from 'supertest';
import express from 'express';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import userRoutes from '../src/routes/user.routes';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/logger';
import { generalLimiter } from '../src/middleware/rateLimiter';
import { generateAccessToken } from '../src/utils/jwt';
import type { User, Organization } from '@prisma/client';

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);
app.use('/api/users', userRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('User Management Endpoints', () => {
  let adminUser: User;
  let regularUser: User;
  let org: Organization;
  let adminToken: string;
  let regularToken: string;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: { name: `UserOrg-${Date.now()}`, slug: `user-org-${Date.now()}` },
    });
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);

    adminUser = await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: `admin-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'ADMIN',
        organizationId: org.id,
      },
    });

    regularUser = await prisma.user.create({
      data: {
        firstName: 'Regular',
        lastName: 'User',
        email: `regular-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'USER',
        organizationId: org.id,
      },
    });

    adminToken = generateAccessToken(adminUser.id, adminUser.email, adminUser.role, org.id);
    regularToken = generateAccessToken(regularUser.id, regularUser.email, regularUser.role, org.id);
  });

  describe('GET /api/users', () => {
    it('should return users in the organization', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return a specific user', async () => {
      const res = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(regularUser.email);
    });
  });

  describe('PATCH /api/users/:id/role', () => {
    it('should allow admin to change user role', async () => {
      const res = await request(app)
        .patch(`/api/users/${regularUser.id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MANAGER' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should reject non-admin changing roles', async () => {
      const res = await request(app)
        .patch(`/api/users/${adminUser.id}/role`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ role: 'ADMIN' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should reject non-admin deleting users', async () => {
      const res = await request(app)
        .delete(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('Unauthenticated access', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });
});
