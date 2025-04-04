import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const FILE_TYPES = {
  IMAGE: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff'],
  VIDEO: ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', 'mkv'],
  AUDIO: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'],
  DOCUMENT: ['pdf', 'doc', 'docx', 'txt', 'rtf']
};

const determineFileCategory = (mimetype, originalname) => {
  const ext = path.extname(originalname).toLowerCase().slice(1);
  if (mimetype.startsWith('image/') || FILE_TYPES.IMAGE.includes(ext)) return 'images';
  if (mimetype.startsWith('video/') || FILE_TYPES.VIDEO.includes(ext)) return 'videos';
  if (mimetype.startsWith('audio/') || FILE_TYPES.AUDIO.includes(ext)) return 'audio';
  if (FILE_TYPES.DOCUMENT.includes(ext)) return 'documents';
  return 'other';
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: determineFileCategory(file.mimetype, file.originalname),
    allowed_formats: [...FILE_TYPES.IMAGE, ...FILE_TYPES.VIDEO, ...FILE_TYPES.AUDIO, ...FILE_TYPES.DOCUMENT],
    public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1E9)}`,
    // transformation: file.mimetype.startsWith('image/') ? [{ width: 800, height: 600, crop: 'limit' }] : []
  })
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_UPLOAD_SIZE || '50') * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if ([...FILE_TYPES.IMAGE, ...FILE_TYPES.VIDEO, ...FILE_TYPES.AUDIO, ...FILE_TYPES.DOCUMENT].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type!'), false);
    }
  }
});

const CloudinaryService = {
  uploadFile: async (file) => {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: determineFileCategory(file.mimetype, file.originalname),
        resource_type: getResourceType(file.mimetype),
        public_id: `${file.fieldname || 'file'}-${Date.now()}`,
        // Apply transformations only for images
        // ...(file.mimetype.startsWith('image/') && {
        //   transformation: [{ width: 800, height: 600, crop: 'limit' }]
        // })
      });
      return result;
    } catch (error) {
      console.error('Cloudinary Upload Error:', error);
      throw new Error('Failed to upload file to Cloudinary');
    }
  },

  deleteFile: async (publicId, resourceType = 'image') => {
    try {
      return await cloudinary.uploader.destroy(publicId, { 
        resource_type: resourceType 
      });
    } catch (error) {
      throw error;
    }
  }
};

// Helper function to determine the correct resource type
 export function getResourceType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/') || mimeType.startsWith('audio/')) return 'video';
  return 'auto'; // Handles PDFs, docs, etc.
}

export default { cloudinary, upload, CloudinaryService, FILE_TYPES };
