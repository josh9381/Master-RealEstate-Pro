import request from 'supertest';
import express from 'express';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import taskRoutes from '../src/routes/task.routes';
import leadRoutes from '../src/routes/lead.routes';
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
app.use('/api/tasks', taskRoutes);
app.use('/api/leads', leadRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('Task Management Endpoints', () => {
  let testUser: User;
  let testAccessToken: string;
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

    testAccessToken = generateAccessToken(testUser.id, testUser.email, testUser.role);

    // Create a test lead
    testLead = await prisma.lead.create({
      data: {
        name: 'Test Lead',
        email: `lead${Date.now()}@example.com`,
      },
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task successfully', async () => {
      const dueDate = new Date(Date.now() + 86400000).toISOString(); // Tomorrow

      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          title: 'Follow up with lead',
          description: 'Call the lead to discuss their requirements',
          dueDate,
          priority: 'HIGH',
          status: 'PENDING',
          assignedToId: testUser.id,
          leadId: testLead.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.task).toHaveProperty('id');
      expect(response.body.data.task.title).toBe('Follow up with lead');
      expect(response.body.data.task.priority).toBe('HIGH');
      expect(response.body.data.task.status).toBe('PENDING');
      expect(response.body.data.task.assignedToId).toBe(testUser.id);
    });

    it('should create task without optional fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          title: 'Simple Task',
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          assignedToId: testUser.id,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.task.title).toBe('Simple Task');
      expect(response.body.data.task.status).toBe('PENDING'); // Default status
      expect(response.body.data.task.priority).toBe('MEDIUM'); // Default priority
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          // Missing title and assignedToId
          description: 'Task without title',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app)
        .post('/api/tasks')
        .send({
          title: 'Unauthorized Task',
          assignedToId: testUser.id,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tasks', () => {
    beforeEach(async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      const yesterday = new Date(Date.now() - 86400000);

      // Create test tasks
      await prisma.task.createMany({
        data: [
          {
            title: 'Task 1',
            status: 'PENDING',
            priority: 'HIGH',
            dueDate: tomorrow,
            assignedToId: testUser.id,
          },
          {
            title: 'Task 2',
            status: 'IN_PROGRESS',
            priority: 'MEDIUM',
            dueDate: tomorrow,
            assignedToId: testUser.id,
          },
          {
            title: 'Overdue Task',
            status: 'PENDING',
            priority: 'HIGH',
            dueDate: yesterday,
            assignedToId: testUser.id,
          },
        ],
      });
    });

    it('should list all tasks with pagination', async () => {
      const response = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toBeInstanceOf(Array);
      expect(response.body.data.tasks.length).toBeGreaterThanOrEqual(3);
      expect(response.body.data.pagination).toHaveProperty('total');
    });

    it('should filter tasks by status', async () => {
      const response = await request(app)
        .get('/api/tasks?status=PENDING')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      response.body.data.tasks.forEach((task: { status: string }) => {
        expect(task.status).toBe('PENDING');
      });
    });

    it('should filter tasks by priority', async () => {
      const response = await request(app)
        .get('/api/tasks?priority=HIGH')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      response.body.data.tasks.forEach((task: { priority: string }) => {
        expect(task.priority).toBe('HIGH');
      });
    });

    it('should filter overdue tasks', async () => {
      const response = await request(app)
        .get('/api/tasks?overdue=true')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should have at least one overdue task
      expect(response.body.data.tasks.length).toBeGreaterThan(0);
    });

    it('should return 401 without authorization', async () => {
      const response = await request(app).get('/api/tasks');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Test Task',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date(Date.now() + 86400000),
          assignedToId: testUser.id,
          leadId: testLead.id,
        },
      });
      taskId = task.id;
    });

    it('should get a single task by ID', async () => {
      const response = await request(app)
        .get(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.task.id).toBe(taskId);
      expect(response.body.data.task.title).toBe('Test Task');
      expect(response.body.data.task.assignedTo).toHaveProperty('firstName');
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .get('/api/tasks/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Original Task',
          status: 'PENDING',
          priority: 'MEDIUM',
          dueDate: new Date(Date.now() + 86400000),
          assignedToId: testUser.id,
        },
      });
      taskId = task.id;
    });

    it('should update task successfully', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          title: 'Updated Task',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.task.title).toBe('Updated Task');
      expect(response.body.data.task.status).toBe('IN_PROGRESS');
      expect(response.body.data.task.priority).toBe('HIGH');
    });

    it('should mark task as completed', async () => {
      const response = await request(app)
        .put(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          status: 'COMPLETED',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.task.status).toBe('COMPLETED');
      expect(response.body.data.task.completedAt).toBeTruthy();
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .put('/api/tasks/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    let taskId: string;

    beforeEach(async () => {
      const task = await prisma.task.create({
        data: {
          title: 'Task to Delete',
          dueDate: new Date(Date.now() + 86400000),
          assignedToId: testUser.id,
        },
      });
      taskId = task.id;
    });

    it('should delete task successfully', async () => {
      const response = await request(app)
        .delete(`/api/tasks/${taskId}`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify task is deleted
      const deletedTask = await prisma.task.findUnique({
        where: { id: taskId },
      });
      expect(deletedTask).toBeNull();
    });

    it('should return 404 for non-existent task', async () => {
      const response = await request(app)
        .delete('/api/tasks/nonexistent123')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tasks/stats', () => {
    beforeEach(async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      // Create tasks with various statuses
      await prisma.task.createMany({
        data: [
          { title: 'Task 1', status: 'PENDING', priority: 'HIGH', dueDate: tomorrow, assignedToId: testUser.id },
          { title: 'Task 2', status: 'IN_PROGRESS', priority: 'MEDIUM', dueDate: tomorrow, assignedToId: testUser.id },
          { title: 'Task 3', status: 'COMPLETED', priority: 'LOW', dueDate: tomorrow, assignedToId: testUser.id },
          { title: 'Task 4', status: 'PENDING', priority: 'HIGH', dueDate: tomorrow, assignedToId: testUser.id },
        ],
      });
    });

    it('should return task statistics', async () => {
      const response = await request(app)
        .get('/api/tasks/stats')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toHaveProperty('total');
      expect(response.body.data.stats).toHaveProperty('byStatus');
      expect(response.body.data.stats).toHaveProperty('byPriority');
      expect(response.body.data.stats.byStatus).toHaveProperty('PENDING');
      expect(response.body.data.stats.byStatus).toHaveProperty('IN_PROGRESS');
    });
  });

  describe('GET /api/leads/:leadId/tasks', () => {
    beforeEach(async () => {
      const tomorrow = new Date(Date.now() + 86400000);
      // Create tasks for the lead
      await prisma.task.createMany({
        data: [
          { title: 'Lead Task 1', dueDate: tomorrow, assignedToId: testUser.id, leadId: testLead.id },
          { title: 'Lead Task 2', dueDate: tomorrow, assignedToId: testUser.id, leadId: testLead.id },
        ],
      });
    });

    it('should list tasks for a specific lead', async () => {
      const response = await request(app)
        .get(`/api/leads/${testLead.id}/tasks`)
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tasks).toBeInstanceOf(Array);
      expect(response.body.data.tasks.length).toBe(2);
      response.body.data.tasks.forEach((task: { leadId: string }) => {
        expect(task.leadId).toBe(testLead.id);
      });
    });

    it('should return 404 for non-existent lead', async () => {
      const response = await request(app)
        .get('/api/leads/nonexistent123/tasks')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
