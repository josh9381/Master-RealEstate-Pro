"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const express_1 = __importDefault(require("express"));
const database_1 = require("../src/config/database");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const campaign_routes_1 = __importDefault(require("../src/routes/campaign.routes"));
const errorHandler_1 = require("../src/middleware/errorHandler");
const logger_1 = require("../src/middleware/logger");
const rateLimiter_1 = require("../src/middleware/rateLimiter");
const jwt_1 = require("../src/utils/jwt");
// Create test app
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(logger_1.requestLogger);
app.use(rateLimiter_1.generalLimiter);
app.use('/api/campaigns', campaign_routes_1.default);
app.use(errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
describe('Campaign Management Endpoints', () => {
    let testUser;
    let testAccessToken;
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
    describe('POST /api/campaigns', () => {
        it('should create a new campaign successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/campaigns')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Summer Sale Campaign',
                type: 'EMAIL',
                subject: 'Big Summer Sale!',
                body: 'Check out our amazing summer deals...',
                budget: 5000,
            });
            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.campaign).toHaveProperty('id');
            expect(response.body.data.campaign.name).toBe('Summer Sale Campaign');
            expect(response.body.data.campaign.type).toBe('EMAIL');
            expect(response.body.data.campaign.status).toBe('DRAFT');
            expect(response.body.data.campaign.createdById).toBe(testUser.id);
        });
        it('should create campaign with all optional fields', async () => {
            const startDate = new Date('2025-12-01').toISOString();
            const endDate = new Date('2025-12-31').toISOString();
            const response = await (0, supertest_1.default)(app)
                .post('/api/campaigns')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Holiday Campaign',
                type: 'SMS',
                status: 'SCHEDULED',
                subject: 'Holiday Greetings',
                body: 'Happy Holidays!',
                previewText: 'Season greetings from us',
                startDate,
                endDate,
                budget: 10000,
                audience: 5000,
                isABTest: true,
                abTestData: { variantA: 'Version A', variantB: 'Version B' },
            });
            expect(response.status).toBe(201);
            expect(response.body.data.campaign.status).toBe('SCHEDULED');
            expect(response.body.data.campaign.isABTest).toBe(true);
        });
        it('should return 400 for invalid campaign type', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/campaigns')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Test Campaign',
                type: 'INVALID_TYPE',
            });
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
        it('should return 401 without authorization', async () => {
            const response = await (0, supertest_1.default)(app)
                .post('/api/campaigns')
                .send({
                name: 'Unauthorized Campaign',
                type: 'EMAIL',
            });
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/campaigns', () => {
        beforeEach(async () => {
            // Create test campaigns
            await database_1.prisma.campaign.createMany({
                data: [
                    {
                        name: 'Email Campaign 1',
                        type: 'EMAIL',
                        status: 'ACTIVE',
                        createdById: testUser.id,
                        sent: 1000,
                        opened: 250,
                        clicked: 50,
                    },
                    {
                        name: 'SMS Campaign 1',
                        type: 'SMS',
                        status: 'COMPLETED',
                        createdById: testUser.id,
                        sent: 500,
                        opened: 400,
                    },
                    {
                        name: 'Social Campaign 1',
                        type: 'SOCIAL',
                        status: 'DRAFT',
                        createdById: testUser.id,
                    },
                ],
            });
        });
        it('should list all campaigns with pagination', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/campaigns')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.campaigns).toBeInstanceOf(Array);
            expect(response.body.data.campaigns.length).toBeGreaterThanOrEqual(3);
            expect(response.body.data.pagination).toHaveProperty('total');
            expect(response.body.data.pagination).toHaveProperty('page');
            // Check metrics are included
            response.body.data.campaigns.forEach((campaign) => {
                expect(campaign).toHaveProperty('metrics');
                expect(campaign.metrics).toHaveProperty('openRate');
                expect(campaign.metrics).toHaveProperty('clickRate');
            });
        });
        it('should filter campaigns by status', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/campaigns?status=ACTIVE')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            response.body.data.campaigns.forEach((campaign) => {
                expect(campaign.status).toBe('ACTIVE');
            });
        });
        it('should filter campaigns by type', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/campaigns?type=EMAIL')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            response.body.data.campaigns.forEach((campaign) => {
                expect(campaign.type).toBe('EMAIL');
            });
        });
        it('should search campaigns by name', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/campaigns?search=Email')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
        it('should return 401 without authorization', async () => {
            const response = await (0, supertest_1.default)(app).get('/api/campaigns');
            expect(response.status).toBe(401);
        });
    });
    describe('GET /api/campaigns/:id', () => {
        let campaignId;
        beforeEach(async () => {
            const campaign = await database_1.prisma.campaign.create({
                data: {
                    name: 'Test Campaign',
                    type: 'EMAIL',
                    status: 'DRAFT',
                    createdById: testUser.id,
                    sent: 100,
                    opened: 25,
                    clicked: 5,
                    revenue: 1000,
                    spent: 500,
                },
            });
            campaignId = campaign.id;
        });
        it('should get a single campaign by ID', async () => {
            const response = await (0, supertest_1.default)(app)
                .get(`/api/campaigns/${campaignId}`)
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.campaign.id).toBe(campaignId);
            expect(response.body.data.campaign.name).toBe('Test Campaign');
            expect(response.body.data.campaign.metrics).toHaveProperty('openRate');
            expect(response.body.data.campaign.metrics).toHaveProperty('roi');
            expect(response.body.data.campaign.metrics.openRate).toBe('25.00');
        });
        it('should return 404 for non-existent campaign', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/campaigns/nonexistent123')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
        });
    });
    describe('PUT /api/campaigns/:id', () => {
        let campaignId;
        beforeEach(async () => {
            const campaign = await database_1.prisma.campaign.create({
                data: {
                    name: 'Original Campaign',
                    type: 'EMAIL',
                    status: 'DRAFT',
                    createdById: testUser.id,
                },
            });
            campaignId = campaign.id;
        });
        it('should update campaign successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .put(`/api/campaigns/${campaignId}`)
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Updated Campaign',
                status: 'ACTIVE',
                subject: 'New Subject',
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.campaign.name).toBe('Updated Campaign');
            expect(response.body.data.campaign.status).toBe('ACTIVE');
            expect(response.body.data.campaign.subject).toBe('New Subject');
        });
        it('should calculate ROI when updating revenue and spent', async () => {
            const response = await (0, supertest_1.default)(app)
                .put(`/api/campaigns/${campaignId}`)
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                revenue: 2000,
                spent: 1000,
            });
            expect(response.status).toBe(200);
            expect(response.body.data.campaign.roi).toBe(100); // (2000-1000)/1000 * 100
        });
        it('should return 404 for non-existent campaign', async () => {
            const response = await (0, supertest_1.default)(app)
                .put('/api/campaigns/nonexistent123')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                name: 'Updated',
            });
            expect(response.status).toBe(404);
        });
    });
    describe('DELETE /api/campaigns/:id', () => {
        let campaignId;
        beforeEach(async () => {
            const campaign = await database_1.prisma.campaign.create({
                data: {
                    name: 'Campaign to Delete',
                    type: 'EMAIL',
                    createdById: testUser.id,
                },
            });
            campaignId = campaign.id;
        });
        it('should delete campaign successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete(`/api/campaigns/${campaignId}`)
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            // Verify campaign is deleted
            const deletedCampaign = await database_1.prisma.campaign.findUnique({
                where: { id: campaignId },
            });
            expect(deletedCampaign).toBeNull();
        });
        it('should return 404 for non-existent campaign', async () => {
            const response = await (0, supertest_1.default)(app)
                .delete('/api/campaigns/nonexistent123')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(404);
        });
    });
    describe('GET /api/campaigns/stats', () => {
        beforeEach(async () => {
            // Create campaigns with various statuses and types
            await database_1.prisma.campaign.createMany({
                data: [
                    {
                        name: 'Campaign 1',
                        type: 'EMAIL',
                        status: 'ACTIVE',
                        createdById: testUser.id,
                        sent: 1000,
                        opened: 300,
                        clicked: 50,
                        revenue: 5000,
                        spent: 2000,
                    },
                    {
                        name: 'Campaign 2',
                        type: 'SMS',
                        status: 'COMPLETED',
                        createdById: testUser.id,
                        sent: 500,
                        opened: 400,
                        revenue: 2000,
                        spent: 1000,
                    },
                    {
                        name: 'Campaign 3',
                        type: 'EMAIL',
                        status: 'DRAFT',
                        createdById: testUser.id,
                    },
                ],
            });
        });
        it('should return campaign statistics', async () => {
            const response = await (0, supertest_1.default)(app)
                .get('/api/campaigns/stats')
                .set('Authorization', `Bearer ${testAccessToken}`);
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.stats).toHaveProperty('total');
            expect(response.body.data.stats).toHaveProperty('byStatus');
            expect(response.body.data.stats).toHaveProperty('byType');
            expect(response.body.data.stats).toHaveProperty('metrics');
            expect(response.body.data.stats.metrics).toHaveProperty('openRate');
            expect(response.body.data.stats.metrics).toHaveProperty('totalRevenue');
        });
    });
    describe('PATCH /api/campaigns/:id/metrics', () => {
        let campaignId;
        beforeEach(async () => {
            const campaign = await database_1.prisma.campaign.create({
                data: {
                    name: 'Campaign with Metrics',
                    type: 'EMAIL',
                    status: 'ACTIVE',
                    createdById: testUser.id,
                    sent: 100,
                },
            });
            campaignId = campaign.id;
        });
        it('should update campaign metrics successfully', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch(`/api/campaigns/${campaignId}/metrics`)
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                delivered: 95,
                opened: 50,
                clicked: 10,
                converted: 2,
                revenue: 500,
            });
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.campaign.delivered).toBe(95);
            expect(response.body.data.campaign.opened).toBe(50);
            expect(response.body.data.campaign.clicked).toBe(10);
        });
        it('should return 404 for non-existent campaign', async () => {
            const response = await (0, supertest_1.default)(app)
                .patch('/api/campaigns/nonexistent123/metrics')
                .set('Authorization', `Bearer ${testAccessToken}`)
                .send({
                opened: 100,
            });
            expect(response.status).toBe(404);
        });
    });
});
