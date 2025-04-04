import { v2 as cloudinary } from 'cloudinary';

export function extractPublicIdFromUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    // Handle Cloudinary fetch URLs
    if (url.includes('/fetch/')) {
      const publicId = new URL(url).pathname.split('/fetch/')[1];
      return decodeURIComponent(publicId.split('?')[0]);
    }

    // Standard Cloudinary upload URLs
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    const pathAfterUpload = url.slice(uploadIndex + 8); // +8 to skip '/upload/'
    const parts = pathAfterUpload.split('/');
    
    // The public ID is the last part before any transformations
    let publicId = parts[parts.length - 1];
    
    // Remove version prefix if exists (v123/)
    if (/^v\d+/.test(parts[0])) {
      publicId = parts.slice(1).join('/');
    }
    
    // Remove file extension
    return publicId.split('.')[0];
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
}

export async function deleteFileByUrl(url) {
  const publicId = extractPublicIdFromUrl(url);
  if (!publicId) {
    throw new Error('Invalid Cloudinary URL');
  }
  return cloudinary.uploader.destroy(publicId);
}

// export async function uploadFile(file, options = {}) {
//   return cloudinary.uploader.upload(file.path, {
//     resource_type: 'auto',
//     public_id: file.originalname.split('.')[0],
//     ...options
//   });
// }
