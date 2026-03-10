/**
 * Lead Import Service
 * Handles CSV, Excel (XLSX/XLS), and vCard (VCF) parsing,
 * column mapping, duplicate detection, and batch import.
 */
import { parse as csvParse } from 'csv-parse/sync';
import ExcelJS from 'exceljs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const vCard = require('vcf');
import prisma from '../config/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedRow {
  [key: string]: string;
}

export interface PreviewResult {
  headers: string[];
  rows: ParsedRow[];
  totalRows: number;
  fileType: 'csv' | 'xlsx' | 'vcf';
}

export interface ColumnMapping {
  /** Source column header from the file */
  source: string;
  /** Target lead field to map to */
  target: string;
}

/** The lead fields we support mapping to */
export const MAPPABLE_FIELDS = [
  { key: 'firstName', label: 'First Name', required: true },
  { key: 'lastName', label: 'Last Name', required: true },
  { key: 'email', label: 'Email', required: true },
  { key: 'phone', label: 'Phone', required: false },
  { key: 'company', label: 'Company', required: false },
  { key: 'position', label: 'Position / Title', required: false },
  { key: 'source', label: 'Lead Source', required: false },
  { key: 'value', label: 'Deal Value', required: false },
  { key: 'stage', label: 'Pipeline Stage', required: false },
  // Real-estate specific
  { key: 'propertyType', label: 'Property Type', required: false },
  { key: 'transactionType', label: 'Transaction Type', required: false },
  { key: 'budgetMin', label: 'Budget Min', required: false },
  { key: 'budgetMax', label: 'Budget Max', required: false },
  { key: 'preApprovalStatus', label: 'Pre-Approval Status', required: false },
  { key: 'moveInTimeline', label: 'Move-In Timeline', required: false },
  { key: 'desiredLocation', label: 'Desired Location', required: false },
  { key: 'bedsMin', label: 'Min Bedrooms', required: false },
  { key: 'bathsMin', label: 'Min Bathrooms', required: false },
] as const;

export type DuplicateAction = 'skip' | 'overwrite' | 'create';

export interface DuplicateMatch {
  rowIndex: number;
  row: ParsedRow;
  existingLeadId: string;
  existingLeadName: string;
  existingLeadEmail: string;
  matchReason: string;
}

export interface ImportOptions {
  organizationId: string;
  userId: string;
  columnMappings: ColumnMapping[];
  duplicateAction: DuplicateAction;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  total: number;
  duplicatesFound: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Auto-mapping heuristics
// ---------------------------------------------------------------------------

const HEADER_ALIASES: Record<string, string[]> = {
  firstName: ['first name', 'firstname', 'first_name', 'given name', 'givenname', 'first'],
  lastName: ['last name', 'lastname', 'last_name', 'surname', 'family name', 'familyname', 'last'],
  email: ['email', 'e-mail', 'email address', 'emailaddress', 'email_address'],
  phone: ['phone', 'phone number', 'phonenumber', 'phone_number', 'telephone', 'tel', 'mobile', 'cell'],
  company: ['company', 'company name', 'companyname', 'company_name', 'organization', 'org'],
  position: ['position', 'title', 'job title', 'jobtitle', 'job_title', 'role'],
  source: ['source', 'lead source', 'leadsource', 'lead_source', 'origin'],
  value: ['value', 'deal value', 'dealvalue', 'deal_value', 'amount', 'worth'],
  stage: ['stage', 'pipeline stage', 'pipelinestage', 'pipeline_stage', 'status'],
  // Real-estate specific
  propertyType: ['property type', 'propertytype', 'property_type', 'prop type'],
  transactionType: ['transaction type', 'transactiontype', 'transaction_type', 'buyer/seller', 'buyer seller'],
  budgetMin: ['budget min', 'budgetmin', 'budget_min', 'min budget', 'min price', 'price min'],
  budgetMax: ['budget max', 'budgetmax', 'budget_max', 'max budget', 'max price', 'price max'],
  preApprovalStatus: ['pre-approval', 'preapproval', 'pre_approval', 'pre-approval status', 'financing'],
  moveInTimeline: ['move-in timeline', 'timeline', 'move in', 'movein', 'move_in_timeline', 'timeframe'],
  desiredLocation: ['desired location', 'location', 'desired area', 'target area', 'neighborhood', 'desired_location'],
  bedsMin: ['beds', 'bedrooms', 'min beds', 'min bedrooms', 'beds_min'],
  bathsMin: ['baths', 'bathrooms', 'min baths', 'min bathrooms', 'baths_min'],
};

/** Try to auto-map file header to a lead field */
export function autoMapHeaders(headers: string[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedTargets = new Set<string>();

  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    let matched = false;

    for (const [fieldKey, aliases] of Object.entries(HEADER_ALIASES)) {
      if (usedTargets.has(fieldKey)) continue;
      if (aliases.includes(normalized)) {
        mappings.push({ source: header, target: fieldKey });
        usedTargets.add(fieldKey);
        matched = true;
        break;
      }
    }

    // Handle "name" → split into firstName + lastName
    if (!matched && normalized === 'name') {
      if (!usedTargets.has('firstName')) {
        mappings.push({ source: header, target: 'firstName' });
        usedTargets.add('firstName');
        // lastName will be derived from the same column by splitting
      }
    }

    if (!matched && !usedTargets.has(normalized)) {
      // Not mapped — leave it unmapped (user can assign manually)
      mappings.push({ source: header, target: '' });
    }
  }

  return mappings;
}

// ---------------------------------------------------------------------------
// File Parsers
// ---------------------------------------------------------------------------

/** Parse a CSV buffer into headers + rows */
export function parseCSV(buffer: Buffer): PreviewResult {
  const csv = buffer.toString('utf-8');
  const records: Record<string, string>[] = csvParse(csv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_quotes: true,
  });

