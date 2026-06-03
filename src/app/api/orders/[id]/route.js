import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  const session = await verifySession(token);
  if (!session || session.role !== 'ADMIN') return null;
  return session;
}

// PUT: Update order status (Admin only)
export async function PUT(request, { params }) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return Response.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const { id } = await params;
    const { status } = await request.json();

    const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'];
    if (!allowedStatuses.includes(status)) {
      return Response.json({ error: `Invalid status: ${status}. Allowed: ${allowedStatuses.join(', ')}` }, { status: 400 });
    }

    // Run in transaction to handle status change and stock restoration if rejected
    const updatedOrder = await db.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) {
        throw new Error('Order not found.');
      }

      // If the order status is changing to REJECTED and was not rejected before, restore the stock
      if (status === 'REJECTED' && order.status !== 'REJECTED') {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId }
          });
          
          if (product) {
            const restoredStock = Number(product.stockQuantity) + Number(item.convertedQuantity);
            await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: restoredStock }
            });
          }
        }
      } 
      // If the order was REJECTED and is being changed back to something else, deduct the stock again
      else if (order.status === 'REJECTED' && status !== 'REJECTED') {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId }
          });
          
          if (product) {
            const currentStock = Number(product.stockQuantity);
            const requiredStock = Number(item.convertedQuantity);
            
            if (currentStock < requiredStock) {
              throw new Error(`Cannot restore order. Insufficient stock for product [${product.sku}] ${product.name}. Available: ${currentStock} ${product.baseUnit}, Required: ${requiredStock} ${product.baseUnit}`);
            }

            await tx.product.update({
              where: { id: item.productId },
              data: { stockQuantity: currentStock - requiredStock }
            });
          }
        }
      }

      const updated = await tx.order.update({
        where: { id },
        data: { status },
        include: {
          user: {
            select: { name: true, username: true }
          },
          items: {
            include: {
              product: {
                select: { sku: true, name: true }
              }
            }
          }
        }
      });

      return updated;
    });

    return Response.json({ success: true, order: updatedOrder });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
