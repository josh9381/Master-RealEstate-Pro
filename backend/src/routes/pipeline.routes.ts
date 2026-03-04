import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getPipelines,
  getPipeline,
  getPipelineLeads,
  moveLeadToPipelineStage,
  createPipeline,
  updatePipeline,
  deletePipeline,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
  duplicatePipeline,
} from '../controllers/pipeline.controller'

const router = Router()

router.use(authenticate)

// Pipeline CRUD
router.get('/', getPipelines)
router.post('/', createPipeline)
router.get('/:id', getPipeline)
router.put('/:id', updatePipeline)
router.delete('/:id', deletePipeline)
router.post('/:id/duplicate', duplicatePipeline)

// Pipeline leads
router.get('/:id/leads', getPipelineLeads)
router.patch('/leads/:leadId/move', moveLeadToPipelineStage)

// Stage CRUD
router.post('/:id/stages', createStage)
router.put('/:id/stages/:stageId', updateStage)
router.delete('/:id/stages/:stageId', deleteStage)
router.patch('/:id/stages/reorder', reorderStages)

export default router
