/**
 * A/B Testing Controller
 * Handles HTTP requests for A/B test management
 */

import { Request, Response } from 'express';
import { getABTestService } from '../services/abtest.service';
import { ABTestType } from '@prisma/client';

const abTestService = getABTestService();

/**
 * Create a new A/B test
 * POST /api/ab-tests
 */
export async function createTest(req: Request, res: Response) {
  try {
    const { name, description, type, variantA, variantB } = req.body;
    const organizationId = req.user?.organizationId;
    const createdBy = req.user?.userId;

    if (!organizationId || !createdBy) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !type || !variantA || !variantB) {
      return res.status(400).json({
        error: 'Missing required fields: name, type, variantA, variantB',
      });
    }

    // Validate type
    if (!Object.values(ABTestType).includes(type)) {
      return res.status(400).json({
        error: `Invalid test type. Must be one of: ${Object.values(ABTestType).join(', ')}`,
      });
    }

    const test = await abTestService.createTest({
      name,
      description,
      type,
      organizationId,
      createdBy,
      variantA,
      variantB,
    });

    res.status(201).json(test);
  } catch (error) {
    console.error('Error creating A/B test:', error);
    res.status(500).json({ error: 'Failed to create A/B test' });
  }
}

/**
 * Get all tests for organization
 * GET /api/ab-tests
 */
export async function getTests(req: Request, res: Response) {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tests = await abTestService.getTestsByOrganization(organizationId);

    res.json(tests);
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    res.status(500).json({ error: 'Failed to fetch A/B tests' });
  }
}

/**
 * Get a single test by ID
 * GET /api/ab-tests/:id
 */
export async function getTest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const test = await abTestService.getTestById(id);

    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Verify access
    if (test.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(test);
  } catch (error) {
    console.error('Error fetching A/B test:', error);
    res.status(500).json({ error: 'Failed to fetch A/B test' });
  }
}

/**
 * Get test results with analysis
 * GET /api/ab-tests/:id/results
 */
export async function getTestResults(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const results = await abTestService.getTestResults(id);
    const analysis = await abTestService.analyzeTest(id);

    res.json({
      results,
      analysis,
    });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ error: 'Failed to fetch test results' });
  }
}

/**
 * Start a test
 * POST /api/ab-tests/:id/start
 */
export async function startTest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (test.status !== 'DRAFT') {
      return res.status(400).json({ error: 'Can only start tests in DRAFT status' });
    }

    const updatedTest = await abTestService.startTest(id);

    res.json(updatedTest);
  } catch (error) {
    console.error('Error starting A/B test:', error);
    res.status(500).json({ error: 'Failed to start A/B test' });
  }
}

/**
 * Pause a test
 * POST /api/ab-tests/:id/pause
 */
export async function pauseTest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (test.status !== 'RUNNING') {
      return res.status(400).json({ error: 'Can only pause running tests' });
    }

    const updatedTest = await abTestService.pauseTest(id);

    res.json(updatedTest);
  } catch (error) {
    console.error('Error pausing A/B test:', error);
    res.status(500).json({ error: 'Failed to pause A/B test' });
  }
}

/**
 * Stop/complete a test
 * POST /api/ab-tests/:id/stop
 */
export async function stopTest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (test.status !== 'RUNNING' && test.status !== 'PAUSED') {
      return res.status(400).json({ error: 'Can only stop running or paused tests' });
    }

    const updatedTest = await abTestService.stopTest(id);

    res.json(updatedTest);
  } catch (error) {
    console.error('Error stopping A/B test:', error);
    res.status(500).json({ error: 'Failed to stop A/B test' });
  }
}

/**
 * Delete a test
 * DELETE /api/ab-tests/:id
 */
export async function deleteTest(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await abTestService.deleteTest(id);

    res.json({ message: 'Test deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting A/B test:', error);
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete A/B test' });
    }
  }
}

/**
 * Record test interaction (open/click/reply/conversion)
 * POST /api/ab-tests/:id/interaction
 */
export async function recordInteraction(req: Request, res: Response) {
  try {
    const { resultId, type } = req.body;

    if (!resultId || !type) {
      return res.status(400).json({ error: 'Missing resultId or type' });
    }

    let result;
    switch (type) {
      case 'open':
        result = await abTestService.recordOpen(resultId);
        break;
      case 'click':
        result = await abTestService.recordClick(resultId);
        break;
      case 'reply':
        result = await abTestService.recordReply(resultId);
        break;
      case 'conversion':
        result = await abTestService.recordConversion(resultId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid interaction type' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ error: 'Failed to record interaction' });
  }
}
