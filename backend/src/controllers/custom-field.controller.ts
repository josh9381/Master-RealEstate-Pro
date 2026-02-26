import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler';

/**
 * GET /api/custom-fields
 * List all custom field definitions for the user's organization
 */
export async function getCustomFields(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;

  const fields = await prisma.customFieldDefinition.findMany({
    where: { organizationId },
    orderBy: { order: 'asc' },
  });

  res.json({
    success: true,
    data: { fields },
    message: `Found ${fields.length} custom field definition(s)`,
  });
}

/**
 * GET /api/custom-fields/:id
 * Get a single custom field definition
 */
export async function getCustomField(req: Request, res: Response) {
  const { id } = req.params;
  const organizationId = req.user!.organizationId;

  const field = await prisma.customFieldDefinition.findFirst({
    where: { id, organizationId },
  });

  if (!field) throw new NotFoundError('Custom field definition not found');

  res.json({ success: true, data: { field } });
}

/**
 * POST /api/custom-fields
 * Create a new custom field definition
 */
export async function createCustomField(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;
  const { name, fieldKey, type, required, options, order, defaultValue, placeholder, validation } = req.body;

  // Auto-generate fieldKey if not provided
  const key = fieldKey || name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  // Check for duplicate fieldKey
  const existing = await prisma.customFieldDefinition.findFirst({
    where: { organizationId, fieldKey: key },
  });
  if (existing) throw new ConflictError(`A custom field with key "${key}" already exists`);

  // Validate dropdown has options
  if (type === 'dropdown' && (!options || options.length === 0)) {
    throw new ValidationError('Dropdown fields require at least one option');
  }

  // Determine order if not specified
  let fieldOrder = order;
  if (fieldOrder === undefined) {
    const maxOrder = await prisma.customFieldDefinition.aggregate({
      where: { organizationId },
      _max: { order: true },
    });
    fieldOrder = (maxOrder._max.order ?? -1) + 1;
  }

  const field = await prisma.customFieldDefinition.create({
    data: {
      organizationId,
      name,
      fieldKey: key,
      type,
      required: required ?? false,
      options: options || undefined,
      order: fieldOrder,
      defaultValue,
      placeholder,
      validation,
    },
  });

  res.status(201).json({
    success: true,
    data: { field },
    message: `Custom field "${name}" created successfully`,
  });
}

/**
 * PUT /api/custom-fields/:id
 * Update a custom field definition
 */
export async function updateCustomField(req: Request, res: Response) {
  const { id } = req.params;
  const organizationId = req.user!.organizationId;

  const existing = await prisma.customFieldDefinition.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError('Custom field definition not found');

  const { name, fieldKey, type, required, options, order, defaultValue, placeholder, validation } = req.body;

  // If changing fieldKey, check for duplicates
  if (fieldKey && fieldKey !== existing.fieldKey) {
    const duplicate = await prisma.customFieldDefinition.findFirst({
      where: { organizationId, fieldKey, id: { not: id } },
    });
    if (duplicate) throw new ConflictError(`A custom field with key "${fieldKey}" already exists`);
  }

  const field = await prisma.customFieldDefinition.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(fieldKey !== undefined && { fieldKey }),
      ...(type !== undefined && { type }),
      ...(required !== undefined && { required }),
      ...(options !== undefined && { options }),
      ...(order !== undefined && { order }),
      ...(defaultValue !== undefined && { defaultValue }),
      ...(placeholder !== undefined && { placeholder }),
      ...(validation !== undefined && { validation }),
    },
  });

  res.json({
    success: true,
    data: { field },
    message: `Custom field "${field.name}" updated successfully`,
  });
}

/**
 * DELETE /api/custom-fields/:id
 * Delete a custom field definition
 */
export async function deleteCustomField(req: Request, res: Response) {
  const { id } = req.params;
  const organizationId = req.user!.organizationId;

  const existing = await prisma.customFieldDefinition.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new NotFoundError('Custom field definition not found');

  await prisma.customFieldDefinition.delete({ where: { id } });

  res.json({
    success: true,
    message: `Custom field "${existing.name}" deleted successfully`,
  });
}

/**
 * PUT /api/custom-fields/reorder
 * Reorder custom field definitions
 */
export async function reorderCustomFields(req: Request, res: Response) {
  const organizationId = req.user!.organizationId;
  const { fieldIds } = req.body as { fieldIds: string[] };

  // Update each field's order in a transaction
  await prisma.$transaction(
    fieldIds.map((id, index) =>
      prisma.customFieldDefinition.updateMany({
        where: { id, organizationId },
        data: { order: index },
      })
    )
  );

  res.json({
    success: true,
    message: 'Custom fields reordered successfully',
  });
}
