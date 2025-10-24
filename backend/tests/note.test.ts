import request from 'supertest';
import express from 'express';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import leadRoutes from '../src/routes/lead.routes';
import noteRoutes from '../src/routes/note.routes';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/logger';
import { generalLimiter } from '../src/middleware/rateLimiter';
import { generateAccessToken } from '../src/utils/jwt';
import type { User, Lead } from '@prisma/client';

// Create test app
const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);
app.use('/api/leads', leadRoutes);
app.use('/api/notes', noteRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('Note Management Endpoints', () => {
  let testUser: User;
  let anotherUser: User;
  let testAccessToken: string;
  let anotherUserToken: string;
  let testLead: Lead;

  beforeEach(async () => {
    // Create test users
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

    anotherUser = await prisma.user.create({
      data: {
        firstName: 'Another',
        lastName: 'User',
        email: `another${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'USER',
      },
    });

    testAccessToken = generateAccessToken(testUser.id, testUser.email, testUser.role);
    anotherUserToken = generateAccessToken(anotherUser.id, anotherUser.email, anotherUser.role);

    // Create a test lead
    testLead = await prisma.lead.create({
      data: {
        name: 'Test Lead',
        email: `lead${Date.now()}@example.com`,
      },
    });
  });

  describe('POST /api/leads/:leadId/notes', () => {
    it('should create a note for a lead successfully', async () => {
      const response = await request(app)
        .post(`/api/leads/${testLead.id}/notes`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          content: 'This is a test note about the lead.',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.note).toHaveProperty('id');
      expect(response.body.data.note.content).toBe('This is a test note about the lead.');
      expect(response.body.data.note.authorId).toBe(testUser.id);
      expect(response.body.data.note.leadId).toBe(testLead.id);
      expect(response.body.data.note.author).toHaveProperty('firstName');
      expect(response.body.data.note.author.email).toBe(testUser.email);
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .post('/api/leads/nonexistent123/notes')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          content: 'Test note',
        });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Lead not found');
    });

    it('should return 400 for empty content', async () => {
      const response = await request(app)
        .post(`/api/leads/${testLead.id}/notes`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          content: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .post(`/api/leads/${testLead.id}/notes`)
        .send({
          content: 'Unauthorized note',
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/leads/:leadId/notes', () => {
    beforeEach(async () => {
      // Create some test notes
      await prisma.note.createMany({
        data: [
          {
            content: 'First note',
            leadId: testLead.id,
            authorId: testUser.id,
          },
          {
            content: 'Second note',
            leadId: testLead.id,
            authorId: testUser.id,
          },
          {
            content: 'Third note',
            leadId: testLead.id,
            authorId: anotherUser.id,
          },
        ],
      });
    });

    it('should list all notes for a lead', async () => {
      const response = await request(app)
        .get(`/api/leads/${testLead.id}/notes`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBeInstanceOf(Array);
      expect(response.body.data.notes.length).toBe(3);
      expect(response.body.data.total).toBe(3);

      // Check that notes include author info
      response.body.data.notes.forEach((note: any) => {
        expect(note).toHaveProperty('author');
        expect(note.author).toHaveProperty('firstName');
        expect(note.author).toHaveProperty('email');
      });
    });

    it('should return notes in descending order by creation date', async () => {
      const response = await request(app)
        .get(`/api/leads/${testLead.id}/notes`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      const notes = response.body.data.notes;
      
      // Verify all 3 notes are present
      expect(notes.length).toBe(3);
      const noteContents = notes.map((n: any) => n.content);
      expect(noteContents).toContain('First note');
      expect(noteContents).toContain('Second note');
      expect(noteContents).toContain('Third note');
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/leads/nonexistent123/notes')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .get(`/api/leads/${testLead.id}/notes`);

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/notes/:id', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await prisma.note.create({
        data: {
          content: 'Test note for retrieval',
          leadId: testLead.id,
          authorId: testUser.id,
        },
      });
      noteId = note.id;
    });

    it('should get a single note by ID', async () => {
      const response = await request(app)
        .get(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.note.id).toBe(noteId);
      expect(response.body.data.note.content).toBe('Test note for retrieval');
      expect(response.body.data.note.author).toHaveProperty('firstName');
      expect(response.body.data.note.lead).toHaveProperty('name');
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .get('/api/notes/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/notes/:id', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await prisma.note.create({
        data: {
          content: 'Original note content',
          leadId: testLead.id,
          authorId: testUser.id,
        },
      });
      noteId = note.id;
    });

    it('should update note successfully (author)', async () => {
      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          content: 'Updated note content',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.note.content).toBe('Updated note content');
    });

    it('should return 403 when non-author tries to update', async () => {
      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send({
          content: 'Trying to update someone else\'s note',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You can only edit your own notes');
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .put('/api/notes/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          content: 'Updated content',
        });

      expect(response.status).toBe(404);
    });

    it('should return 400 for empty content', async () => {
      const response = await request(app)
        .put(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          content: '',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/notes/:id', () => {
    let noteId: string;

    beforeEach(async () => {
      const note = await prisma.note.create({
        data: {
          content: 'Note to delete',
          leadId: testLead.id,
          authorId: testUser.id,
        },
      });
      noteId = note.id;
    });

    it('should delete note successfully (author)', async () => {
      const response = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify note is deleted
      const deletedNote = await prisma.note.findUnique({
        where: { id: noteId },
      });
      expect(deletedNote).toBeNull();
    });

    it('should return 403 when non-author non-admin tries to delete', async () => {
      const response = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${anotherUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('You can only delete your own notes');
    });

    it('should allow admin to delete any note', async () => {
      // Create an admin user
      const hashedPassword = await bcrypt.hash('AdminPassword123!', 10);
      const adminUser = await prisma.user.create({
        data: {
          firstName: 'Admin',
          lastName: 'User',
          email: `admin${Date.now()}@example.com`,
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      const adminToken = generateAccessToken(adminUser.id, adminUser.email, adminUser.role);

      const response = await request(app)
        .delete(`/api/notes/${noteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent note', async () => {
      const response = await request(app)
        .delete('/api/notes/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
