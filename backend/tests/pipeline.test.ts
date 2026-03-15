import request from 'supertest';
import express from 'express';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import pipelineRoutes from '../src/routes/pipeline.routes';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/logger';
import { generalLimiter } from '../src/middleware/rateLimiter';
import { generateAccessToken } from '../src/utils/jwt';
import type { User, Organization, Pipeline } from '@prisma/client';

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);
app.use('/api/pipelines', pipelineRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('Pipeline Management Endpoints', () => {
  let testUser: User;
  let org: Organization;
  let testToken: string;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: { name: `TestOrg-${Date.now()}`, slug: `test-org-${Date.now()}` },
    });
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    testUser = await prisma.user.create({
      data: {
        firstName: 'Pipeline',
        lastName: 'Tester',
        email: `pipeline-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'ADMIN',
        organizationId: org.id,
      },
    });
    testToken = generateAccessToken(testUser.id, testUser.email, testUser.role, org.id);
  });

  describe('GET /api/pipelines', () => {
    it('should return pipelines for the organization', async () => {
      // Seed a pipeline
      await prisma.pipeline.create({
        data: {
          name: 'Test Pipeline',
          type: 'BUYER',
          organizationId: org.id,
          isDefault: true,
          stages: {
            create: [
              { name: 'New', order: 0, color: '#3B82F6' },
              { name: 'Contacted', order: 1, color: '#10B981' },
            ],
          },
        },
      });

      const res = await request(app)
        .get('/api/pipelines')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0]).toHaveProperty('stages');
    });
  });

  describe('POST /api/pipelines', () => {
    it('should create a new pipeline', async () => {
      const res = await request(app)
        .post('/api/pipelines')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Seller Pipeline',
          type: 'SELLER',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Seller Pipeline');
      expect(res.body.data.type).toBe('SELLER');
      expect(res.body.data.stages.length).toBeGreaterThan(0);
    });

    it('should reject creating a pipeline without a name', async () => {
      const res = await request(app)
        .post('/api/pipelines')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ type: 'BUYER' });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('PUT /api/pipelines/:id', () => {
    it('should update a pipeline name', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          name: 'Old Name',
          type: 'DEFAULT',
          organizationId: org.id,
        },
      });

      const res = await request(app)
        .put(`/api/pipelines/${pipeline.id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'New Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('New Name');
    });
  });

  describe('DELETE /api/pipelines/:id', () => {
    it('should delete a non-default pipeline', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          name: 'Deletable',
          type: 'RENTAL',
          organizationId: org.id,
          isDefault: false,
        },
      });

      const res = await request(app)
        .delete(`/api/pipelines/${pipeline.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/pipelines/:id/stages', () => {
    it('should add a stage to a pipeline', async () => {
      const pipeline = await prisma.pipeline.create({
        data: {
          name: 'Stage Test',
          type: 'BUYER',
          organizationId: org.id,
        },
      });

      const res = await request(app)
        .post(`/api/pipelines/${pipeline.id}/stages`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'Custom Stage', color: '#FF5733' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Custom Stage');
    });
  });

  describe('Unauthenticated access', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/pipelines');
      expect(res.status).toBe(401);
    });
  });
});
