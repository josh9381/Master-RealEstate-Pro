"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const database_1 = require("../src/config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../src/utils/jwt");
const auth_routes_1 = __importDefault(require("../src/routes/auth.routes"));
const errorHandler_1 = require("../src/middleware/errorHandler");
const logger_1 = require("../src/middleware/logger");
const rateLimiter_1 = require("../src/middleware/rateLimiter");
// Create test app
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(logger_1.requestLogger);
app.use(rateLimiter_1.generalLimiter);
app.use('/api/auth', auth_routes_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
describe('Middleware Tests', () => {
    const testUserPassword = 'TestPassword123!';
    let testUser;
    let testAccessToken;
    beforeEach(async () => {
        // Create a test user and generate token
        const hashedPassword = await bcryptjs_1.default.hash(testUserPassword, 10);
        testUser = await database_1.prisma.user.create({
            data: {
                firstName: 'Test',
                lastName: 'User',
                email: 'middleware@test.com',
                password: hashedPassword,
                role: 'USER',
            },
        });
        testAccessToken = (0, jwt_1.generateAccessToken)(testUser.id, testUser.email, testUser.role);
    });
    describe('Error Handler Middleware', () => {
        it('should handle 404 for unknown routes', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/unknown/route');
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Route not found');
        });
        it('should return proper error format for validation errors', async () => {
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
    describe('Validation Middleware', () => {
        it('should validate email format', async () => {
            const response = await (0, supertest_1.default)(app)
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
            expect(response.body.details).toContainEqual(expect.objectContaining({
                path: 'email',
            }));
        });
        it('should validate password length', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                password: '123', // Too short
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.details).toContainEqual(expect.objectContaining({
                path: 'password',
            }));
        });
        it('should validate required fields', async () => {
            const response = await (0, supertest_1.default)(app)
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
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.id).toBe(testUser.id);
        });
        it('should reject request without authorization header', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/auth/me');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('No authorization header provided');
        });
        it('should reject request with malformed authorization header', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', 'InvalidFormat token123');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
        it('should reject request with invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid.token.here');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
        it('should reject request with expired token', async () => {
            // Create an expired token (set expiry to past)
            const expiredToken = jsonwebtoken_1.default.sign({ userId: testUser.id, email: testUser.email, role: testUser.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: '-1h' } // Expired 1 hour ago
            );
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
    describe('Request Logger Middleware', () => {
        it('should log requests (test via console spy)', async () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
            await (0, supertest_1.default)(app).get('/api/auth/me');
            // Logger should have logged the request
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
    });
    describe('Async Handler', () => {
        it('should catch and forward async errors', async () => {
            // This test verifies that async errors are properly caught
            // We can test this by triggering a database error
            const response = await (0, supertest_1.default)(app)
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
