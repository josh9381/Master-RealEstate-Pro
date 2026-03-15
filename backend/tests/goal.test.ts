import request from 'supertest';
import express from 'express';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import goalRoutes from '../src/routes/goal.routes';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/logger';
import { generalLimiter } from '../src/middleware/rateLimiter';
import { generateAccessToken } from '../src/utils/jwt';
import type { User, Organization } from '@prisma/client';

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);
app.use('/api/goals', goalRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('Goal Management Endpoints', () => {
  let testUser: User;
  let org: Organization;
  let testToken: string;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: { name: `GoalOrg-${Date.now()}`, slug: `goal-org-${Date.now()}` },
    });
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    testUser = await prisma.user.create({
      data: {
        firstName: 'Goal',
        lastName: 'Tester',
        email: `goal-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'ADMIN',
        organizationId: org.id,
      },
    });
    testToken = generateAccessToken(testUser.id, testUser.email, testUser.role, org.id);
  });

  describe('GET /api/goals', () => {
    it('should return goals for the organization', async () => {
      await prisma.goal.create({
        data: {
          organizationId: org.id,
          userId: testUser.id,
          name: 'Close 10 deals',
          metricType: 'DEALS_CLOSED',
          targetValue: 10,
          period: 'MONTHLY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app)
        .get('/api/goals')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/goals', () => {
    it('should create a goal', async () => {
      const res = await request(app)
        .post('/api/goals')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Revenue Goal',
          type: 'REVENUE',
          target: 100000,
          period: 'QUARTERLY',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Revenue Goal');
      expect(res.body.data.target).toBe(100000);
    });
  });

  describe('PATCH /api/goals/:id', () => {
    it('should update a goal', async () => {
      const goal = await prisma.goal.create({
        data: {
          organizationId: org.id,
          userId: testUser.id,
          name: 'Old Goal',
          metricType: 'LEADS_GENERATED',
          targetValue: 50,
          period: 'MONTHLY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app)
        .patch(`/api/goals/${goal.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'Updated Goal', target: 75 });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Updated Goal');
      expect(res.body.data.target).toBe(75);
    });
  });

  describe('DELETE /api/goals/:id', () => {
    it('should delete a goal', async () => {
      const goal = await prisma.goal.create({
        data: {
          organizationId: org.id,
          userId: testUser.id,
          name: 'Delete Me',
          metricType: 'CALLS_MADE',
          targetValue: 20,
          period: 'WEEKLY',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app)
        .delete(`/api/goals/${goal.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Unauthenticated access', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/goals');
      expect(res.status).toBe(401);
    });
  });
});