  if (records.length === 0) {
    return { headers: [], rows: [], totalRows: 0, fileType: 'csv' };
  }

  const headers = Object.keys(records[0]);
  return { headers, rows: records, totalRows: records.length, fileType: 'csv' };
}

/** Parse an XLSX/XLS buffer into headers + rows */
export async function parseExcel(buffer: Buffer): Promise<PreviewResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) {
    return { headers: [], rows: [], totalRows: 0, fileType: 'xlsx' };
  }

  // First row = headers
  const headerRow = worksheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value || '').trim();
  });

  const rows: ParsedRow[] = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const record: ParsedRow = {};
    let hasData = false;
    headers.forEach((h, idx) => {
      const val = String(row.getCell(idx + 1).value || '').trim();
      if (val) hasData = true;
      record[h] = val;
    });
    if (hasData) rows.push(record);
  }

  return { headers, rows, totalRows: rows.length, fileType: 'xlsx' };
}

/** Parse a VCF (vCard) buffer into rows */
export function parseVCard(buffer: Buffer): PreviewResult {
  const text = buffer.toString('utf-8');
  const cards = vCard.parse(text);

  const headers = ['firstName', 'lastName', 'email', 'phone', 'company', 'position'];
  const rows: ParsedRow[] = [];

  for (const card of cards) {
    const record: ParsedRow = {};

    // Name
    const nProp = card.get('n');
    if (nProp) {
      const nVal = nProp.valueOf();
      if (typeof nVal === 'string') {
        const parts = nVal.split(';');
        record.lastName = (parts[0] || '').trim();
        record.firstName = (parts[1] || '').trim();
      }
    }

    // Fallback: FN (formatted name)
    if (!record.firstName && !record.lastName) {
      const fnProp = card.get('fn');
      if (fnProp) {
        const fn = String(fnProp.valueOf());
        const parts = fn.split(' ');
        record.firstName = parts[0] || '';
        record.lastName = parts.slice(1).join(' ') || '';
      }
    }

    // Email
    const emailProp = card.get('email');
    if (emailProp) {
      record.email = String(emailProp.valueOf()).trim();
    }

    // Phone
    const telProp = card.get('tel');
    if (telProp) {
      record.phone = String(telProp.valueOf()).trim();
    }

    // Organization
    const orgProp = card.get('org');
    if (orgProp) {
      record.company = String(orgProp.valueOf()).split(';')[0].trim();
    }

    // Title
    const titleProp = card.get('title');
    if (titleProp) {
      record.position = String(titleProp.valueOf()).trim();
    }

    rows.push(record);
  }

  return { headers, rows, totalRows: rows.length, fileType: 'vcf' };
}

// ---------------------------------------------------------------------------
// Duplicate Detection
// ---------------------------------------------------------------------------

