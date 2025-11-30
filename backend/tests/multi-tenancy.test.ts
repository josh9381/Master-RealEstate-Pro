import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import app from '../src/server';
import { prisma } from '../src/config/database';

/**
 * Multi-Tenancy Isolation Tests
 * 
 * These tests verify that Josh and Arshia's data is completely isolated:
 * - Josh should only see his own leads, tags, campaigns, etc.
 * - Arshia should only see her own leads, tags, campaigns, etc.
 * - Neither should be able to access the other's data
 */

describe('Multi-Tenancy Isolation Tests', () => {
  let joshToken: string;
  let arshiaToken: string;
  let joshLeadId: string;
  let arshiaLeadId: string;
  let joshTagId: string;
  let arshiaTagId: string;

  beforeAll(async () => {
    // Login as Josh
    const joshLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'josh@realestate.com',
        password: 'josh123'
      });
    
    expect(joshLogin.status).toBe(200);
    joshToken = joshLogin.body.data.accessToken;

    // Login as Arshia
    const arshiaLogin = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'arshia@properties.com',
        password: 'arshia123'
      });
    
    expect(arshiaLogin.status).toBe(200);
    arshiaToken = arshiaLogin.body.data.accessToken;

    // Get Josh's lead ID
    const joshLeads = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${joshToken}`);
    joshLeadId = joshLeads.body.data.leads[0].id;

    // Get Arshia's lead ID
    const arshiaLeads = await request(app)
      .get('/api/leads')
      .set('Authorization', `Bearer ${arshiaToken}`);
    arshiaLeadId = arshiaLeads.body.data.leads[0].id;

    // Get Josh's tag ID
    const joshTags = await request(app)
      .get('/api/tags')
      .set('Authorization', `Bearer ${joshToken}`);
    joshTagId = joshTags.body.data.tags[0].id;

    // Get Arshia's tag ID
    const arshiaTags = await request(app)
      .get('/api/tags')
      .set('Authorization', `Bearer ${arshiaToken}`);
    arshiaTagId = arshiaTags.body.data.tags[0].id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Lead Isolation', () => {
    it('Josh should only see his own leads (3 leads)', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${joshToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.leads[0].email).toContain('example.com'); // Josh's leads
    });

    it('Arshia should only see her own leads (3 leads)', async () => {
      const response = await request(app)
        .get('/api/leads')
        .set('Authorization', `Bearer ${arshiaToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.leads[0].email).toContain('example.com'); // Arshia's leads
    });

    it('Josh should NOT be able to access Arshia\'s lead by ID', async () => {
      const response = await request(app)
        .get(`/api/leads/${arshiaLeadId}`)
        .set('Authorization', `Bearer ${joshToken}`);

      expect(response.status).toBe(404); // Should not be found
    });

    it('Arshia should NOT be able to access Josh\'s lead by ID', async () => {
      const response = await request(app)
        .get(`/api/leads/${joshLeadId}`)
        .set('Authorization', `Bearer ${arshiaToken}`);

      expect(response.status).toBe(404); // Should not be found
    });

    it('Josh should NOT be able to update Arshia\'s lead', async () => {
      const response = await request(app)
        .put(`/api/leads/${arshiaLeadId}`)
        .set('Authorization', `Bearer ${joshToken}`)
        .send({
          firstName: 'Hacked',
          lastName: 'ByJosh'
        });

      expect(response.status).toBe(404); // Should not be found
    });

    it('Arshia should NOT be able to delete Josh\'s lead', async () => {
      const response = await request(app)
        .delete(`/api/leads/${joshLeadId}`)
        .set('Authorization', `Bearer ${arshiaToken}`);

      expect(response.status).toBe(404); // Should not be found
    });
  });

  describe('Tag Isolation', () => {
    it('Josh should only see his own tags (3 tags)', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${joshToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(3);
    });

    it('Arshia should only see her own tags (3 tags)', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${arshiaToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(3);
    });

    it('Josh can create a tag with the same name as Arshia\'s tag', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${joshToken}`)
        .send({
          name: 'Premium Client', // This name exists in Arshia's org
          color: '#00ff00'
        });

      expect(response.status).toBe(201); // Should succeed (different organization)
    });

    it('Josh should NOT be able to access Arshia\'s tag by ID', async () => {
      const response = await request(app)
        .get(`/api/tags/${arshiaTagId}`)
        .set('Authorization', `Bearer ${joshToken}`);

      expect(response.status).toBe(404); // Should not be found
    });
  });

  describe('Email Uniqueness Per Organization', () => {
    it('Josh can create a lead with same email as Arshia\'s lead (different org)', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${joshToken}`)
        .send({
          firstName: 'Emily',
          lastName: 'Davis',
          email: 'emily.davis@example.com', // Exists in Arshia's org
          phone: '+1-555-9999',
          status: 'NEW'
        });

      expect(response.status).toBe(201); // Should succeed (different organization)
    });

    it('Arshia CANNOT create duplicate email in her own organization', async () => {
      const response = await request(app)
        .post('/api/leads')
        .set('Authorization', `Bearer ${arshiaToken}`)
        .send({
          firstName: 'Another',
          lastName: 'Emily',
          email: 'emily.davis@example.com', // Already exists in Arshia's org
          phone: '+1-555-8888',
          status: 'NEW'
        });

      expect(response.status).toBe(409); // Should conflict (same organization)
    });
  });

  describe('User Authentication & Organization', () => {
    it('Josh\'s token contains correct organization info', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${joshToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('josh@realestate.com');
      expect(response.body.data.user.organization.name).toBe('Josh Real Estate Agency');
    });

    it('Arshia\'s token contains correct organization info', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${arshiaToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe('arshia@properties.com');
      expect(response.body.data.user.organization.name).toBe('Arshia Property Group');
    });
  });

  describe('Cross-Tenant Tag Connection Prevention', () => {
    it('Josh should NOT be able to add Arshia\'s tag to his lead', async () => {
      const response = await request(app)
        .post(`/api/leads/${joshLeadId}/tags`)
        .set('Authorization', `Bearer ${joshToken}`)
        .send({
          tagIds: [arshiaTagId] // Arshia's tag ID
        });

      expect(response.status).toBe(400); // Should fail validation
    });
  });
});
