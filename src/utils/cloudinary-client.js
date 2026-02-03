import { v2 as cloudinary } from 'cloudinary';
import logger from './logger.js';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Upload a base64 image to Cloudinary
 * @param {string} base64Data - Base64 encoded image data
 * @param {string} publicId - Public ID for the image (filename without extension)
 * @param {string} folder - Folder to store the image in
 * @returns {Promise<Object>} Upload result with URL
 */
export async function uploadBase64Image(base64Data, publicId, folder = 'blog-thumbnails') {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  try {
    // Ensure base64 has proper data URI prefix
    let dataUri = base64Data;
    if (!base64Data.startsWith('data:')) {
      dataUri = `data:image/png;base64,${base64Data}`;
    }

    const result = await cloudinary.uploader.upload(dataUri, {
      public_id: publicId,
      folder: folder,
      resource_type: 'image',
      overwrite: true,
    });

    logger.success(`☁️ Image uploaded to Cloudinary: ${result.secure_url}`);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    logger.error('Failed to upload image to Cloudinary', error);
    throw error;
  }
}

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Public ID of the image to delete
 */
export async function deleteImage(publicId) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured.');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Deleted image from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error('Failed to delete image from Cloudinary', error);
    throw error;
  }
}

export default {
  isCloudinaryConfigured,
  uploadBase64Image,
  deleteImage,
};