/**
 * Detect duplicates for import rows against existing leads in the org.
 * Criteria: Email OR Phone OR (FirstName + LastName + Address)
 */
export async function detectDuplicates(
  rows: ParsedRow[],
  mappings: ColumnMapping[],
  organizationId: string
): Promise<DuplicateMatch[]> {
  // Build quick lookup for mappings
  const mapping = new Map<string, string>();
  for (const m of mappings) {
    if (m.target) mapping.set(m.target, m.source);
  }

  // Gather all emails and phones from import rows (for batch query)
  const emails: string[] = [];
  const phones: string[] = [];
  const names: { first: string; last: string; idx: number }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const emailCol = mapping.get('email');
    const phoneCol = mapping.get('phone');
    const fnCol = mapping.get('firstName');
    const lnCol = mapping.get('lastName');

    const email = emailCol ? (row[emailCol] || '').trim().toLowerCase() : '';
    const phone = phoneCol ? (row[phoneCol] || '').replace(/\D/g, '') : '';
    const firstName = fnCol ? (row[fnCol] || '').trim().toLowerCase() : '';
    const lastName = lnCol ? (row[lnCol] || '').trim().toLowerCase() : '';

    if (email) emails.push(email);
    if (phone && phone.length >= 10) phones.push(phone);
    if (firstName && lastName) names.push({ first: firstName, last: lastName, idx: i });
  }

  // Query existing leads that could be duplicates
  const orConditions: any[] = [];
  if (emails.length > 0) {
    orConditions.push({ email: { in: emails, mode: 'insensitive' } });
  }
  if (phones.length > 0) {
    orConditions.push({ phone: { in: phones } });
  }

  if (orConditions.length === 0 && names.length === 0) {
    return [];
  }

  const existingLeads = await prisma.lead.findMany({
    where: {
      organizationId,
      OR: orConditions.length > 0 ? orConditions : undefined,
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  });

  // Build indexes for fast lookup
  const emailIndex = new Map<string, typeof existingLeads[0]>();
  const phoneIndex = new Map<string, typeof existingLeads[0]>();
  const nameIndex = new Map<string, typeof existingLeads[0]>();

  for (const lead of existingLeads) {
    if (lead.email) emailIndex.set(lead.email.toLowerCase(), lead);
    if (lead.phone) phoneIndex.set(lead.phone.replace(/\D/g, ''), lead);
    const nameKey = `${lead.firstName.toLowerCase()}_${lead.lastName.toLowerCase()}`;
    nameIndex.set(nameKey, lead);
  }

  // Match each row
  const duplicates: DuplicateMatch[] = [];
  const seenRows = new Set<number>();

  for (let i = 0; i < rows.length; i++) {
    if (seenRows.has(i)) continue;
    const row = rows[i];

    const emailCol = mapping.get('email');
    const phoneCol = mapping.get('phone');
    const fnCol = mapping.get('firstName');
    const lnCol = mapping.get('lastName');

    const email = emailCol ? (row[emailCol] || '').trim().toLowerCase() : '';
    const phone = phoneCol ? (row[phoneCol] || '').replace(/\D/g, '') : '';
    const firstName = fnCol ? (row[fnCol] || '').trim().toLowerCase() : '';
    const lastName = lnCol ? (row[lnCol] || '').trim().toLowerCase() : '';

    // Check email match
    if (email && emailIndex.has(email)) {
      const match = emailIndex.get(email)!;
      duplicates.push({
        rowIndex: i,
        row,
        existingLeadId: match.id,
        existingLeadName: `${match.firstName} ${match.lastName}`,
        existingLeadEmail: match.email,
        matchReason: 'Same email address',
      });
      seenRows.add(i);
      continue;
    }

    // Check phone match
    if (phone && phone.length >= 10 && phoneIndex.has(phone)) {
      const match = phoneIndex.get(phone)!;
      duplicates.push({
        rowIndex: i,
        row,
        existingLeadId: match.id,
        existingLeadName: `${match.firstName} ${match.lastName}`,
        existingLeadEmail: match.email,
        matchReason: 'Same phone number',
      });
      seenRows.add(i);
      continue;
    }

    // Check name match (firstName + lastName)
    if (firstName && lastName) {
      const nameKey = `${firstName}_${lastName}`;
      if (nameIndex.has(nameKey)) {
        const match = nameIndex.get(nameKey)!;
        duplicates.push({
          rowIndex: i,
          row,
          existingLeadId: match.id,
          existingLeadName: `${match.firstName} ${match.lastName}`,
          existingLeadEmail: match.email,
          matchReason: 'Same first + last name',
        });
        seenRows.add(i);
        continue;
      }
    }
  }

  return duplicates;
}

