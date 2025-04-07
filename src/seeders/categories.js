import { Category, allowedCategories } from "../models/category.js";

const seedCategories = async () => {
  try {
    // Check if categories already exist (using the first category as a test case)
    const isCategoryCreated = await Category.findOne({ name: allowedCategories[0] });

    if (isCategoryCreated) return ;
    // Create categories from allowedCategories
    const categories = allowedCategories.map(name => ({ name }));
    await Category.create(categories);

    console.log('✅ Categories seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  } 
};

export default seedCategories