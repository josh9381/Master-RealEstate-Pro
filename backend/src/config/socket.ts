import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { logger } from '../lib/logger'

let io: Server | null = null

interface AuthenticatedSocket extends Socket {
  userId?: string
  organizationId?: string
}

/**
 * Initialise Socket.io on the existing HTTP server.
 * Call this once during server startup.
 */
export function initSocketServer(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
        /\.app\.github\.dev$/,
      ],
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 10000,
    transports: ['websocket', 'polling'],
  })

  // Auth middleware — validate JWT before allowing connection
  io.use((socket: AuthenticatedSocket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '')

    if (!token) {
      return next(new Error('Authentication required'))
    }

    try {
      const secret = process.env.JWT_SECRET || 'dev-secret'
      const decoded = jwt.verify(token, secret) as {
        userId: string
        organizationId: string
      }
      socket.userId = decoded.userId
      socket.organizationId = decoded.organizationId
      next()
    } catch {
      return next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket: AuthenticatedSocket) => {
    const { userId, organizationId } = socket

    if (!userId || !organizationId) {
      socket.disconnect()
      return
    }

    // Join personal room and org room
    socket.join(`user:${userId}`)
    socket.join(`org:${organizationId}`)

    logger.info({ userId, socketId: socket.id }, 'Socket connected')

    // Client can join additional rooms (e.g., for a specific lead or campaign)
    socket.on('join', (room: string) => {
      // Only allow joining rooms scoped to their org
      if (room.startsWith(`org:${organizationId}:`)) {
        socket.join(room)
      }
    })

    socket.on('leave', (room: string) => {
      socket.leave(room)
    })

    socket.on('disconnect', (reason) => {
      logger.info({ userId, socketId: socket.id, reason }, 'Socket disconnected')
    })
  })

  logger.info('Socket.io server initialised')
  return io
}

/**
 * Get the Socket.io instance. Returns null if not initialised.
 */
export function getIO(): Server | null {
  return io
}

// ─── Emit helpers ────────────────────────────────────────────────────────────

/**
 * Send a notification to a specific user in real-time.
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  io?.to(`user:${userId}`).emit(event, data)
}

/**
 * Broadcast an event to everyone in an organisation.
 */
export function emitToOrg(orgId: string, event: string, data: unknown): void {
  io?.to(`org:${orgId}`).emit(event, data)
}

/**
 * Send a notification event to a specific user.
 * This is the primary helper other services should call.
 */
export function pushNotification(userId: string, notification: {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  createdAt: string
  data?: Record<string, unknown>
}): void {
  emitToUser(userId, 'notification', notification)
  emitToUser(userId, 'notification:count', { delta: 1 })
}

/**
 * Broadcast that a campaign finished executing.
 */
export function pushCampaignUpdate(orgId: string, campaign: {
  id: string
  name: string
  status: string
  sent?: number
  failed?: number
}): void {
  emitToOrg(orgId, 'campaign:update', campaign)
}

/**
 * Broadcast a workflow trigger event.
 */
export function pushWorkflowEvent(orgId: string, event: {
  workflowId: string
  workflowName: string
  action: string
  leadId?: string
}): void {
  emitToOrg(orgId, 'workflow:event', event)
}

/**
 * Broadcast new lead creation (e.g., from import or form submission).
 */
export function pushLeadUpdate(orgId: string, event: {
  type: 'created' | 'updated' | 'deleted' | 'imported'
  leadId?: string
  count?: number
}): void {
  emitToOrg(orgId, 'lead:update', event)
}
