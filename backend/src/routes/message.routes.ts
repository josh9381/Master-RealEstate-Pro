import { Router } from 'express'
import multer from 'multer'
import path from 'path'
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
  markAsUnread,
  deleteMessage,
  getMessageStats,
  getThreadMessages,
  replyToMessage,
  markMessagesAsRead,
  markMessagesAsUnread,
  markAllAsRead,
  starMessage,
  archiveMessage,
  snoozeMessage,
} from '../controllers/message.controller'

const router = Router()

// Blocked file extensions — executables and scripts (#99)
const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.bat', '.sh', '.cmd', '.com', '.js', '.vbs', '.ps1',
  '.msi', '.dll', '.scr', '.pif', '.hta', '.cpl', '.inf', '.reg',
  '.ws', '.wsf', '.wsc', '.wsh',
])

// Allowed file extensions for message attachments
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.txt', '.csv', '.rtf', '.zip', '.gz',
])

// Attachment upload multer config (#99, #100)
// Uses disk storage instead of memory storage for large files
const attachmentUpload = multer({
  storage: multer.diskStorage({
    destination: '/tmp/uploads',
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix + path.extname(file.originalname))
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB per file
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (BLOCKED_EXTENSIONS.has(ext)) {
      cb(new Error(`Blocked file type: ${ext}. Executable files are not allowed.`) as any, false)
      return
    }
    if (ALLOWED_EXTENSIONS.size > 0 && !ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error(`Unsupported file type: ${ext}`) as any, false)
      return
    }
    cb(null, true)
  },
})

// All message routes require authentication
router.use(authenticate)

/**
 * @route   POST /api/messages/attachments
 * @desc    Upload message attachment (#99)
 * @access  Private
 */
router.post(
  '/attachments',
  attachmentUpload.single('file'),
  asyncHandler(async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }
    // Return file metadata — actual file storage (S3/R2) would be wired here
    res.json({
      success: true,
      data: {
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
      },
    })
  })
)

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
 * @route   PATCH /api/messages/:id/unread
 * @desc    Mark message as unread
 * @access  Private
 */
router.patch('/:id/unread', asyncHandler(markAsUnread))

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

/**
 * @route   POST /api/messages/mark-unread
 * @desc    Mark multiple messages as unread
 * @access  Private
 */
router.post(
  '/mark-unread',
  validateBody(markAsReadSchema),
  asyncHandler(markMessagesAsUnread)
)

/**
 * @route   POST /api/messages/mark-all-read
 * @desc    Mark all messages as read
 * @access  Private
 */
router.post(
  '/mark-all-read',
  asyncHandler(markAllAsRead)
)

/**
 * @route   PATCH /api/messages/:id/star
 * @desc    Star/unstar a message
 * @access  Private
 */
router.patch('/:id/star', asyncHandler(starMessage))

/**
 * @route   PATCH /api/messages/:id/archive
 * @desc    Archive/unarchive a message
 * @access  Private
 */
router.patch('/:id/archive', asyncHandler(archiveMessage))

/**
 * @route   PATCH /api/messages/:id/snooze
 * @desc    Snooze/unsnooze a message
 * @access  Private
 */
router.patch('/:id/snooze', asyncHandler(snoozeMessage))

export default router
