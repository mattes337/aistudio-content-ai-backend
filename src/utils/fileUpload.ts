import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Sanitize filename to remove problematic characters
const sanitizeFilename = (filename: string): string => {
  // Get name without extension
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);

  // Replace spaces with hyphens, remove special chars, lowercase
  const sanitized = name
    .toLowerCase()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/[^a-z0-9\-_]/g, '')   // remove special chars
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-|-$/g, '')          // trim hyphens from ends
    .substring(0, 100);             // limit length

  return sanitized || 'file';
};

// Generate short unique suffix for deduplication
const generateDedup = (): string => {
  const timestamp = Date.now().toString(36);  // base36 timestamp
  const random = Math.random().toString(36).substring(2, 6);  // 4 random chars
  return `${timestamp}-${random}`;
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Keep original filename with dedup suffix
    const sanitizedName = sanitizeFilename(file.originalname);
    const extension = path.extname(file.originalname).toLowerCase();
    const dedup = generateDedup();
    cb(null, `${sanitizedName}-${dedup}${extension}`);
  }
});

// File filter to allow specific types
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow all file types for now, but you can restrict here
  cb(null, true);
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  }
});

// Single file upload middleware
export const uploadSingle = (fieldName: string) => upload.single(fieldName);

// Multiple files upload middleware
export const uploadMultiple = (fieldName: string, maxCount: number) => upload.array(fieldName, maxCount);

// Helper function to get public URL for uploaded files
export const getFileUrl = (filename: string): string => {
  if (!filename) return '';
  if (filename.startsWith('http://') || filename.startsWith('https://') || filename.startsWith('data:')) {
    return filename;
  }
  return `/api/files/${filename}`;
};

// Helper function to delete uploaded files
export const deleteFile = (filename: string): boolean => {
  try {
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};
