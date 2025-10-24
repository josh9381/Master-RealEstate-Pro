import request from 'supertest';
import express from 'express';
import { prisma } from '../src/config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { generateAccessToken } from '../src/utils/jwt';
import type { User } from '@prisma/client';
import authRoutes from '../src/routes/auth.routes';
import { errorHandler, notFoundHandler } from '../src/middleware/errorHandler';
import { requestLogger } from '../src/middleware/logger';
import { generalLimiter } from '../src/middleware/rateLimiter';

// Create test app
const app = express();
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);
app.use('/api/auth', authRoutes);
app.use(notFoundHandler);
app.use(errorHandler);

describe('Middleware Tests', () => {
  const testUserPassword = 'TestPassword123!';
  let testUser: User;
  let testAccessToken: string;

  beforeEach(async () => {
    // Create a test user and generate token
    const hashedPassword = await bcrypt.hash(testUserPassword, 10);
    testUser = await prisma.user.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        email: 'middleware@test.com',
        password: hashedPassword,
        role: 'USER',
      },
    });

    testAccessToken = generateAccessToken(testUser.id, testUser.email, testUser.role);
  });

  describe('Error Handler Middleware', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown/route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Route not found');
    });

    it('should return proper error format for validation errors', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          // Missing required fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Another',
          lastName: 'User',
          email: testUser.email, // Same email as existing user
          password: 'Password123!',
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should return 401 for unauthorized access', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Validation Middleware', () => {
    it('should validate email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation error');
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          path: 'email',
        })
      );
    });

    it('should validate password length', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: '123', // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toContainEqual(
        expect.objectContaining({
          path: 'password',
        })
      );
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          // Missing all fields
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeDefined();
      expect(response.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('Authentication Middleware', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.id).toBe(testUser.id);
    });

    it('should reject request without authorization header', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('No authorization header provided');
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.here');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request with expired token', async () => {
      // Create an expired token (set expiry to past)
      const expiredToken = jwt.sign(
        { userId: testUser.id, email: testUser.email, role: testUser.role },
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Request Logger Middleware', () => {
    it('should log requests (test via console spy)', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await request(app).get('/api/auth/me');

      // Logger should have logged the request
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Async Handler', () => {
    it('should catch and forward async errors', async () => {
      // This test verifies that async errors are properly caught
      // We can test this by triggering a database error
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'SomePassword123!',
        });

      // Should get proper error response, not uncaught promise
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});
