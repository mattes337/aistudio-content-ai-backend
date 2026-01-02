import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const uploadsDir = path.join(__dirname, '../../uploads');

const THUMBNAIL_SIZE = 50;
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Check if a file is a supported image type
 */
export const isImageFile = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
};

/**
 * Get the thumbnail filename for a given original filename
 * e.g., "image-abc123.jpg" -> "image-abc123_thumb.jpg"
 */
export const getThumbnailFilename = (filename: string): string => {
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  return `${name}_thumb${ext}`;
};

/**
 * Get the thumbnail URL for a given file path
 * Returns null if the file is not an image
 */
export const getThumbnailUrl = (filePath: string | null | undefined): string | null => {
  if (!filePath) return null;

  // Don't generate thumbnail URLs for external URLs
  if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('data:')) {
    return null;
  }

  if (!isImageFile(filePath)) return null;

  const thumbFilename = getThumbnailFilename(filePath);
  return `/api/files/${thumbFilename}`;
};

/**
 * Create a thumbnail for the given image file
 * The thumbnail will be saved with _thumb suffix before the extension
 * Returns the thumbnail filename on success, null on failure
 */
export const createThumbnail = async (filename: string): Promise<string | null> => {
  if (!isImageFile(filename)) {
    return null;
  }

  const inputPath = path.join(uploadsDir, filename);
  const thumbFilename = getThumbnailFilename(filename);
  const outputPath = path.join(uploadsDir, thumbFilename);

  try {
    // Check if source file exists
    if (!fs.existsSync(inputPath)) {
      console.error(`Thumbnail: Source file not found: ${inputPath}`);
      return null;
    }

    await sharp(inputPath)
      .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
        fit: 'inside',  // Maintain aspect ratio, fit within bounds
        withoutEnlargement: true  // Don't enlarge smaller images
      })
      .toFile(outputPath);

    return thumbFilename;
  } catch (error) {
    console.error(`Error creating thumbnail for ${filename}:`, error);
    return null;
  }
};

/**
 * Delete a thumbnail for the given image file
 * Returns true if deleted successfully or didn't exist
 */
export const deleteThumbnail = (filename: string): boolean => {
  if (!isImageFile(filename)) {
    return true;
  }

  const thumbFilename = getThumbnailFilename(filename);
  const thumbPath = path.join(uploadsDir, thumbFilename);

  try {
    if (fs.existsSync(thumbPath)) {
      fs.unlinkSync(thumbPath);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting thumbnail for ${filename}:`, error);
    return false;
  }
};
