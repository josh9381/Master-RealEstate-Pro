import { Request, Response } from 'express'
import {
  recordBounce,
  recordSpamComplaint,
  getCampaignDeliverability,
  getOverallDeliverability,
  retryFailedMessage,
  batchRetryMessages,
  getRetryableMessages,
  getBounceReport,
  getSuppressedEmails,
} from '../services/emailDeliverability.service'

/**
 * Record a bounce event
 * POST /api/deliverability/bounce
 */
export async function handleBounce(req: Request, res: Response): Promise<void> {
  try {
    const { messageId, bounceType, reason, timestamp } = req.body

    if (!messageId || !bounceType || !reason) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: messageId, bounceType, reason',
      })
      return
    }

    await recordBounce({
      messageId,
      bounceType,
      reason,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
    })

    res.status(200).json({
      success: true,
      message: 'Bounce event recorded successfully',
    })
  } catch (error) {
    const err = error as Error
    console.error('Error recording bounce:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to record bounce event',
      error: err.message,
    })
  }
}

/**
 * Record a spam complaint
 * POST /api/deliverability/spam-complaint
 */
export async function handleSpamComplaint(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { messageId, timestamp } = req.body

    if (!messageId) {
      res.status(400).json({
        success: false,
        message: 'Missing required field: messageId',
      })
      return
    }

    await recordSpamComplaint(
      messageId,
      timestamp ? new Date(timestamp) : new Date()
    )

    res.status(200).json({
      success: true,
      message: 'Spam complaint recorded successfully',
    })
  } catch (error) {
    const err = error as Error
    console.error('Error recording spam complaint:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to record spam complaint',
      error: err.message,
    })
  }
}

/**
 * Get campaign deliverability statistics
 * GET /api/deliverability/campaign/:campaignId
 */
export async function getCampaignStats(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { campaignId } = req.params

    const stats = await getCampaignDeliverability(campaignId)

    res.status(200).json({
      success: true,
      data: stats,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error getting campaign deliverability:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to get campaign deliverability statistics',
      error: err.message,
    })
  }
}

/**
 * Get overall deliverability statistics
 * GET /api/deliverability/stats
 */
export async function getStats(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate } = req.query

    const stats = await getOverallDeliverability(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    )

    res.status(200).json({
      success: true,
      data: stats,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error getting overall deliverability:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to get deliverability statistics',
      error: err.message,
    })
  }
}

/**
 * Get retryable messages
 * GET /api/deliverability/retryable
 */
export async function getRetryable(req: Request, res: Response): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100

    const messages = await getRetryableMessages(limit)

    res.status(200).json({
      success: true,
      data: messages,
      count: messages.length,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error getting retryable messages:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to get retryable messages',
      error: err.message,
    })
  }
}

/**
 * Retry a single failed message
 * POST /api/deliverability/retry/:messageId
 */
export async function retryMessage(req: Request, res: Response): Promise<void> {
  try {
    const { messageId } = req.params

    const success = await retryFailedMessage(messageId)

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Message queued for retry',
      })
    } else {
      res.status(400).json({
        success: false,
        message: 'Message not eligible for retry (max retries exceeded or hard bounce)',
      })
    }
  } catch (error) {
    const err = error as Error
    console.error('Error retrying message:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to retry message',
      error: err.message,
    })
  }
}

/**
 * Batch retry failed messages
 * POST /api/deliverability/retry/batch
 */
export async function batchRetry(req: Request, res: Response): Promise<void> {
  try {
    const { messageIds } = req.body

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'messageIds must be a non-empty array',
      })
      return
    }

    const result = await batchRetryMessages(messageIds)

    res.status(200).json({
      success: true,
      data: result,
      message: `Retried ${result.retried} messages, skipped ${result.skipped}, ${result.errors} errors`,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error batch retrying messages:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to batch retry messages',
      error: err.message,
    })
  }
}

/**
 * Get bounce report
 * GET /api/deliverability/bounce-report
 */
export async function getBounceReportData(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { startDate, endDate } = req.query

    const report = await getBounceReport(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    )

    res.status(200).json({
      success: true,
      data: report,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error getting bounce report:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to get bounce report',
      error: err.message,
    })
  }
}

/**
 * Get suppressed emails
 * GET /api/deliverability/suppressed
 */
export async function getSuppressed(req: Request, res: Response): Promise<void> {
  try {
    const emails = await getSuppressedEmails()

    res.status(200).json({
      success: true,
      data: emails,
      count: emails.length,
    })
  } catch (error) {
    const err = error as Error
    console.error('Error getting suppressed emails:', err)
    res.status(500).json({
      success: false,
      message: 'Failed to get suppressed emails',
      error: err.message,
    })
  }
}
