import { db } from '../src/lib/db.js';
import { hashPassword } from '../src/lib/auth.js';

async function seed() {
  console.log('--- Database Seeding Started ---');

  // 1. Create Users
  const adminPasswordHash = await hashPassword('admin123');
  const sellerPasswordHash = await hashPassword('seller123');
  const customerPasswordHash = await hashPassword('aman123');

  const admin = await db.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: adminPasswordHash },
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      name: 'ASSAMEDCHEM Admin Panel'
    }
  });
  console.log(`✓ Admin user seeded: ${admin.username}`);

  const seller = await db.user.upsert({
    where: { username: 'seller' },
    update: { passwordHash: sellerPasswordHash },
    create: {
      username: 'seller',
      passwordHash: sellerPasswordHash,
      role: 'SELLER',
      name: 'Rohan Sharma (Seller)'
    }
  });
  console.log(`✓ Seller user seeded: ${seller.username}`);

  const customer = await db.user.upsert({
    where: { username: 'aman' },
    update: { passwordHash: customerPasswordHash },
    create: {
      username: 'aman',
      passwordHash: customerPasswordHash,
      role: 'CUSTOMER',
      name: 'Aman Singh (Customer)'
    }
  });
  console.log(`✓ Customer user seeded: ${customer.username}`);

  // 2. Create Products (assigned to Rohan/Seller, NOT Admin)
  const products = [
    {
      sku: 'PAR-RAW-001',
      name: 'Paracetamol Active Ingredient (Raw)',
      description: 'High-purity raw active pharmaceutical ingredient (API).',
      category: 'API / Raw Material',
      baseUnit: 'kg',
      pricePerBaseUnit: 450.000000,
      stockQuantity: 25.500000,
      sellerId: seller.id
    },
    {
      sku: 'AMX-PWD-002',
      name: 'Amoxicillin Trihydrate Powder',
      description: 'Antibiotic active pharmaceutical ingredient.',
      category: 'API / Raw Material',
      baseUnit: 'g',
      pricePerBaseUnit: 1.500000,
      stockQuantity: 5000.000000,
      sellerId: seller.id
    },
    {
      sku: 'COF-SYR-003',
      name: 'Dextromethorphan Cough Syrup Liquid',
      description: 'Finished cough and cold liquid formulation bulk.',
      category: 'Formulations / Liquids',
      baseUnit: 'L',
      pricePerBaseUnit: 280.000000,
      stockQuantity: 120.000000,
      sellerId: seller.id
    },
    {
      sku: 'SAL-IV-004',
      name: 'Normal Saline Sterile Solution (IV)',
      description: 'Sterile isotonic normal saline solution bulk.',
      category: 'Formulations / Liquids',
      baseUnit: 'mL',
      pricePerBaseUnit: 0.120000,
      stockQuantity: 80000.000000,
      sellerId: seller.id
    },
    {
      sku: 'VIT-C-005',
      name: 'Vitamin C 500mg Tablets (100-count bottle)',
      description: 'Bottled finished tablet formulation.',
      category: 'OTC / Supplements',
      baseUnit: 'items',
      pricePerBaseUnit: 120.000000,
      stockQuantity: 450.000000,
      sellerId: seller.id
    }
  ];

  for (const product of products) {
    const upserted = await db.product.upsert({
      where: { sku: product.sku },
      update: {
        name: product.name,
        description: product.description,
        category: product.category,
        baseUnit: product.baseUnit,
        pricePerBaseUnit: product.pricePerBaseUnit,
        stockQuantity: product.stockQuantity,
        sellerId: product.sellerId
      },
      create: product
    });
    console.log(`✓ Product seeded: [${upserted.sku}] ${upserted.name} (${upserted.stockQuantity} ${upserted.baseUnit})`);
  }

  console.log('--- Database Seeding Completed Successfully ---');
}

seed()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
