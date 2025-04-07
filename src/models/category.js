import mongoose from "mongoose";
import { generateUniqueSlug } from "../utils/contentUtils.js";

const allowedCategories = [
  "Technology",
  "Science",
  "Health",
  "Business",
  "Entertainment",
  "Sports",
  "Politics",
  "Education",
  "Travel",
  "Food",
  "Lifestyle",
  "Art",
  "Fashion",
  "Finance",
  "Parenting",
  "Gaming"
];

const CategorySchema = new mongoose.Schema({
  name: {
    type: String,
    // required: true,
    unique: true,
    enum: allowedCategories,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  slug: {
    type: String,
    // required: true,
    unique: true,
    lowercase: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  seo: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  }
}, {
  timestamps: true
});

// Generate slug from name before saving
CategorySchema.pre('save', async function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = await generateUniqueSlug(this.name, Category, this._id);
  }
  next();
});

const Category = mongoose.model('Category', CategorySchema); 

export { Category, allowedCategories };