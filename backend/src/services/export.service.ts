/**
 * Export Service — Server-side generation of .xlsx / .csv files
 * Supports large datasets with streaming to avoid memory issues.
 * Phase 8.8
 */

import ExcelJS from 'exceljs';
import { prisma } from '../config/database';
import { Response } from 'express';
import { formatRate, calcOpenRate, calcClickRate, calcBounceRate } from '../utils/metricsCalculator';

export interface ExportOptions {
  organizationId: string;
  format: 'xlsx' | 'csv';
  type: 'leads' | 'campaigns' | 'activities';
  filters?: {
    status?: string;
    source?: string;
    assignedTo?: string;
    dateFrom?: string;
    dateTo?: string;
    tags?: string[];
  };
  fields?: string[];
}

const LEAD_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'First Name', key: 'firstName', width: 15 },
  { header: 'Last Name', key: 'lastName', width: 15 },
  { header: 'Email', key: 'email', width: 25 },
  { header: 'Phone', key: 'phone', width: 18 },
  { header: 'Company', key: 'company', width: 20 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Source', key: 'source', width: 14 },
  { header: 'Score', key: 'score', width: 8 },
  { header: 'Estimated Value', key: 'estimatedValue', width: 16 },
  { header: 'Tags', key: 'tags', width: 25 },
  { header: 'Assigned To', key: 'assignedTo', width: 20 },
  { header: 'Created At', key: 'createdAt', width: 22 },
  { header: 'Last Contacted', key: 'lastContactedAt', width: 22 },
  { header: 'Notes', key: 'notes', width: 40 },
];

const CAMPAIGN_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'Name', key: 'name', width: 25 },
  { header: 'Type', key: 'type', width: 12 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Subject', key: 'subject', width: 30 },
  { header: 'Recipients', key: 'audience', width: 12 },
  { header: 'Sent', key: 'sent', width: 10 },
  { header: 'Delivered', key: 'delivered', width: 12 },
  { header: 'Opened', key: 'opened', width: 10 },
  { header: 'Clicked', key: 'clicked', width: 10 },
  { header: 'Bounced', key: 'bounced', width: 10 },
  { header: 'Open Rate', key: 'openRate', width: 12 },
  { header: 'Click Rate', key: 'clickRate', width: 12 },
  { header: 'Bounce Rate', key: 'bounceRate', width: 12 },
  { header: 'Revenue', key: 'revenue', width: 12 },
  { header: 'ROI', key: 'roi', width: 10 },
  { header: 'Budget', key: 'budget', width: 12 },
  { header: 'Spent', key: 'spent', width: 12 },
  { header: 'Created At', key: 'createdAt', width: 22 },
  { header: 'Sent At', key: 'sentAt', width: 22 },
];

const ACTIVITY_COLUMNS: { header: string; key: string; width: number }[] = [
  { header: 'Type', key: 'type', width: 18 },
  { header: 'Description', key: 'description', width: 40 },
  { header: 'Lead', key: 'lead', width: 25 },
  { header: 'User', key: 'user', width: 20 },
  { header: 'Created At', key: 'createdAt', width: 22 },
];

/**
 * Stream export data as .xlsx or .csv directly to the HTTP response
 */
export async function exportToResponse(res: Response, options: ExportOptions): Promise<void> {
  const { organizationId, format, type, filters, fields } = options;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Master RealEstate Pro';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(type.charAt(0).toUpperCase() + type.slice(1));

  // Get columns based on type and optional field filter
  let columns = type === 'leads' ? LEAD_COLUMNS
    : type === 'campaigns' ? CAMPAIGN_COLUMNS
    : ACTIVITY_COLUMNS;

  if (fields && fields.length > 0) {
    columns = columns.filter(c => fields.includes(c.key));
  }

  sheet.columns = columns;

  // Style header row
  sheet.getRow(1).font = { bold: true, size: 11 };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };

  // Fetch data in batches to handle large datasets
  const BATCH_SIZE = 500;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    let rows: any[] = [];

    if (type === 'leads') {
      rows = await fetchLeadsBatch(organizationId, filters, skip, BATCH_SIZE);
    } else if (type === 'campaigns') {
      rows = await fetchCampaignsBatch(organizationId, filters, skip, BATCH_SIZE);
    } else if (type === 'activities') {
      rows = await fetchActivitiesBatch(organizationId, filters, skip, BATCH_SIZE);
    }

    for (const row of rows) {
      sheet.addRow(row);
    }

    hasMore = rows.length === BATCH_SIZE;
    skip += BATCH_SIZE;
  }

  // Add auto-filter
  if (sheet.rowCount > 1) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: sheet.rowCount, column: columns.length },
    };
  }

  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Set response headers and stream
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `${type}_export_${timestamp}`;

  if (format === 'xlsx') {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
    await workbook.xlsx.write(res);
  } else {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    // Write BOM for Excel compatibility
    res.write('\uFEFF');
    await workbook.csv.write(res);
  }

  res.end();
}

