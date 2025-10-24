import request from 'supertest';
import express from 'express';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import tagRoutes from '../src/routes/tag.routes';
import leadRoutes from '../src/routes/lead.routes';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/logger';
import { generalLimiter } from '../src/middleware/rateLimiter';
import { generateAccessToken } from '../src/utils/jwt';
import type { User } from '@prisma/client';

// Create test app
const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);
app.use('/api/tags', tagRoutes);
app.use('/api/leads', leadRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('Tag Management Endpoints', () => {
  let testUser: User;
  let testAccessToken: string;

  beforeEach(async () => {
    // Create a test user
    const hashedPassword = await bcrypt.hash('TestPassword123!', 10);
    testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: `test${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'USER',
      },
    });

    testAccessToken = generateAccessToken(testUser.id, testUser.email, testUser.role);
  });

  describe('POST /api/tags', () => {
    it('should create a new tag successfully', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          name: 'Hot Lead',
          color: '#FF5733',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tag).toHaveProperty('id');
      expect(response.body.data.tag.name).toBe('Hot Lead');
      expect(response.body.data.tag.color).toBe('#FF5733');
    });

    it('should create tag without color', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          name: 'Important',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tag.name).toBe('Important');
      expect(response.body.data.tag.color).toBeNull();
    });

    it('should return 409 for duplicate tag name', async () => {
      const tagName = `UniqueTag${Date.now()}`;

      // Create first tag
      await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ name: tagName });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ name: tagName });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('A tag with this name already exists');
    });

    it('should return 400 for invalid color format', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          name: 'Test Tag',
          color: 'invalid-color',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .post('/api/tags')
        .send({ name: 'Unauthorized Tag' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tags', () => {
    beforeEach(async () => {
      // Create some test tags
      await prisma.tag.createMany({
        data: [
          { name: 'Priority', color: '#FF0000' },
          { name: 'Urgent', color: '#FFA500' },
          { name: 'Follow-up', color: '#0000FF' },
        ],
      });
    });

    it('should list all tags with counts', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tags).toBeInstanceOf(Array);
      expect(response.body.data.tags.length).toBeGreaterThanOrEqual(3);
      expect(response.body.data.total).toBeGreaterThanOrEqual(3);

      // Check that counts are included
      response.body.data.tags.forEach((tag: any) => {
        expect(tag).toHaveProperty('_count');
        expect(tag._count).toHaveProperty('leads');
        expect(tag._count).toHaveProperty('campaigns');
      });
    });

    it('should return tags sorted alphabetically', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      const tagNames = response.body.data.tags.map((tag: any) => tag.name);
      
      // Verify alphabetical order
      const sortedNames = [...tagNames].sort();
      expect(tagNames).toEqual(sortedNames);
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app).get('/api/tags');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: 'Test Tag',
          color: '#00FF00',
        },
      });
      tagId = tag.id;
    });

    it('should get a single tag by ID', async () => {
      const response = await request(app)
        .get(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tag.id).toBe(tagId);
      expect(response.body.data.tag.name).toBe('Test Tag');
      expect(response.body.data.tag.color).toBe('#00FF00');
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .get('/api/tags/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: 'Original Tag',
          color: '#111111',
        },
      });
      tagId = tag.id;
    });

    it('should update tag successfully', async () => {
      const response = await request(app)
        .put(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          name: 'Updated Tag',
          color: '#222222',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tag.name).toBe('Updated Tag');
      expect(response.body.data.tag.color).toBe('#222222');
    });

    it('should update only name', async () => {
      const response = await request(app)
        .put(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          name: 'Name Only Update',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.tag.name).toBe('Name Only Update');
      expect(response.body.data.tag.color).toBe('#111111'); // Original color preserved
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .put('/api/tags/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 409 for duplicate name', async () => {
      // Create another tag
      await prisma.tag.create({
        data: { name: 'Existing Tag' },
      });

      // Try to update to existing name
      const response = await request(app)
        .put(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ name: 'Existing Tag' });

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    let tagId: string;

    beforeEach(async () => {
      const tag = await prisma.tag.create({
        data: {
          name: 'Tag to Delete',
        },
      });
      tagId = tag.id;
    });

    it('should delete tag successfully', async () => {
      const response = await request(app)
        .delete(`/api/tags/${tagId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify tag is deleted
      const deletedTag = await prisma.tag.findUnique({
        where: { id: tagId },
      });
      expect(deletedTag).toBeNull();
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .delete('/api/tags/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/leads/:id/tags', () => {
    let leadId: string;
    let tagIds: string[];

    beforeEach(async () => {
      // Create a test lead
      const lead = await prisma.lead.create({
        data: {
          name: 'Test Lead',
          email: `lead${Date.now()}@example.com`,
        },
      });
      leadId = lead.id;

      // Create test tags
      const tags = await Promise.all([
        prisma.tag.create({ data: { name: `Tag1-${Date.now()}` } }),
        prisma.tag.create({ data: { name: `Tag2-${Date.now()}` } }),
      ]);
      tagIds = tags.map(t => t.id);
    });

    it('should add tags to lead successfully', async () => {
      const response = await request(app)
        .post(`/api/leads/${leadId}/tags`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ tagIds });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.lead.tags.length).toBe(2);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .post('/api/leads/nonexistent123/tags')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ tagIds });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid tag IDs', async () => {
      const response = await request(app)
        .post(`/api/leads/${leadId}/tags`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({ tagIds: ['invalid1', 'invalid2'] });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/leads/:id/tags/:tagId', () => {
    let leadId: string;
    let tagId: string;

    beforeEach(async () => {
      // Create tag
      const tag = await prisma.tag.create({
        data: { name: `RemoveTag-${Date.now()}` },
      });
      tagId = tag.id;

      // Create lead with tag
      const lead = await prisma.lead.create({
        data: {
          name: 'Test Lead',
          email: `lead${Date.now()}@example.com`,
          tags: {
            connect: { id: tagId },
          },
        },
      });
      leadId = lead.id;
    });

    it('should remove tag from lead successfully', async () => {
      const response = await request(app)
        .delete(`/api/leads/${leadId}/tags/${tagId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify tag was removed
      const updatedLead = await prisma.lead.findUnique({
        where: { id: leadId },
        include: { tags: true },
      });
      expect(updatedLead?.tags.length).toBe(0);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .delete(`/api/leads/nonexistent123/tags/${tagId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 400 if tag not assigned to lead', async () => {
      // Create another tag
      const anotherTag = await prisma.tag.create({
        data: { name: `AnotherTag-${Date.now()}` },
      });

      const response = await request(app)
        .delete(`/api/leads/${leadId}/tags/${anotherTag.id}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(400);
    });
  });
});
