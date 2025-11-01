"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// Use a separate test database
const testDbPath = path.join(__dirname, '..', 'prisma', 'test.db');
const prisma = new client_1.PrismaClient();
// Clean up database before each test suite
beforeAll(async () => {
    // Remove old test database if it exists
    if (fs.existsSync(testDbPath)) {
        fs.unlinkSync(testDbPath);
    }
    // Run migrations to create fresh database
    (0, child_process_1.execSync)('npx prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: `file:${testDbPath}` }
    });
});
// Clean up after all tests
// Note: We do NOT clean between individual tests to allow integration tests
// to maintain state and test workflows across multiple operations
afterAll(async () => {
    // Delete in correct order to avoid foreign key constraint violations
    // 1. Delete junction tables first (if they exist)
    try {
        await prisma.$executeRaw `DELETE FROM _LeadToTag`;
    }
    catch (error) {
        // Table might not exist or be empty, ignore
    }
    // 2. Delete dependent records (those with foreign keys to users/leads/campaigns)
    await prisma.activity.deleteMany().catch(() => { });
    await prisma.task.deleteMany().catch(() => { });
    await prisma.note.deleteMany().catch(() => { });
    await prisma.appointment.deleteMany().catch(() => { });
    await prisma.message.deleteMany().catch(() => { });
    await prisma.emailTemplate.deleteMany().catch(() => { });
    await prisma.sMSTemplate.deleteMany().catch(() => { });
    await prisma.workflow.deleteMany().catch(() => { });
    await prisma.workflowExecution.deleteMany().catch(() => { });
    // 3. Delete parent records
    await prisma.campaign.deleteMany().catch(() => { });
    await prisma.lead.deleteMany().catch(() => { });
    await prisma.tag.deleteMany().catch(() => { });
    await prisma.user.deleteMany().catch(() => { });
    // Disconnect from database
    await prisma.$disconnect();
});
