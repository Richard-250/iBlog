import { Router } from "express";
import { authenticate, restrictTo } from "../../middleware/auth.js";
import { createPost } from "../../controllers/content.controller.js";
import CloudinaryConfig from "../../config/cloudinaryConfig.js";



const router = Router();


router.use(authenticate)
router.post('/api/content/create', restrictTo('admin'), CloudinaryConfig.upload.single('file'), createPost);

export default router