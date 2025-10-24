import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../middleware/errorHandler';

/**
 * Get all notes for a lead
 * GET /api/leads/:leadId/notes
 */
export const getNotesForLead = async (req: Request, res: Response) => {
  const { leadId } = req.params;

  // Check if lead exists
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  const notes = await prisma.note.findMany({
    where: { leadId },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  res.json({
    success: true,
    data: {
      notes,
      total: notes.length,
    },
  });
};

/**
 * Get single note by ID
 * GET /api/notes/:id
 */
export const getNote = async (req: Request, res: Response) => {
  const { id } = req.params;

  const note = await prisma.note.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
      lead: {
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      },
    },
  });

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  res.json({
    success: true,
    data: { note },
  });
};

/**
 * Create note for a lead
 * POST /api/leads/:leadId/notes
 */
export const createNote = async (req: Request, res: Response) => {
  const { leadId } = req.params;
  const { content } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Check if lead exists
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new NotFoundError('Lead not found');
  }

  // Create the note
  const note = await prisma.note.create({
    data: {
      content,
      leadId,
      authorId: userId,
    },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: { note },
    message: 'Note created successfully',
  });
};

/**
 * Update note
 * PUT /api/notes/:id
 */
export const updateNote = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content } = req.body;
  const userId = req.user?.userId;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Check if note exists
  const existingNote = await prisma.note.findUnique({
    where: { id },
  });

  if (!existingNote) {
    throw new NotFoundError('Note not found');
  }

  // Check if user is the author
  if (existingNote.authorId !== userId) {
    throw new ForbiddenError('You can only edit your own notes');
  }

  // Update the note
  const note = await prisma.note.update({
    where: { id },
    data: { content },
    include: {
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatar: true,
        },
      },
    },
  });

  res.json({
    success: true,
    data: { note },
    message: 'Note updated successfully',
  });
};

/**
 * Delete note
 * DELETE /api/notes/:id
 */
export const deleteNote = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;
  const userRole = req.user?.role;

  if (!userId) {
    throw new ForbiddenError('User authentication required');
  }

  // Check if note exists
  const note = await prisma.note.findUnique({
    where: { id },
  });

  if (!note) {
    throw new NotFoundError('Note not found');
  }

  // Check if user is the author or an admin
  if (note.authorId !== userId && userRole !== 'ADMIN') {
    throw new ForbiddenError('You can only delete your own notes unless you are an admin');
  }

  // Delete the note
  await prisma.note.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Note deleted successfully',
  });
};
