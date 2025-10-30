import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validateBody, validateQuery } from '../middleware/validate'
import { asyncHandler } from '../utils/asyncHandler'
import {
  sendEmailSchema,
  sendSMSSchema,
  makeCallSchema,
  messageQuerySchema,
  markAsReadSchema,
  replyToMessageSchema,
  messageIdSchema,
  threadIdSchema,
} from '../validators/message.validator'
import {
  getMessages,
  getMessage,
  sendEmail,
  sendSMS,
  makeCall,
  markAsRead,
  deleteMessage,
  getMessageStats,
  getThreadMessages,
  replyToMessage,
  markMessagesAsRead,
} from '../controllers/message.controller'

const router = Router()

// All message routes require authentication
router.use(authenticate)

/**
 * @route   GET /api/messages/stats
 * @desc    Get message statistics
 * @access  Private
 */
router.get('/stats', asyncHandler(getMessageStats))

/**
 * @route   GET /api/messages
 * @desc    Get all messages (inbox)
 * @access  Private
 */
router.get(
  '/',
  validateQuery(messageQuerySchema),
  asyncHandler(getMessages)
)

/**
 * @route   GET /api/messages/:id
 * @desc    Get single message
 * @access  Private
 */
router.get('/:id', asyncHandler(getMessage))

/**
 * @route   POST /api/messages/email
 * @desc    Send email
 * @access  Private
 */
router.post(
  '/email',
  validateBody(sendEmailSchema),
  asyncHandler(sendEmail)
)

/**
 * @route   POST /api/messages/sms
 * @desc    Send SMS
 * @access  Private
 */
router.post(
  '/sms',
  validateBody(sendSMSSchema),
  asyncHandler(sendSMS)
)

/**
 * @route   POST /api/messages/call
 * @desc    Make phone call
 * @access  Private
 */
router.post(
  '/call',
  validateBody(makeCallSchema),
  asyncHandler(makeCall)
)

/**
 * @route   PATCH /api/messages/:id/read
 * @desc    Mark message as read
 * @access  Private
 */
router.patch('/:id/read', asyncHandler(markAsRead))

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete message
 * @access  Private
 */
router.delete('/:id', asyncHandler(deleteMessage))

/**
 * @route   GET /api/messages/thread/:threadId
 * @desc    Get all messages in a thread
 * @access  Private
 */
router.get(
  '/thread/:threadId',
  asyncHandler(getThreadMessages)
)

/**
 * @route   POST /api/messages/:id/reply
 * @desc    Reply to a message
 * @access  Private
 */
router.post(
  '/:id/reply',
  validateBody(replyToMessageSchema),
  asyncHandler(replyToMessage)
)

/**
 * @route   POST /api/messages/mark-read
 * @desc    Mark multiple messages as read
 * @access  Private
 */
router.post(
  '/mark-read',
  validateBody(markAsReadSchema),
  asyncHandler(markMessagesAsRead)
)

export default router
