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
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!name || !type || !variantA || !variantB) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, variantA, variantB',
      });
    }

    // Validate type
    if (!Object.values(ABTestType).includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid test type. Must be one of: ${Object.values(ABTestType).join(', ')}`,
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

    res.status(201).json({ success: true, data: test });
  } catch (error) {
    console.error('Error creating A/B test:', error);
    res.status(500).json({ success: false, message: 'Failed to create A/B test' });
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
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const tests = await abTestService.getTestsByOrganization(organizationId);

    res.json({ success: true, data: tests });
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch A/B tests' });
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
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const test = await abTestService.getTestById(id);

    if (!test) {
      return res.status(404).json({ success: false, message: 'Test not found' });
    }

    // Verify access
    if (test.organizationId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({ success: true, data: test });
  } catch (error) {
    console.error('Error fetching A/B test:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch A/B test' });
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
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const results = await abTestService.getTestResults(id);
    const analysis = await abTestService.analyzeTest(id);

    res.json({
      success: true,
      data: {
        results,
        analysis,
      },
    });
  } catch (error) {
    console.error('Error fetching test results:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch test results' });
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
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (test.status !== 'DRAFT') {
      return res.status(400).json({ success: false, message: 'Can only start tests in DRAFT status' });
    }

    const updatedTest = await abTestService.startTest(id);

    res.json({ success: true, data: updatedTest });
  } catch (error) {
    console.error('Error starting A/B test:', error);
    res.status(500).json({ success: false, message: 'Failed to start A/B test' });
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
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (test.status !== 'RUNNING') {
      return res.status(400).json({ success: false, message: 'Can only pause running tests' });
    }

    const updatedTest = await abTestService.pauseTest(id);

    res.json({ success: true, data: updatedTest });
  } catch (error) {
    console.error('Error pausing A/B test:', error);
    res.status(500).json({ success: false, message: 'Failed to pause A/B test' });
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
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (test.status !== 'RUNNING' && test.status !== 'PAUSED') {
      return res.status(400).json({ success: false, message: 'Can only stop running or paused tests' });
    }

    const updatedTest = await abTestService.stopTest(id);

    res.json({ success: true, data: updatedTest });
  } catch (error) {
    console.error('Error stopping A/B test:', error);
    res.status(500).json({ success: false, message: 'Failed to stop A/B test' });
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
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Verify access
    const test = await abTestService.getTestById(id);
    if (!test || test.organizationId !== organizationId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await abTestService.deleteTest(id);

    res.json({ success: true, message: 'Test deleted successfully' });
  } catch (error: unknown) {
    console.error('Error deleting A/B test:', error);
    if (error instanceof Error) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'Failed to delete A/B test' });
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
      return res.status(400).json({ success: false, message: 'Missing resultId or type' });
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
        return res.status(400).json({ success: false, message: 'Invalid interaction type' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error recording interaction:', error);
    res.status(500).json({ success: false, message: 'Failed to record interaction' });
  }
}
