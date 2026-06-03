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

// PUT: Update product details (Admin only)
export async function PUT(request, { params }) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return Response.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const { id } = await params;
    const { name, description, category, pricePerBaseUnit, stockQuantity } = await request.json();

    if (!name || pricePerBaseUnit === undefined || stockQuantity === undefined) {
      return Response.json({ error: 'Name, Price, and Stock Quantity are required.' }, { status: 400 });
    }

    const product = await db.product.update({
      where: { id },
      data: {
        name,
        description,
        category,
        pricePerBaseUnit: parseFloat(pricePerBaseUnit),
        stockQuantity: parseFloat(stockQuantity)
      }
    });

    return Response.json({ success: true, product });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a product (Admin only)
export async function DELETE(request, { params }) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return Response.json({ error: 'Unauthorized. Admin role required.' }, { status: 403 });
    }

    const { id } = await params;
    
    // Check if the product has any orders before deleting (to prevent database integrity errors)
    const orderItemsCount = await db.orderItem.count({
      where: { productId: id }
    });
    
    if (orderItemsCount > 0) {
      return Response.json({ 
        error: 'Cannot delete product because it has associated orders/quotations. You can set stock to 0 instead.' 
      }, { status: 400 });
    }

    await db.product.delete({
      where: { id }
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
