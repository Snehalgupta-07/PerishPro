// 🏭 Factory Pattern Demo - Shows how different product types are created
// This demonstrates the TRUE factory pattern implementation

// Import the factory classes (we'll copy them here for demo purposes)
abstract class BaseProduct {
  constructor(
    public name: string,
    public category: string,
    public basePrice: number,
    public stock: number
  ) {}

  abstract getShelfLife(): number;
  abstract getStorageRequirements(): string;
  abstract getSpoilageRisk(): 'low' | 'medium' | 'high';
  abstract getPricingStrategy(): { discountFactor: number; urgencyMultiplier: number };
  abstract getOptimalDiscount(daysToExpiry: number): number;

  getDaysToExpiry(expiryDate: Date): number {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }
}

class DairyProduct extends BaseProduct {
  getShelfLife(): number { return 7; }
  getStorageRequirements(): string { return "Cold Storage"; }
  getSpoilageRisk(): 'low' | 'medium' | 'high' { return 'medium'; }
  getPricingStrategy() { return { discountFactor: 0.15, urgencyMultiplier: 1.8 }; }
  getOptimalDiscount(daysToExpiry: number): number {
    if (daysToExpiry <= 1) return 0.25;
    if (daysToExpiry <= 3) return 0.15;
    return 0.05;
  }
}

class ProduceProduct extends BaseProduct {
  getShelfLife(): number { return 3; }
  getStorageRequirements(): string { return "Room Temperature"; }
  getSpoilageRisk(): 'low' | 'medium' | 'high' { return 'high'; }
  getPricingStrategy() { return { discountFactor: 0.25, urgencyMultiplier: 2.2 }; }
  getOptimalDiscount(daysToExpiry: number): number {
    if (daysToExpiry <= 1) return 0.40;
    if (daysToExpiry <= 2) return 0.25;
    return 0.10;
  }
}

class ProductFactory {
  static createProduct(name: string, category: string, basePrice: number, stock: number): BaseProduct {
    switch (category) {
      case "Dairy": return new DairyProduct(name, category, basePrice, stock);
      case "Produce": return new ProduceProduct(name, category, basePrice, stock);
      default: return new DairyProduct(name, category, basePrice, stock);
    }
  }
}

// Demo: Create different product types
console.log('🏭 Factory Pattern Demo: Creating Different Product Types\n');

// Create products of different categories
const milk = ProductFactory.createProduct('Fresh Milk', 'Dairy', 3.99, 50);
const banana = ProductFactory.createProduct('Organic Bananas', 'Produce', 1.99, 75);

console.log('1. Different Shelf Lives:');
console.log(`   Milk: ${milk.getShelfLife()} days`);
console.log(`   Banana: ${banana.getShelfLife()} days\n`);

console.log('2. Different Storage Requirements:');
console.log(`   Milk: ${milk.getStorageRequirements()}`);
console.log(`   Banana: ${banana.getStorageRequirements()}\n`);

console.log('3. Different Spoilage Risks:');
console.log(`   Milk: ${milk.getSpoilageRisk()}`);
console.log(`   Banana: ${banana.getSpoilageRisk()}\n`);

console.log('4. Different Pricing Strategies:');
console.log(`   Milk: ${JSON.stringify(milk.getPricingStrategy())}`);
console.log(`   Banana: ${JSON.stringify(banana.getPricingStrategy())}\n`);

console.log('5. Different Optimal Discounts (3 days to expiry):');
console.log(`   Milk: ${(milk.getOptimalDiscount(3) * 100).toFixed(1)}%`);
console.log(`   Banana: ${(banana.getOptimalDiscount(3) * 100).toFixed(1)}%\n`);

console.log('✅ Factory Pattern: Each category gets its own class with specialized behavior!');
console.log('   This is different from just adding properties - each type has unique methods!');