import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { verifySession } from '@/lib/auth';

async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  return verifySession(token);
}

// PUT: Update product details (Seller owner or Admin)
export async function PUT(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { name, description, category, pricePerBaseUnit, stockQuantity } = await request.json();

    if (!name || pricePerBaseUnit === undefined || stockQuantity === undefined) {
      return Response.json({ error: 'Name, Price, and Stock Quantity are required.' }, { status: 400 });
    }

    // Fetch product to verify ownership
    const product = await db.product.findUnique({
      where: { id }
    });

    if (!product) {
      return Response.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Authorized if Admin or the Seller who owns the product
    const isAuthorized = session.role === 'ADMIN' || (session.role === 'SELLER' && product.sellerId === session.userId);
    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden. You do not own this product.' }, { status: 403 });
    }

    const updatedProduct = await db.product.update({
      where: { id },
      data: {
        name,
        description,
        category,
        pricePerBaseUnit: parseFloat(pricePerBaseUnit),
        stockQuantity: parseFloat(stockQuantity)
      }
    });

    return Response.json({ success: true, product: updatedProduct });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete a product (Seller owner or Admin)
export async function DELETE(request, { params }) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    
    // Fetch product to verify ownership
    const product = await db.product.findUnique({
      where: { id }
    });

    if (!product) {
      return Response.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Authorized if Admin or the Seller who owns the product
    const isAuthorized = session.role === 'ADMIN' || (session.role === 'SELLER' && product.sellerId === session.userId);
    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden. You do not own this product.' }, { status: 403 });
    }

    // Check if the product has any orders before deleting
    const orderItemsCount = await db.orderItem.count({
      where: { productId: id }
    });
    
    if (orderItemsCount > 0) {
      return Response.json({ 
        error: 'Cannot delete product because it has associated orders/quotations. You can set stock to 0 instead.' 
      }, { status: 400 });
    }

    // Create a notification for the Seller if deleted by Admin (and not deleting their own)
    if (session.role === 'ADMIN' && product.sellerId !== session.userId) {
      await db.notification.create({
        data: {
          userId: product.sellerId,
          message: `Your product [${product.sku}] "${product.name}" was delisted by the Admin as it was not verified or found genuine.`
        }
      });
    }

    await db.product.delete({
      where: { id }
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
