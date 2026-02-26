import { Request, Response } from 'express'
import { prisma } from '../config/database'

// GET /api/reports/saved — List saved reports for the user's org
export const listSavedReports = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const reports = await prisma.savedReport.findMany({
      where: { organizationId },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    res.json({ success: true, data: reports })
  } catch (error: any) {
    console.error('Error listing saved reports:', error)
    res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}

// GET /api/reports/saved/:id — Get a single saved report
export const getSavedReport = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params

    const report = await prisma.savedReport.findFirst({
      where: { id, organizationId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    })

    if (!report) {
      return res.status(404).json({ success: false, error: 'Report not found' })
    }

    res.json({ success: true, data: report })
  } catch (error: any) {
    console.error('Error getting saved report:', error)
    res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}

// POST /api/reports/saved — Create a new saved report
export const createSavedReport = async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const organizationId = req.user!.organizationId
    const { name, description, type, config } = req.body

    if (!name || !config) {
      return res.status(400).json({ success: false, error: 'Name and config are required' })
    }

    const report = await prisma.savedReport.create({
      data: {
        name,
        description: description || null,
        type: type || 'leads',
        config,
        userId,
        organizationId,
      },
    })

    res.status(201).json({ success: true, data: report })
  } catch (error: any) {
    console.error('Error creating saved report:', error)
    res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}

// PUT /api/reports/saved/:id — Update a saved report
export const updateSavedReport = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params
    const { name, description, type, config } = req.body

    // Verify ownership
    const existing = await prisma.savedReport.findFirst({
      where: { id, organizationId },
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Report not found' })
    }

    const report = await prisma.savedReport.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(type !== undefined && { type }),
        ...(config !== undefined && { config }),
      },
    })

    res.json({ success: true, data: report })
  } catch (error: any) {
    console.error('Error updating saved report:', error)
    res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}

// DELETE /api/reports/saved/:id — Delete a saved report
export const deleteSavedReport = async (req: Request, res: Response) => {
  try {
    const organizationId = req.user!.organizationId
    const { id } = req.params

    // Verify ownership
    const existing = await prisma.savedReport.findFirst({
      where: { id, organizationId },
    })

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Report not found' })
    }

    await prisma.savedReport.delete({ where: { id } })

    res.json({ success: true, message: 'Report deleted' })
  } catch (error: any) {
    console.error('Error deleting saved report:', error)
    res.status(500).json({ success: false, error: error.message || 'Internal server error' })
  }
}
