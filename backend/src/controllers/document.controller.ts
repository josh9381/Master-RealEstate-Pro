import { Request, Response } from 'express';
import prisma from '../config/database';
import { deleteUploadFile, getUploadUrl } from '../config/upload';
import { logger } from '../lib/logger';
import { logActivity } from '../utils/activityLogger';

const MAX_DOCUMENTS_PER_LEAD = 20;

/**
 * Upload documents for a lead
 * POST /api/leads/:leadId/documents
 */
export async function uploadDocuments(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const userId = (req as any).user!.userId;
  const { leadId } = req.params;
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files uploaded' });
  }

  // Verify lead belongs to organization
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { id: true },
  });

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  // Check document limit
  const existingCount = await prisma.leadDocument.count({ where: { leadId } });
  if (existingCount + files.length > MAX_DOCUMENTS_PER_LEAD) {
    return res.status(400).json({
      success: false,
      message: `Maximum ${MAX_DOCUMENTS_PER_LEAD} documents per lead. Currently ${existingCount}, trying to add ${files.length}.`,
    });
  }

  const documents = await Promise.all(
    files.map(async (file) => {
      const storagePath = `documents/${file.filename}`;
      return prisma.leadDocument.create({
        data: {
          leadId,
          organizationId,
          uploadedById: userId,
          filename: file.originalname,
          storagePath,
          mimeType: file.mimetype,
          size: file.size,
        },
        include: {
          uploadedBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    })
  );

  logger.info(`${documents.length} document(s) uploaded for lead ${leadId} by user ${userId}`);

  logActivity({
    type: 'DOCUMENT_UPLOADED',
    title: `${documents.length} document(s) uploaded`,
    leadId,
    userId,
    organizationId,
  });

  res.status(201).json({
    success: true,
    data: documents.map((doc) => ({
      ...doc,
      url: getUploadUrl(doc.storagePath),
    })),
  });
}

/**
 * Get all documents for a lead
 * GET /api/leads/:leadId/documents
 */
export async function getDocuments(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const { leadId } = req.params;

  // Verify lead belongs to organization
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
    select: { id: true },
  });

  if (!lead) {
    return res.status(404).json({ success: false, message: 'Lead not found' });
  }

  const documents = await prisma.leadDocument.findMany({
    where: { leadId },
    include: {
      uploadedBy: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    success: true,
    data: documents.map((doc) => ({
      ...doc,
      url: getUploadUrl(doc.storagePath),
    })),
  });
}

/**
 * Delete a document
 * DELETE /api/leads/:leadId/documents/:documentId
 */
export async function deleteDocument(req: Request, res: Response) {
  const organizationId = (req as any).user!.organizationId;
  const { leadId, documentId } = req.params;

  const doc = await prisma.leadDocument.findFirst({
    where: { id: documentId, leadId, organizationId },
  });

  if (!doc) {
    return res.status(404).json({ success: false, message: 'Document not found' });
  }

  // Delete file from disk
  deleteUploadFile(`/uploads/${doc.storagePath}`);

  // Delete DB record
  await prisma.leadDocument.delete({ where: { id: documentId } });

  logger.info(`Document ${documentId} deleted from lead ${leadId}`);

  logActivity({
    type: 'DOCUMENT_DELETED',
    title: `Document deleted: ${doc.filename}`,
    leadId,
    userId: (req as any).user!.id,
    organizationId,
  });

  res.json({ success: true, message: 'Document deleted' });
}
