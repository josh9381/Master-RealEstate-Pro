import { Request, Response } from 'express'
import {
  createSegment,
  getSegments,
  getSegmentById,
  updateSegment,
  deleteSegment,
  getSegmentMembers,
  refreshSegmentCounts,
} from '../services/segmentation.service'

export const list = async (req: Request, res: Response) => {
  const segments = await getSegments(req.user!.organizationId)
  res.json({ success: true, data: segments })
}

export const create = async (req: Request, res: Response) => {
  const { name, description, rules, matchType, color } = req.body

  if (!name || !rules || !Array.isArray(rules) || rules.length === 0) {
    return res.status(400).json({ success: false, message: 'name and rules[] are required' })
  }

  const segment = await createSegment({
    name,
    description,
    rules,
    matchType,
    color,
    organizationId: req.user!.organizationId,
  })

  res.status(201).json({ success: true, data: segment })
}

export const getById = async (req: Request, res: Response) => {
  const segment = await getSegmentById(req.params.id, req.user!.organizationId)
  res.json({ success: true, data: segment })
}

export const update = async (req: Request, res: Response) => {
  const { name, description, rules, matchType, color, isActive } = req.body
  const segment = await updateSegment(req.params.id, req.user!.organizationId, {
    name, description, rules, matchType, color, isActive,
  })
  res.json({ success: true, data: segment })
}

export const remove = async (req: Request, res: Response) => {
  await deleteSegment(req.params.id, req.user!.organizationId)
  res.json({ success: true, message: 'Segment deleted' })
}

export const members = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1
  const limit = parseInt(req.query.limit as string) || 50
  const result = await getSegmentMembers(req.params.id, req.user!.organizationId, { page, limit })
  res.json({ success: true, data: result })
}

export const refresh = async (req: Request, res: Response) => {
  await refreshSegmentCounts(req.user!.organizationId)
  res.json({ success: true, message: 'Segment counts refreshed' })
}
