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

    let orders;

    if (session.role === 'ADMIN') {
      // Admin sees all orders
      orders = await db.order.findMany({
        include: {
          user: {
            select: { name: true, username: true } // Customer
          },
          seller: {
            select: { name: true, username: true } // Seller
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
    } else if (session.role === 'SELLER') {
      // Seller sees orders assigned to them
      orders = await db.order.findMany({
        where: { sellerId: session.userId },
        include: {
          user: {
            select: { name: true, username: true } // Customer
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
    } else {
      // Customer sees orders they placed
      orders = await db.order.findMany({
        where: { userId: session.userId },
        include: {
          seller: {
            select: { name: true, username: true } // Seller
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
    }

    return Response.json(orders);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// POST: Place orders (Customer only)
export async function POST(request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'CUSTOMER') {
      return Response.json({ error: 'Unauthorized. Customer role required to checkout.' }, { status: 403 });
    }

    const { items } = await request.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Order must contain at least one item.' }, { status: 400 });
    }

    // 1. Fetch all products to get their seller IDs
    const productIds = items.map(item => item.productId);
    const products = await db.product.findMany({
      where: { id: { in: productIds } }
    });

    const productMap = {};
    for (const p of products) {
      productMap[p.id] = p;
    }

    // 2. Group cart items by seller ID
    const sellerGroups = {};
    for (const item of items) {
      const product = productMap[item.productId];
      if (!product) {
        return Response.json({ error: `Product not found: ${item.productId}` }, { status: 400 });
      }

      const sId = product.sellerId;
      if (!sellerGroups[sId]) {
        sellerGroups[sId] = [];
      }
      sellerGroups[sId].push({ item, product });
    }

    // 3. Process each seller group inside a transaction
    const createdOrders = await db.$transaction(async (tx) => {
      const ordersRes = [];

      for (const [sellerId, groupItems] of Object.entries(sellerGroups)) {
        let totalOrderPrice = 0;
        const preparedItems = [];

        for (const { item, product } of groupItems) {
          const { orderedQuantity, orderedUnit } = item;
          
          const parsedQuantity = parseFloat(orderedQuantity);
          if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            throw new Error('Quantity must be a positive number.');
          }

          // Fetch product with lock
          const txProduct = await tx.product.findUnique({
            where: { id: product.id }
          });

          if (!txProduct) {
            throw new Error(`Product not found.`);
          }

          // Calculate converted quantity and price
          const priceResult = calculateItemPrice(
            parsedQuantity, 
            orderedUnit, 
            txProduct.baseUnit, 
            Number(txProduct.pricePerBaseUnit)
          );

          const requiredStock = priceResult.convertedQuantity;
          const currentStock = Number(txProduct.stockQuantity);

          if (currentStock < requiredStock) {
            throw new Error(`Insufficient stock for product [${txProduct.sku}] ${txProduct.name}. Available: ${currentStock} ${txProduct.baseUnit}, Requested: ${requiredStock} ${txProduct.baseUnit} (as ${parsedQuantity} ${orderedUnit})`);
          }

          // Decrement stock
          const newStock = currentStock - requiredStock;
          await tx.product.update({
            where: { id: txProduct.id },
            data: { stockQuantity: newStock }
          });

          totalOrderPrice += priceResult.totalPrice;

          preparedItems.push({
            productId: txProduct.id,
            orderedQuantity: parsedQuantity,
            orderedUnit,
            convertedQuantity: requiredStock,
            baseUnit: txProduct.baseUnit,
            pricePerBaseUnit: txProduct.pricePerBaseUnit,
            calculatedPrice: priceResult.totalPrice
          });
        }

        // Create Order
        const newOrder = await tx.order.create({
          data: {
            userId: session.userId,
            sellerId,
            status: 'PENDING',
            totalPrice: totalOrderPrice,
            items: {
              create: preparedItems
            }
          }
        });

        ordersRes.push(newOrder);
      }

      return ordersRes;
    });

    return Response.json({ success: true, orderIds: createdOrders.map(o => o.id) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
