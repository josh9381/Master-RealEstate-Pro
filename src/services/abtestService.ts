/**
 * A/B Testing Service
 * API client for A/B test management
 */

import api from '@/lib/api';

export interface ABTestVariant {
  subject?: string;
  content?: string;
  fromName?: string;
  sendTime?: string;
  ctaText?: string;
  [key: string]: unknown;
}

export interface CreateABTestInput {
  name: string;
  description?: string;
  type: 'EMAIL_SUBJECT' | 'EMAIL_CONTENT' | 'EMAIL_TIMING' | 'SMS_CONTENT' | 'LANDING_PAGE';
  variantA: ABTestVariant;
  variantB: ABTestVariant;
}

export interface ABTestResult {
  variant: string;
  participantCount: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  conversionRate: number;
}

export interface StatisticalAnalysis {
  isSignificant: boolean;
  confidence: number;
  winner: 'A' | 'B' | null;
  pValue: number;
}

export interface ABTest {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  variantA: ABTestVariant;
  variantB: ABTestVariant;
  participantCount: number;
  winnerId: string | null;
  confidence: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  _count?: {
    results: number;
  };
}

/**
 * Create a new A/B test
 */
export async function createABTest(data: CreateABTestInput): Promise<ABTest> {
  const response = await api.post('/ab-tests', data);
  return response.data;
}

/**
 * Get all tests for the organization
 */
export async function getABTests(): Promise<ABTest[]> {
  const response = await api.get('/ab-tests');
  return response.data;
}

/**
 * Get a single test by ID
 */
export async function getABTest(testId: string): Promise<ABTest> {
  const response = await api.get(`/ab-tests/${testId}`);
  return response.data;
}

/**
 * Get test results with statistical analysis
 */
export async function getABTestResults(testId: string): Promise<{
  results: {
    variantA: ABTestResult;
    variantB: ABTestResult;
  };
  analysis: StatisticalAnalysis;
}> {
  const response = await api.get(`/ab-tests/${testId}/results`);
  return response.data;
}

/**
 * Start a test
 */
export async function startABTest(testId: string): Promise<ABTest> {
  const response = await api.post(`/ab-tests/${testId}/start`);
  return response.data;
}

/**
 * Pause a test
 */
export async function pauseABTest(testId: string): Promise<ABTest> {
  const response = await api.post(`/ab-tests/${testId}/pause`);
  return response.data;
}

/**
 * Stop/complete a test
 */
export async function stopABTest(testId: string): Promise<ABTest> {
  const response = await api.post(`/ab-tests/${testId}/stop`);
  return response.data;
}

/**
 * Delete a test (only if in DRAFT status)
 */
export async function deleteABTest(testId: string): Promise<void> {
  await api.delete(`/ab-tests/${testId}`);
}

/**
 * Record test interaction
 */
export async function recordABTestInteraction(
  testId: string,
  resultId: string,
  type: 'open' | 'click' | 'reply' | 'conversion'
): Promise<void> {
  await api.post(`/ab-tests/${testId}/interaction`, {
    resultId,
    type,
  });
}
