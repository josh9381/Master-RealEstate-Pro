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

export { UPLOAD_DIR, MAX_FILE_SIZE, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS };
