import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const AVATAR_DIR = path.join(UPLOAD_DIR, 'avatars');
const LOGO_DIR = path.join(UPLOAD_DIR, 'logos');

// Ensure upload directories exist
for (const dir of [UPLOAD_DIR, AVATAR_DIR, LOGO_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

function fileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype) || !ALLOWED_EXTENSIONS.includes(ext)) {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`));
    return;
  }
  cb(null, true);
}

function makeStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOAD_DIR, subdir);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = crypto.randomBytes(16).toString('hex');
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uniqueSuffix}${ext}`);
    },
  });
}

/**
 * Multer middleware for avatar uploads.
 * Field name: 'avatar'
 */
export const avatarUpload = multer({
  storage: makeStorage('avatars'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('avatar');

/**
 * Multer middleware for business logo uploads.
 * Field name: 'logo'
 */
export const logoUpload = multer({
  storage: makeStorage('logos'),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter,
}).single('logo');

/**
 * Build the public URL for an uploaded file.
 * Returns a path relative to the API baseURL so the frontend can use it directly.
 */
export function getUploadUrl(relativePath: string): string {
  return `/uploads/${relativePath}`;
}

/**
 * Delete an old upload file by its URL path (e.g., `/uploads/avatars/abc123.png`)
 */
export function deleteUploadFile(urlPath: string): void {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return;
  const relativePath = urlPath.replace('/uploads/', '');
  const fullPath = path.join(UPLOAD_DIR, relativePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

// ─── Attachment Upload ──────────────────────────────────────────

const ATTACHMENT_DIR = path.join(UPLOAD_DIR, 'attachments');
if (!fs.existsSync(ATTACHMENT_DIR)) {
  fs.mkdirSync(ATTACHMENT_DIR, { recursive: true });
}

const ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/csv',
  'text/plain',
];

const ATTACHMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt',
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
];

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024; // 10 MB per file

function attachmentFileFilter(_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ATTACHMENT_MIME_TYPES.includes(file.mimetype) || !ATTACHMENT_EXTENSIONS.includes(ext)) {
    cb(new Error(`Invalid attachment type. Allowed: ${ATTACHMENT_EXTENSIONS.join(', ')}`));
    return;
  }
  cb(null, true);
}

/**
 * Multer middleware for campaign attachment uploads.
 * Field name: 'attachments' (multiple files, max 5)
 */
export const attachmentUpload = multer({
  storage: makeStorage('attachments'),
  limits: { fileSize: MAX_ATTACHMENT_SIZE, files: 5 },
  fileFilter: attachmentFileFilter,
}).array('attachments', 5);

/**
 * Read attachment files from disk and return as base64 for SendGrid.
 */
export function readAttachmentAsBase64(filePath: string): { content: string; filename: string; type: string } | null {
  try {
    const fullPath = filePath.startsWith('/') ? filePath : path.join(UPLOAD_DIR, filePath);
    if (!fs.existsSync(fullPath)) return null;
    const content = fs.readFileSync(fullPath).toString('base64');
    const ext = path.extname(fullPath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf', '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.csv': 'text/csv', '.txt': 'text/plain',
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
      '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    };
    return {
      content,
      filename: path.basename(fullPath),
      type: mimeMap[ext] || 'application/octet-stream',
    };
  } catch {
    return null;
  }
}

export { UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };
