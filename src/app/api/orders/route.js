import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';
import { convertQuantity, calculateItemPrice } from '@/lib/units';

// Helper to check for active session
async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  return verifySession(token);
}

// GET: Fetch orders based on role
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const where = {};
    if (session.role === 'SELLER') {
      where.userId = session.userId;
    }

    const orders = await db.order.findMany({
      where,
      include: {
        user: {
          select: { name: true, username: true }
        },
        items: {
          include: {
            product: {
              select: { sku: true, name: true, category: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return Response.json(orders);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Place a quotation / order (Seller only)
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'SELLER') {
      return Response.json({ error: 'Unauthorized. Seller role required.' }, { status: 403 });
    }

    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Order must contain at least one item.' }, { status: 400 });
    }

    // Run transaction
    const order = await db.$transaction(async (tx) => {
      let totalOrderPrice = 0;
      const preparedItems = [];

      for (const item of items) {
        const { productId, orderedQuantity, orderedUnit } = item;
        
        const parsedQuantity = parseFloat(orderedQuantity);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
          throw new Error('Quantity must be a positive number.');
        }

        // Fetch product with lock
        const product = await tx.product.findUnique({
          where: { id: productId }
        });

        if (!product) {
          throw new Error(`Product not found.`);
        }

        // Calculate converted quantity and price
        const priceResult = calculateItemPrice(
          parsedQuantity, 
          orderedUnit, 
          product.baseUnit, 
          Number(product.pricePerBaseUnit)
        );

        const requiredStock = priceResult.convertedQuantity;
        const currentStock = Number(product.stockQuantity);

        if (currentStock < requiredStock) {
          throw new Error(`Insufficient stock for product [${product.sku}] ${product.name}. Available: ${currentStock} ${product.baseUnit}, Requested: ${requiredStock} ${product.baseUnit} (as ${parsedQuantity} ${orderedUnit})`);
        }

        // Decrement stock
        const newStock = currentStock - requiredStock;
        await tx.product.update({
          where: { id: productId },
          data: { stockQuantity: newStock }
        });

        totalOrderPrice += priceResult.totalPrice;

        preparedItems.push({
          productId,
          orderedQuantity: parsedQuantity,
          orderedUnit,
          convertedQuantity: requiredStock,
          baseUnit: product.baseUnit,
          pricePerBaseUnit: product.pricePerBaseUnit,
          calculatedPrice: priceResult.totalPrice
        });
      }

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          userId: session.userId,
          status: 'PENDING',
          totalPrice: totalOrderPrice,
          items: {
            create: preparedItems
          }
        },
        include: {
          items: true
        }
      });

      return newOrder;
    });

    return Response.json({ success: true, orderId: order.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
