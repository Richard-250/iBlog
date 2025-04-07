import Post from "../models/content.js";
import { Category } from "../models/category.js";
import CloudinaryConfig from "../config/cloudinaryConfig.js";
import {
  generateUniqueSlug,
  validateCategories,
  calculateReadTime,
  generateExcerpt,
  // sanitizeHtml,
} from "../utils/contentUtils.js";

/**
 * Create a new post
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Object} Response with created post or error
 */
 const createPost = async (req, res) => {
  try {
    // Basic validation
    if (!req.body.title || !req.body.content) {
      return res.status(400).json({
        success: false,
        message: "Title and content are required fields"
      });
    }

    if (req.body.title.length < 3 || req.body.title.length > 200) {
      return res.status(400).json({
        success: false,
        message: "Title must be between 3 and 200 characters"
      });
    }

    const {
      title,
      content,
      categories,
      tags,
      status,
      featured,
      allowComments,
      moderationRequired,
      seo,
    } = req.body;

    // Sanitize HTML content to prevent XSS attacks
    // const sanitizedContent = sanitizeHtml(content);
    
    // Handle cover image upload
    let coverImage = null;

    if (req.file) {
      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: "File type not supported. Please upload a valid image file (JPEG, PNG, GIF, WEBP)."
        });
      }

      // Validate file size (limit to 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: "File size exceeds the limit (5MB)"
        });
      }

      try {
        const uploadResult = await CloudinaryConfig.CloudinaryService.uploadFile({
          path: req.file.path,
          mimetype: req.file.mimetype,
          originalname: req.file.originalname,
        });
    
        coverImage = {
          url: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          alt: req.body.imageAlt || req.file.originalname || `Cover image for ${title}`
        };
    
      } catch (uploadError) {
        console.error('Cloudinary upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          message: 'Failed to upload image to cloud storage'
        });
      }
    }
    
    // Process categories
    let categoryIds = [];
    if (categories && categories.length > 0) {
      try {
        validateCategories(categories);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
  
      try {
        const categoryDocs = await Promise.all(
          categories.map(async (name) => {
            const category = await Category.findOne({ name });
            if (!category) {
              throw new Error(`Category "${name}" not found`);
            }
            return category;
          })
        );
        categoryIds = categoryDocs.map((cat) => cat._id);
      } catch (error) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }

    // Validate status
    const validStatuses = ['draft', 'published', 'archived', 'scheduled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    // Validate tags
    if (tags) {
      if (!Array.isArray(tags)) {
        return res.status(400).json({
          success: false,
          message: "Tags must be an array"
        });
      }
      
      // Ensure each tag is a string and has reasonable length
      const invalidTags = tags.filter(tag => 
        typeof tag !== 'string' || tag.length < 2 || tag.length > 50
      );
      
      if (invalidTags.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Each tag must be a string between 2-50 characters"
        });
      }
    }

    // Generate slug
    const slug = await generateUniqueSlug(title, Post);

    // Create post with sanitized and validated data
    const post = await Post.create({
      title,
      slug,
      // content: sanitizedContent,
      content,
      excerpt: generateExcerpt(content),
      coverImage,
      author: req.user._id,
      categories: categoryIds,
      tags: tags || [],
      status: status || "draft",
      featured: featured === true, // Ensure boolean
      readTime: calculateReadTime(content, coverImage ? 1 : 0),
      commentSettings: {
        allowComments: allowComments === false ? false : true, // Default to true
        moderationRequired: moderationRequired === true, // Default to false
      },
      seo: seo || {},
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.status(201).json({
      success: true,
      data: post,
    });
  } catch (error) {
    console.error("Post creation error:", error);

    // Handle different types of errors appropriately
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: Object.values(error.errors).map(err => err.message)
      });
    }
    
    if (error.code === 11000) { // Duplicate key error
      return res.status(409).json({
        success: false,
        message: "A post with this title already exists"
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to create post",
      error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
    });
  }
};

/**
 * @desc    Update a post
 * @route   PUT /api/posts/:id
 * @access  Private/Admin
 */
const updatePost = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid post ID",
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Check if the user is the author or admin
    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this post",
      });
    }

    const {
      title,
      content,
      categories,
      tags,
      status,
      featured,
      allowComments,
      moderationRequired,
      seo,
    } = req.body;

    const coverImage = req.file
      ? {
          url: req.file.path,
          publicId: req.file.filename,
          alt: req.body.imageAlt || title,
        }
      : post.coverImage;

    // Handle categories update
    let categoryIds = post.categories;
    if (categories && Array.isArray(categories)) {
      validateCategories(categories);

      const categoryDocs = await Promise.all(
        categories.map(async (name) => {
          let category = await Category.findOne({ name });
          if (!category) {
            category = await Category.create({ name });
          }
          return category;
        })
      );

      categoryIds = categoryDocs.map((cat) => cat._id);
    }

    // Update slug if title changed
    let slug = post.slug;
    if (title && title !== post.title) {
      slug = await generateUniqueSlug(title, Post, post._id);
    }

    // Update post
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        title: title || post.title,
        slug,
        content: content || post.content,
        excerpt: content ? generateExcerpt(content) : post.excerpt,
        coverImage,
        categories: categoryIds,
        tags: tags || post.tags,
        status: status || post.status,
        featured: featured !== undefined ? featured : post.featured,
        readTime:
          content || coverImage
            ? calculateReadTime(content || post.content, coverImage ? 1 : 0)
            : post.readTime,
        commentSettings: {
          allowComments:
            allowComments !== undefined
              ? allowComments
              : post.commentSettings.allowComments,
          moderationRequired:
            moderationRequired !== undefined
              ? moderationRequired
              : post.commentSettings.moderationRequired,
        },
        seo: seo || post.seo,
        $set: {
          // Update publishedAt if status changed to published
          publishedAt:
            status === "published" && post.status !== "published"
              ? new Date()
              : post.publishedAt,
        },
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: updatedPost,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @desc    Upload post cover image
 * @route   POST /api/posts/:id/image
 * @access  Private/Admin
 */
const uploadPostImage = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid post ID",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "Please upload an image file",
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        error: "Post not found",
      });
    }

    // Check if the user is the author or admin
    if (
      post.author.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        error: "Not authorized to update this post",
      });
    }

    const coverImage = {
      url: req.file.path,
      publicId: req.file.filename,
      alt: req.body.alt || post.title,
    };

    // Update post with new image and recalculate read time
    const updatedPost = await Post.findByIdAndUpdate(
      id,
      {
        coverImage,
        readTime: calculateReadTime(post.content, 1), // 1 for the new image
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedPost,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

export { createPost, updatePost, uploadPostImage };
