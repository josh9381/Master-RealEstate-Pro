"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const database_1 = require("../src/config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const lead_routes_1 = __importDefault(require("../src/routes/lead.routes"));
const errorHandler_1 = require("../src/middleware/errorHandler");
const logger_1 = require("../src/middleware/logger");
const rateLimiter_1 = require("../src/middleware/rateLimiter");
const jwt_1 = require("../src/utils/jwt");
// Create test app
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(logger_1.requestLogger);
app.use(rateLimiter_1.generalLimiter);
app.use('/api/leads', lead_routes_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
describe('Lead Management Endpoints', () => {
    let testUser;
    let testAccessToken;
    let createdLeadId;
    beforeEach(async () => {
        // Create a test user
        const hashedPassword = await bcryptjs_1.default.hash('TestPassword123!', 10);
        testUser = await database_1.prisma.user.create({
            data: {
                firstName: 'Test',
                lastName: 'User',
                email: `test${Date.now()}@example.com`,
                password: hashedPassword,
                role: 'USER',
            },
        });
        testAccessToken = (0, jwt_1.generateAccessToken)(testUser.id, testUser.email, testUser.role);
    });
    describe('POST /api/leads', () => {
        it('should create a new lead successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/leads')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'John Doe',
                email: `john${Date.now()}@example.com`,
                phone: '+1234567890',
                company: 'Acme Corp',
                position: 'CEO',
                source: 'website',
                value: 50000,
            });
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.lead).toHaveProperty('id');
            expect(response.body.data.lead.name).toBe('John Doe');
            expect(response.body.data.lead.company).toBe('Acme Corp');
            expect(response.body.data.lead.status).toBe('NEW');
            createdLeadId = response.body.data.lead.id;
        });
        it('should return 409 for duplicate email', async () => {
            const email = `duplicate${Date.now()}@example.com`;
            // Create first lead
            await (0, supertest_1.default)(app)
                .post('/api/leads')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'First Lead',
                email,
                phone: '+1234567890',
            });
            // Try to create duplicate
            const response = await (0, supertest_1.default)(app)
                .post('/api/leads')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Second Lead',
                email,
                phone: '+0987654321',
            });
            expect(response.status).toBe(409);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('A lead with this email already exists');
        });
        it('should return 400 for invalid email', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/leads')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Test Lead',
                email: 'invalid-email',
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it('should return 401 without authorization', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/leads')
                .send({
                name: 'Test Lead',
                email: 'test@example.com',
            });
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/leads', () => {
        beforeEach(async () => {
            // Create some test leads
            await database_1.prisma.lead.createMany({
                data: [
                    {
                        name: 'Lead 1',
                        email: `lead1${Date.now()}@example.com`,
                        status: 'NEW',
                        source: 'website',
                        score: 50,
                    },
                    {
                        name: 'Lead 2',
                        email: `lead2${Date.now()}@example.com`,
                        status: 'CONTACTED',
                        source: 'referral',
                        score: 75,
                    },
                ],
            });
        });
        it('should list all leads with pagination', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/leads')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.leads).toBeInstanceOf(Array);
            expect(response.body.data.pagination).toHaveProperty('total');
            expect(response.body.data.pagination).toHaveProperty('page');
            expect(response.body.data.pagination).toHaveProperty('limit');
        });
        it('should filter leads by status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/leads?status=CONTACTED')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // All returned leads should have CONTACTED status
            response.body.data.leads.forEach((lead) => {
                expect(lead.status).toBe('CONTACTED');
            });
        });
        it('should search leads by name', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/leads?search=Lead 1')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        it('should return 401 without authorization', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/leads');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/leads/:id', () => {
        let leadId;
        beforeEach(async () => {
            const lead = await database_1.prisma.lead.create({
                data: {
                    name: 'Test Lead',
                    email: `testlead${Date.now()}@example.com`,
                },
            });
            leadId = lead.id;
        });
        it('should get a single lead by ID', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/api/leads/${leadId}`)
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.lead.id).toBe(leadId);
            expect(response.body.data.lead.name).toBe('Test Lead');
        });
        it('should return 404 for non-existent lead', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/leads/nonexistent123')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
    describe('PUT /api/leads/:id', () => {
        let leadId;
        beforeEach(async () => {
            const lead = await database_1.prisma.lead.create({
                data: {
                    name: 'Original Name',
                    email: `original${Date.now()}@example.com`,
                    status: 'NEW',
                },
            });
            leadId = lead.id;
        });
        it('should update a lead successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .put(`/api/leads/${leadId}`)
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Updated Name',
                status: 'CONTACTED',
                score: 80,
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.lead.name).toBe('Updated Name');
            expect(response.body.data.lead.status).toBe('CONTACTED');
            expect(response.body.data.lead.score).toBe(80);
        });
        it('should return 404 for non-existent lead', async () => {
            const response = await (0, supertest_1.default)(app)
                .put('/api/leads/nonexistent123')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Updated Name',
            });
            expect(response.status).toBe(404);
        });
    });
    describe('DELETE /api/leads/:id', () => {
        let leadId;
        beforeEach(async () => {
            const lead = await database_1.prisma.lead.create({
                data: {
                    name: 'To Delete',
                    email: `delete${Date.now()}@example.com`,
                },
            });
            leadId = lead.id;
        });
        it('should delete a lead successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/leads/${leadId}`)
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Verify lead is deleted
            const deletedLead = await database_1.prisma.lead.findUnique({
                where: { id: leadId },
            });
            expect(deletedLead).toBeNull();
        });
        it('should return 404 for non-existent lead', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete('/api/leads/nonexistent123')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(404);
        });
    });
    describe('GET /api/leads/stats', () => {
        beforeEach(async () => {
            // Create leads with different statuses
            await database_1.prisma.lead.createMany({
                data: [
                    { name: 'Lead 1', email: `stat1${Date.now()}@example.com`, status: 'NEW', score: 50, value: 1000 },
                    { name: 'Lead 2', email: `stat2${Date.now()}@example.com`, status: 'CONTACTED', score: 70, value: 2000 },
                    { name: 'Lead 3', email: `stat3${Date.now()}@example.com`, status: 'QUALIFIED', score: 90, value: 3000 },
                ],
            });
        });
        it('should return lead statistics', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/leads/stats')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.stats).toHaveProperty('total');
            expect(response.body.data.stats).toHaveProperty('byStatus');
            expect(response.body.data.stats).toHaveProperty('averageScore');
            expect(response.body.data.stats).toHaveProperty('totalValue');
        });
    });
    describe('POST /api/leads/bulk-update', () => {
        let leadIds;
        beforeEach(async () => {
            const leads = await Promise.all([
                database_1.prisma.lead.create({
                    data: { name: 'Bulk 1', email: `bulk1${Date.now()}@example.com`, status: 'NEW' },
                }),
                database_1.prisma.lead.create({
                    data: { name: 'Bulk 2', email: `bulk2${Date.now()}@example.com`, status: 'NEW' },
                }),
            ]);
            leadIds = leads.map(l => l.id);
        });
        it('should bulk update leads successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/leads/bulk-update')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                leadIds,
                updates: {
                    status: 'CONTACTED',
                },
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.updatedCount).toBe(2);
            // Verify updates
            const updatedLeads = await database_1.prisma.lead.findMany({
                where: { id: { in: leadIds } },
            });
            updatedLeads.forEach(lead => {
                expect(lead.status).toBe('CONTACTED');
            });
        });
    });
    describe('POST /api/leads/bulk-delete', () => {
        let leadIds;
        beforeEach(async () => {
            const leads = await Promise.all([
                database_1.prisma.lead.create({
                    data: { name: 'Delete 1', email: `delete1${Date.now()}@example.com` },
                }),
                database_1.prisma.lead.create({
                    data: { name: 'Delete 2', email: `delete2${Date.now()}@example.com` },
                }),
            ]);
            leadIds = leads.map(l => l.id);
        });
        it('should bulk delete leads successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/leads/bulk-delete')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                leadIds,
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.deletedCount).toBe(2);
            // Verify deletion
            const deletedLeads = await database_1.prisma.lead.findMany({
                where: { id: { in: leadIds } },
            });
            expect(deletedLeads.length).toBe(0);
        });
    });
});
