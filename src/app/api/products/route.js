import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

// Helper to get active session
async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  return verifySession(token);
}

// GET: Fetch products with search, category, and own-seller filters
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const own = searchParams.get('own') === 'true';

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

    if (own) {
      const session = await getSession();
      if (!session || session.role !== 'SELLER') {
        return Response.json({ error: 'Unauthorized. Seller role required for filtering own products.' }, { status: 403 });
      }
      where.sellerId = session.userId;
    }

    const products = await db.product.findMany({
      where,
      include: {
        seller: {
          select: { name: true, username: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return Response.json(products);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a product (Seller only)
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SELLER') {
      return Response.json({ error: 'Unauthorized. Seller role required.' }, { status: 403 });
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
        stockQuantity: parseFloat(stockQuantity),
        sellerId: session.userId
      }
    });

    return Response.json({ success: true, product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
