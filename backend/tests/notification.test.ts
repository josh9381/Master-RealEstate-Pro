import request from 'supertest';
import express from 'express';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import notificationRoutes from '../src/routes/notification.routes';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/logger';
import { generalLimiter } from '../src/middleware/rateLimiter';
import { generateAccessToken } from '../src/utils/jwt';
import type { User, Organization, Notification } from '@prisma/client';

const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);
app.use('/api/notifications', notificationRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('Notification Endpoints', () => {
  let testUser: User;
  let org: Organization;
  let testToken: string;

  beforeEach(async () => {
    org = await prisma.organization.create({
      data: { name: `NotifOrg-${Date.now()}`, slug: `notif-org-${Date.now()}` },
    });
    const hashedPassword = await bcrypt.hash('TestPass123!', 10);
    testUser = await prisma.user.create({
      data: {
        firstName: 'Notif',
        lastName: 'Tester',
        email: `notif-${Date.now()}@example.com`,
        password: hashedPassword,
        role: 'USER',
        organizationId: org.id,
      },
    });
    testToken = generateAccessToken(testUser.id, testUser.email, testUser.role, org.id);
  });

  describe('GET /api/notifications', () => {
    it('should return notifications for the user', async () => {
      await prisma.notification.create({
        data: {
          userId: testUser.id,
          organizationId: org.id,
          type: 'SYSTEM',
          title: 'Test notification',
          message: 'Hello world',
          read: false,
        },
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return unread count', async () => {
      await prisma.notification.createMany({
        data: [
          { userId: testUser.id, organizationId: org.id, type: 'SYSTEM', title: 'One', message: 'msg', read: false },
          { userId: testUser.id, organizationId: org.id, type: 'SYSTEM', title: 'Two', message: 'msg', read: false },
          { userId: testUser.id, organizationId: org.id, type: 'SYSTEM', title: 'Three', message: 'msg', read: true },
        ],
      });

      const res = await request(app)
        .get('/api/notifications/unread-count')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
    });
  });

  describe('PATCH /api/notifications/:id/read', () => {
    it('should mark a notification as read', async () => {
      const notif = await prisma.notification.create({
        data: {
          userId: testUser.id,
          organizationId: org.id,
          type: 'SYSTEM',
          title: 'Unread',
          message: 'Mark me read',
          read: false,
        },
      });

      const res = await request(app)
        .patch(`/api/notifications/${notif.id}/read`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updated = await prisma.notification.findUnique({ where: { id: notif.id } });
      expect(updated?.read).toBe(true);
    });
  });

  describe('PATCH /api/notifications/mark-all-read', () => {
    it('should mark all notifications as read', async () => {
      await prisma.notification.createMany({
        data: [
          { userId: testUser.id, organizationId: org.id, type: 'SYSTEM', title: 'A', message: 'msg', read: false },
          { userId: testUser.id, organizationId: org.id, type: 'SYSTEM', title: 'B', message: 'msg', read: false },
        ],
      });

      const res = await request(app)
        .patch('/api/notifications/mark-all-read')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);

      const unread = await prisma.notification.count({
        where: { userId: testUser.id, read: false },
      });
      expect(unread).toBe(0);
    });
  });

  describe('DELETE /api/notifications/:id', () => {
    it('should delete a notification', async () => {
      const notif = await prisma.notification.create({
        data: {
          userId: testUser.id,
          organizationId: org.id,
          type: 'SYSTEM',
          title: 'Delete me',
          message: 'msg',
          read: false,
        },
      });

      const res = await request(app)
        .delete(`/api/notifications/${notif.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.status).toBe(200);

      const deleted = await prisma.notification.findUnique({ where: { id: notif.id } });
      expect(deleted).toBeNull();
    });
  });

  describe('Unauthenticated access', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/notifications');
      expect(res.status).toBe(401);
    });
  });
});
