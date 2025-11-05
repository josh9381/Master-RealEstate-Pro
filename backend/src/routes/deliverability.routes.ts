import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { asyncHandler } from '../utils/asyncHandler'
import {
  handleBounce,
  handleSpamComplaint,
  getCampaignStats,
  getStats,
  getRetryable,
  retryMessage,
  batchRetry,
  getBounceReportData,
  getSuppressed,
} from '../controllers/deliverability.controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   POST /api/deliverability/bounce
 * @desc    Record a bounce event
 * @access  Private
 */
router.post('/bounce', asyncHandler(handleBounce))

/**
 * @route   POST /api/deliverability/spam-complaint
 * @desc    Record a spam complaint
 * @access  Private
 */
router.post('/spam-complaint', asyncHandler(handleSpamComplaint))

/**
 * @route   GET /api/deliverability/campaign/:campaignId
 * @desc    Get deliverability statistics for a campaign
 * @access  Private
 */
router.get('/campaign/:campaignId', asyncHandler(getCampaignStats))

/**
 * @route   GET /api/deliverability/stats
 * @desc    Get overall deliverability statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(getStats))

/**
 * @route   GET /api/deliverability/retryable
 * @desc    Get messages eligible for retry
 * @access  Private
 */
router.get('/retryable', asyncHandler(getRetryable))

/**
 * @route   POST /api/deliverability/retry/:messageId
 * @desc    Retry a single failed message
 * @access  Private
 */
router.post('/retry/:messageId', asyncHandler(retryMessage))

/**
 * @route   POST /api/deliverability/retry/batch
 * @desc    Batch retry failed messages
 * @access  Private
 */
router.post('/retry/batch', asyncHandler(batchRetry))

/**
 * @route   GET /api/deliverability/bounce-report
 * @desc    Get bounce report grouped by reason
 * @access  Private
 */
router.get('/bounce-report', asyncHandler(getBounceReportData))

/**
 * @route   GET /api/deliverability/suppressed
 * @desc    Get suppressed email addresses
 * @access  Private
 */
router.get('/suppressed', asyncHandler(getSuppressed))

export default router