async function fetchLeadsBatch(
  organizationId: string,
  filters: ExportOptions['filters'],
  skip: number,
  take: number
): Promise<any[]> {
  const where: any = { organizationId };

  if (filters?.status) {
    where.status = filters.status.toUpperCase();
  }
  if (filters?.source) {
    where.source = filters.source.toUpperCase();
  }
  if (filters?.assignedTo) {
    where.assignedToId = filters.assignedTo;
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
  }

  const leads = await prisma.lead.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      tags: { select: { name: true } },
      assignedTo: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return leads.map((lead: any) => ({
    firstName: lead.firstName || '',
    lastName: lead.lastName || '',
    email: lead.email || '',
    phone: lead.phone || '',
    company: lead.company || '',
    status: lead.status || '',
    source: lead.source || '',
    score: lead.score || 0,
    estimatedValue: lead.estimatedValue != null ? `$${lead.estimatedValue}` : '',
    tags: (lead.tags || []).map((t: any) => t.name).join(', '),
    assignedTo: lead.assignedTo ? `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() || lead.assignedTo.email : '',
    createdAt: lead.createdAt ? new Date(lead.createdAt).toISOString() : '',
    lastContactedAt: lead.lastContactedAt ? new Date(lead.lastContactedAt).toISOString() : '',
    notes: typeof lead.notes === 'string' ? lead.notes : '',
  }));
}

async function fetchCampaignsBatch(
  organizationId: string,
  filters: ExportOptions['filters'],
  skip: number,
  take: number
): Promise<any[]> {
  const where: any = { organizationId };

  if (filters?.status) {
    where.status = filters.status.toUpperCase();
  }
  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });

  return campaigns.map((c: any) => ({
    name: c.name || '',
    type: c.type || '',
    status: c.status || '',
    subject: c.subject || '',
    audience: c.audience || 0,
    sent: c.sent || 0,
    delivered: c.delivered || 0,
    opened: c.opened || 0,
    clicked: c.clicked || 0,
    bounced: c.bounced || 0,
    openRate: `${formatRate(calcOpenRate(c.opened || 0, c.sent))}%`,
    clickRate: `${formatRate(calcClickRate(c.clicked || 0, c.sent))}%`,
    bounceRate: `${formatRate(calcBounceRate(c.bounced || 0, c.sent))}%`,
    revenue: c.revenue ?? 0,
    roi: c.roi != null ? `${formatRate(c.roi)}%` : 'N/A',
    budget: c.budget ?? 0,
    spent: c.spent ?? 0,
    createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : '',
    sentAt: c.lastSentAt ? new Date(c.lastSentAt).toISOString() : '',
  }));
}

async function fetchActivitiesBatch(
  organizationId: string,
  filters: ExportOptions['filters'],
  skip: number,
  take: number
): Promise<any[]> {
  const where: any = { organizationId };

  if (filters?.dateFrom || filters?.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
    if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo + 'T23:59:59.999Z');
  }

  const activities = await prisma.activity.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
    include: {
      lead: { select: { firstName: true, lastName: true, email: true } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  return activities.map((a: any) => ({
    type: a.type || '',
    description: a.description || '',
    lead: a.lead ? `${a.lead.firstName || ''} ${a.lead.lastName || ''}`.trim() || a.lead.email : '',
    user: a.user ? `${a.user.firstName || ''} ${a.user.lastName || ''}`.trim() || a.user.email : '',
    createdAt: a.createdAt ? new Date(a.createdAt).toISOString() : '',
  }));
}