// ---------------------------------------------------------------------------
// Import Execution
// ---------------------------------------------------------------------------

/**
 * Execute the actual import with column mappings and duplicate handling.
 */
export async function executeImport(
  rows: ParsedRow[],
  options: ImportOptions
): Promise<ImportResult> {
  const { organizationId, userId, columnMappings, duplicateAction } = options;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Build mapping lookup
  const mapping = new Map<string, string>();
  for (const m of columnMappings) {
    if (m.target) mapping.set(m.target, m.source);
  }

  // Detect duplicates
  const duplicates = await detectDuplicates(rows, columnMappings, organizationId);
  const duplicateRowIndexes = new Set(duplicates.map(d => d.rowIndex));
  const duplicateByIndex = new Map(duplicates.map(d => [d.rowIndex, d]));

  let imported = 0;
  let skipped = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const isDuplicate = duplicateRowIndexes.has(i);

      // Handle duplicates based on action
      if (isDuplicate && duplicateAction === 'skip') {
        skipped++;
        continue;
      }

      // Extract mapped values
      const getValue = (field: string): string => {
        const sourceCol = mapping.get(field);
        if (!sourceCol) return '';
        return (row[sourceCol] || '').trim();
      };

      let firstName = getValue('firstName');
      let lastName = getValue('lastName');

      // If firstName mapping is a "name" column with full name, split it
      const fnSource = mapping.get('firstName');
      if (fnSource && !mapping.has('lastName')) {
        const fullName = (row[fnSource] || '').trim();
        const parts = fullName.split(' ');
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }

      const email = getValue('email').toLowerCase();
      const phone = getValue('phone');
      const company = getValue('company');
      const position = getValue('position');
      const source = getValue('source') || 'IMPORT';
      const valueStr = getValue('value');
      const value = valueStr ? parseFloat(valueStr) : undefined;

      // Validate required fields
      if (!firstName && !email) {
        skipped++;
        if (errors.length < 20) errors.push(`Row ${i + 2}: Missing name and email`);
        continue;
      }

      if (email && !emailRegex.test(email)) {
        skipped++;
        if (errors.length < 20) errors.push(`Row ${i + 2}: Invalid email format "${email}"`);
        continue;
      }

      if (isDuplicate && duplicateAction === 'overwrite') {
        // Update existing lead
        const dupInfo = duplicateByIndex.get(i)!;
        const updateData: Record<string, any> = {};
        if (firstName) updateData.firstName = firstName;
        if (lastName) updateData.lastName = lastName;
        if (phone) updateData.phone = phone;
        if (company) updateData.company = company;
        if (position) updateData.position = position;
        if (source && source !== 'IMPORT') updateData.source = source;
        if (value !== undefined && !isNaN(value)) updateData.value = value;

        await prisma.lead.update({
          where: { id: dupInfo.existingLeadId },
          data: updateData,
        });
        updated++;
      } else {
        // Create new lead
        const leadData: Record<string, any> = {
          firstName: firstName || 'Unknown',
          lastName: lastName || '',
          email: email || `import-${Date.now()}-${i}@no-email.local`,
          organizationId,
          assignedToId: userId,
          status: 'NEW',
          source,
        };

        if (phone) leadData.phone = phone;
        if (company) leadData.company = company;
        if (position) leadData.position = position;
        if (value !== undefined && !isNaN(value)) leadData.value = value;

        await prisma.lead.create({ data: leadData as any });
        imported++;
      }
    } catch (err: unknown) {
      skipped++;
      if (errors.length < 20) {
        const prismaErr = err as { code?: string; message?: string };
        // Unique constraint violation → duplicate
        if (prismaErr.code === 'P2002') {
          errors.push(`Row ${i + 2}: Duplicate email — lead already exists`);
        } else {
          errors.push(`Row ${i + 2}: ${prismaErr.message || 'Unknown error'}`);
        }
      }
    }
  }

  return {
    imported,
    skipped,
    updated,
    total: rows.length,
    duplicatesFound: duplicates.length,
    errors: errors.slice(0, 20),
  };
}
