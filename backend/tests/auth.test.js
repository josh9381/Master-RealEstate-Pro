"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const auth_routes_1 = __importDefault(require("../src/routes/auth.routes"));
const errorHandler_1 = require("../src/middleware/errorHandler");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use('/api/auth', auth_routes_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
const prisma = new client_1.PrismaClient();
describe('Authentication Endpoints', () => {
    let testUser;
    let testUserPassword = 'password123';
    beforeEach(async () => {
        // Create a test user before each test
        const hashedPassword = await bcryptjs_1.default.hash(testUserPassword, 10);
        testUser = await prisma.user.create({
            data: {
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com',
                password: hashedPassword,
                role: 'USER'
            }
        });
    });
    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: 'password123'
            });
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toHaveProperty('id');
            expect(response.body.data.user.email).toBe('john@example.com');
            expect(response.body.data.user.firstName).toBe('John');
            expect(response.body.data.user.lastName).toBe('Doe');
            expect(response.body.data.tokens).toHaveProperty('accessToken');
            expect(response.body.data.tokens).toHaveProperty('refreshToken');
        });
        it('should return 409 if email already exists', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                firstName: 'Test',
                lastName: 'User',
                email: 'test@example.com', // Same as testUser
                password: 'password123'
            });
            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('already exists');
        });
        it('should return 400 for invalid email', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                firstName: 'John',
                lastName: 'Doe',
                email: 'invalid-email',
                password: 'password123'
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation error');
        });
        it('should return 400 for short password', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                firstName: 'John',
                lastName: 'Doe',
                email: 'john@example.com',
                password: '123'
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Validation error');
        });
        it('should return 400 for missing fields', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/register')
                .send({
                email: 'john@example.com',
                password: 'password123'
                // Missing firstName and lastName
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
    describe('POST /api/auth/login', () => {
        it('should login successfully with valid credentials', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: testUserPassword
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('test@example.com');
            expect(response.body.data.tokens).toHaveProperty('accessToken');
            expect(response.body.data.tokens).toHaveProperty('refreshToken');
        });
        it('should return 401 for invalid email', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'wrong@example.com',
                password: testUserPassword
            });
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });
        it('should return 401 for invalid password', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: 'wrongpassword'
            });
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid credentials');
        });
        it('should update lastLoginAt on successful login', async () => {
            await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: testUserPassword
            });
            const updatedUser = await prisma.user.findUnique({
                where: { id: testUser.id }
            });
            expect(updatedUser?.lastLoginAt).toBeTruthy();
        });
    });
    describe('POST /api/auth/refresh', () => {
        it('should refresh access token with valid refresh token', async () => {
            // First login to get tokens
            const loginResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: testUserPassword
            });
            const { refreshToken } = loginResponse.body.data.tokens;
            // Use refresh token to get new access token
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .send({ refreshToken });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
        });
        it('should return 401 for invalid refresh token', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/auth/refresh')
                .send({ refreshToken: 'invalid-token' });
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
    describe('GET /api/auth/me', () => {
        it('should return user info with valid access token', async () => {
            // First login to get token
            const loginResponse = await (0, supertest_1.default)(app)
                .post('/api/auth/login')
                .send({
                email: 'test@example.com',
                password: testUserPassword
            });
            const { accessToken } = loginResponse.body.data.tokens;
            // Get user info
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${accessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.user.email).toBe('test@example.com');
            expect(response.body.data.user.firstName).toBe('Test');
            expect(response.body.data.user.lastName).toBe('User');
        });
        it('should return 401 without authorization header', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('authorization');
        });
        it('should return 401 with invalid token', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid-token');
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
        });
    });
});
