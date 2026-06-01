// 🏭 Factory Pattern Demo - Shows how different product types are created
// This demonstrates the TRUE factory pattern implementation

import { ProductFactory } from './AddProduct';

// Demo: Create different product types
console.log('🏭 Factory Pattern Demo: Creating Different Product Types\n');

// Create products of different categories
const milk = ProductFactory.createProduct('Fresh Milk', 'Dairy', 3.99, 50);
const banana = ProductFactory.createProduct('Organic Bananas', 'Produce', 1.99, 75);
const chicken = ProductFactory.createProduct('Chicken Breast', 'Meat', 8.99, 25);
const bread = ProductFactory.createProduct('Sourdough Bread', 'Bakery', 4.99, 30);

console.log('1. Different Shelf Lives:');
console.log(`   Milk: ${milk.getShelfLife()} days`);
console.log(`   Banana: ${banana.getShelfLife()} days`);
console.log(`   Chicken: ${chicken.getShelfLife()} days`);
console.log(`   Bread: ${bread.getShelfLife()} days\n`);

console.log('2. Different Storage Requirements:');
console.log(`   Milk: ${milk.getStorageRequirements()}`);
console.log(`   Banana: ${banana.getStorageRequirements()}`);
console.log(`   Chicken: ${chicken.getStorageRequirements()}`);
console.log(`   Bread: ${bread.getStorageRequirements()}\n`);

console.log('3. Different Spoilage Risks:');
console.log(`   Milk: ${milk.getSpoilageRisk()}`);
console.log(`   Banana: ${banana.getSpoilageRisk()}`);
console.log(`   Chicken: ${chicken.getSpoilageRisk()}`);
console.log(`   Bread: ${bread.getSpoilageRisk()}\n`);

console.log('4. Different Pricing Strategies:');
console.log(`   Milk: ${JSON.stringify(milk.getPricingStrategy())}`);
console.log(`   Banana: ${JSON.stringify(banana.getPricingStrategy())}`);
console.log(`   Chicken: ${JSON.stringify(chicken.getPricingStrategy())}`);
console.log(`   Bread: ${JSON.stringify(bread.getPricingStrategy())}\n`);

console.log('5. Different Optimal Discounts (3 days to expiry):');
const expiryDate = new Date();
expiryDate.setDate(expiryDate.getDate() + 3);

console.log(`   Milk: ${(milk.getOptimalDiscount(3) * 100).toFixed(1)}%`);
console.log(`   Banana: ${(banana.getOptimalDiscount(3) * 100).toFixed(1)}%`);
console.log(`   Chicken: ${(chicken.getOptimalDiscount(3) * 100).toFixed(1)}%`);
console.log(`   Bread: ${(bread.getOptimalDiscount(3) * 100).toFixed(1)}%\n`);

console.log('✅ Factory Pattern: Each category gets its own class with specialized behavior!');
console.log('   This is different from just adding properties - each type has unique methods!');