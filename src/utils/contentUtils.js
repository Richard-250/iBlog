// utils/contentUtils.js
import slugify from 'slugify';
import { allowedCategories } from "../models/category.js";

/**
 * Generates a unique slug for content
 * @param {string} title - The title to generate slug from
 * @param {Model} model - Mongoose model to check against
 * @param {string} [existingId] - ID of existing document (for updates)
 * @returns {Promise<string>} - Unique slug
 */
export const generateUniqueSlug = async (title, model, existingId = null) => {
  let baseSlug = slugify(title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g
  });

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug };
    if (existingId) {
      query._id = { $ne: existingId };
    }
    const existing = await model.findOne(query);
    if (!existing) break;
    slug = `${baseSlug}-${counter++}`;
  }

  return slug;
};

/**
 * Validates categories against allowed categories
 * @param {Array<string>} categoryNames - Array of category names to validate
 * @returns {Array<string>} - Validated category names
 * @throws {Error} - If any category is not allowed
 */
export const validateCategories = (categoryNames) => {
  if (!Array.isArray(categoryNames)) {
    throw new Error('Categories must be an array');
  }

  const invalidCategories = categoryNames.filter(
    cat => !allowedCategories.includes(cat)
  );

  if (invalidCategories.length > 0) {
    throw new Error(`Invalid categories: ${invalidCategories.join(', ')}`);
  }

  return categoryNames;
};

/**
 * Calculates read time for content
 * @param {string} content - The content to analyze
 * @param {number} [mediaCount=0] - Number of media elements
 * @returns {number} - Estimated read time in minutes
 */
export const calculateReadTime = (content, mediaCount = 0) => {
  if (!content) return 0;
  
  const wordCount = content.split(/\s+/).length;
  const wordsPerMinute = 200;
  const mediaTime = mediaCount * 10; // 10 seconds per media item
  
  return Math.ceil(wordCount / wordsPerMinute + mediaTime / 60);
};

/**
 * Generates an excerpt from content
 * @param {string} content - The content to excerpt
 * @param {number} [maxLength=160] - Maximum length of excerpt
 * @returns {string} - Generated excerpt
 */
export const generateExcerpt = (content, maxLength = 160) => {
  if (!content) return '';
  
  // Remove HTML tags if present
  const plainText = content.replace(/<[^>]*>?/gm, '');
  
  // Trim to max length without cutting words
  if (plainText.length <= maxLength) return plainText;
  
  return plainText.substring(0, plainText.lastIndexOf(' ', maxLength)) + '...';
};