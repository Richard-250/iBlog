import mongoose from "mongoose";
import { generateUniqueSlug, calculateReadTime, generateExcerpt } from "../utils/contentUtils.js";

const { Schema } = mongoose;

/**
 * Comment Schema for blog posts
 */
const CommentSchema = new Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 2000
  },
  replies: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    likes: {
      type: Number,
      default: 0
    },
    likedBy: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
});

/**
 * Blog Post Schema
 */
const PostSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: 500
  },
  coverImage: {
    url: String,
    publicId: String,
    alt: String
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date,
    default: null
  },
  featured: {
    type: Boolean,
    default: false
  },
  views: {
    type: Number,
    default: 0
  },
  readTime: {
    type: Number,
    default: 0 // in minutes
  },
  likes: {
    type: Number,
    default: 0
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [CommentSchema],
  commentSettings: {
    allowComments: {
      type: Boolean,
      default: true
    },
    moderationRequired: {
      type: Boolean,
      default: false
    }
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String],
    canonicalUrl: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for comment count
PostSchema.virtual('commentCount').get(function() {
  return this.comments ? this.comments.length : 0;
});

// Virtual for total engagement (likes + comments + views)
PostSchema.virtual('impressions').get(function() {
  const commentCount = this.comments ? this.comments.length : 0;
  return this.likes + commentCount + this.views;
});
PostSchema.pre('save', async function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = await generateUniqueSlug(this.title, Post, this._id);
  }
  next();
});

// Calculate read time (uses utility function)
PostSchema.pre('save', function(next) {
  if (this.isModified('content') || this.isModified('coverImage')) {
    const mediaCount = this.coverImage?.url ? 1 : 0;
    this.readTime = calculateReadTime(this.content, mediaCount);
  }
  next();
});

// models/Post.js
PostSchema.pre('save', function(next) {
  if (this.isModified('content')) {
    this.excerpt = generateExcerpt(this.content);
  }
  next();
});

// Update publishedAt when post is published
PostSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Indexes for performance
// PostSchema.index({ slug: 1 }, { unique: true });
PostSchema.index({ author: 1 });
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ categories: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ featured: 1 });
PostSchema.index({ 'comments.author': 1 });
PostSchema.index({ createdAt: -1 });

const Post = mongoose.model('Post', PostSchema);

export default Post;