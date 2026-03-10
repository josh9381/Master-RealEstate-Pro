/**
 * Support Ticket Routes — Phase 9.7b
 * Authenticated endpoints for creating/managing support tickets
 */
import { logger } from '../lib/logger'
import { Router, Request, Response } from 'express'
import { TicketStatus, TicketPriority } from '@prisma/client'
import prisma from '../config/database'
import { authenticate, requireAdmin } from '../middleware/auth'
import { logAudit, getRequestContext } from '../services/audit.service'

const router = Router()

router.use(authenticate)

// ── List tickets for current user's org ──────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      status,
      priority,
      category,
      search,
      page = '1',
      limit = '20',
    } = req.query

    const orgId = req.user!.organizationId
    const isAdmin = req.user!.role === 'ADMIN'
    const take = Math.min(parseInt(limit as string, 10) || 20, 100)
    const skip = ((parseInt(page as string, 10) || 1) - 1) * take

    const where: Record<string, unknown> = { organizationId: orgId }

    // Non-admins only see their own tickets
    if (!isAdmin) {
      where.createdById = req.user!.userId
    }

    if (status && Object.values(TicketStatus).includes(status as TicketStatus)) {
      where.status = status as TicketStatus
    }
    if (priority && Object.values(TicketPriority).includes(priority as TicketPriority)) {
      where.priority = priority as TicketPriority
    }
    if (category) {
      where.category = category as string
    }
    if (search) {
      where.OR = [
        { subject: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where: where as any,
        include: {
          _count: { select: { messages: true } },
        },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      prisma.supportTicket.count({ where: where as any }),
    ])

    res.json({
      success: true,
      data: {
        tickets,
        pagination: {
          page: parseInt(page as string, 10) || 1,
          limit: take,
          total,
          totalPages: Math.ceil(total / take),
        },
      },
    })
  } catch (error) {
    logger.error('Error listing support tickets:', error)
    res.status(500).json({ success: false, message: 'Failed to list tickets' })
  }
})

// ── Get ticket stats for the org ─────────────────────────────────────────────
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const orgId = req.user!.organizationId
    const isAdmin = req.user!.role === 'ADMIN'
    const baseWhere: Record<string, unknown> = { organizationId: orgId }
    if (!isAdmin) {
      baseWhere.createdById = req.user!.userId
    }

    const [open, inProgress, resolved, closed] = await Promise.all([
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'OPEN' } as any }),
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'IN_PROGRESS' } as any }),
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'RESOLVED' } as any }),
      prisma.supportTicket.count({ where: { ...baseWhere, status: 'CLOSED' } as any }),
    ])

    res.json({
      success: true,
      data: { open, inProgress, resolved, closed, total: open + inProgress + resolved + closed },
    })
  } catch (error) {
    logger.error('Error fetching ticket stats:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch stats' })
  }
})

// ── Get single ticket with messages ──────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' })
      return
    }

    // Non-admins can only see their own tickets
    if (req.user!.role !== 'ADMIN' && ticket.createdById !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Forbidden' })
      return
    }

    res.json({ success: true, data: ticket })
  } catch (error) {
    logger.error('Error fetching ticket:', error)
    res.status(500).json({ success: false, message: 'Failed to fetch ticket' })
  }
})

// ── Create ticket ────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subject, description, category, priority } = req.body

    if (!subject?.trim() || !description?.trim()) {
      res.status(400).json({ success: false, message: 'Subject and description are required' })
      return
    }

    const validPriority = priority && Object.values(TicketPriority).includes(priority)
      ? priority as TicketPriority
      : 'MEDIUM'

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId: req.user!.organizationId,
        createdById: req.user!.userId,
        subject: subject.trim(),
        description: description.trim(),
        category: category?.trim() || null,
        priority: validPriority,
      },
    })

    // Log audit
    logAudit({
      action: 'CREATED',
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
      entityType: 'SupportTicket',
      entityId: ticket.id,
      description: `Created support ticket: ${subject}`,
      ...getRequestContext(req),
    })

    res.status(201).json({ success: true, data: ticket })
  } catch (error) {
    logger.error('Error creating ticket:', error)
    res.status(500).json({ success: false, message: 'Failed to create ticket' })
  }
})

// ── Add message to ticket ────────────────────────────────────────────────────
router.post('/:id/messages', async (req: Request, res: Response) => {
  try {
    const { content } = req.body

    if (!content?.trim()) {
      res.status(400).json({ success: false, message: 'Message content is required' })
      return
    }

    // Verify ticket exists and user has access
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
    })

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' })
      return
    }

    if (req.user!.role !== 'ADMIN' && ticket.createdById !== req.user!.userId) {
      res.status(403).json({ success: false, message: 'Forbidden' })
      return
    }

    const isStaff = req.user!.role === 'ADMIN'

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: req.user!.userId,
        content: content.trim(),
        isStaffReply: isStaff,
      },
    })

    // Re-open ticket if it was resolved/closed and user replies
    if (!isStaff && (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED')) {
      await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: 'OPEN' },
      })
    }

    res.status(201).json({ success: true, data: message })
  } catch (error) {
    logger.error('Error adding message:', error)
    res.status(500).json({ success: false, message: 'Failed to add message' })
  }
})

// ── Update ticket status (admin only) ────────────────────────────────────────
router.patch('/:id/status', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status } = req.body

    if (!status || !Object.values(TicketStatus).includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' })
      return
    }

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
    })

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' })
      return
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: status as TicketStatus,
        closedAt: (status === 'CLOSED' || status === 'RESOLVED') ? new Date() : null,
      },
    })

    logAudit({
      action: 'UPDATED',
      userId: req.user!.userId,
      organizationId: req.user!.organizationId,
      entityType: 'SupportTicket',
      entityId: ticket.id,
      description: `Changed ticket status from ${ticket.status} to ${status}`,
      beforeData: { status: ticket.status } as unknown,
      afterData: { status } as unknown,
      ...getRequestContext(req),
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    logger.error('Error updating ticket status:', error)
    res.status(500).json({ success: false, message: 'Failed to update status' })
  }
})

// ── Assign ticket (admin only) ───────────────────────────────────────────────
router.patch('/:id/assign', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { assignedToId } = req.body

    const ticket = await prisma.supportTicket.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.user!.organizationId,
      },
    })

    if (!ticket) {
      res.status(404).json({ success: false, message: 'Ticket not found' })
      return
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        assignedToId: assignedToId || null,
        status: assignedToId ? 'IN_PROGRESS' : ticket.status,
      },
    })

    res.json({ success: true, data: updated })
  } catch (error) {
    logger.error('Error assigning ticket:', error)
    res.status(500).json({ success: false, message: 'Failed to assign ticket' })
  }
})

export default router
