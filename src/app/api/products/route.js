import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

// Helper to check for Admin session
async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = await verifySession(token);
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

// GET: Fetch products with search and category filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';

    // Build filter query
    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }

    const products = await db.product.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    return Response.json(products);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a product (Admin only)
export async function POST(request) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return Response.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const { sku, name, description, category, baseUnit, pricePerBaseUnit, stockQuantity } = await request.json();

    if (!sku || !name || !baseUnit || pricePerBaseUnit === undefined || stockQuantity === undefined) {
      return Response.json({ error: 'SKU, Name, Base Unit, Price, and Stock Quantity are required.' }, { status: 400 });
    }

    // Validate unit
    const validUnits = ['g', 'kg', 'mL', 'L', 'items'];
    if (!validUnits.includes(baseUnit)) {
      return Response.json({ error: `Invalid base unit: ${baseUnit}. Allowed: ${validUnits.join(', ')}` }, { status: 400 });
    }

    // Check SKU uniqueness
    const existing = await db.product.findUnique({ where: { sku } });
    if (existing) {
      return Response.json({ error: `Product with SKU ${sku} already exists.` }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        sku,
        name,
        description,
        category,
        baseUnit,
        pricePerBaseUnit: parseFloat(pricePerBaseUnit),
        stockQuantity: parseFloat(stockQuantity)
      }
    });

    return Response.json({ success: true, product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
