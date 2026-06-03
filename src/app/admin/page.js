'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  RefreshCw, 
  Search, 
  Filter, 
  Package, 
  DollarSign, 
  FileText, 
  User as UserIcon,
  ShoppingBag
} from 'lucide-react';

export default function AdminPage() {
  // Auth state
  const [user, setUser] = useState(null);
  
  // Data state
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null means adding
  
  // Form fields
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [baseUnit, setBaseUnit] = useState('g');
  const [pricePerBaseUnit, setPricePerBaseUnit] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  
  // UI status
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch initial data
  const checkAuthAndFetchData = async () => {
    try {
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();
      
      if (!authData.authenticated || authData.user.role !== 'ADMIN') {
        window.location.href = '/login';
        return;
      }
      
      setUser(authData.user);

      // Fetch products
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);

      // Collect unique categories
      const cats = Array.from(new Set(prodData.map(p => p.category).filter(Boolean)));
      setCategories(cats);

      // Fetch orders
      const orderRes = await fetch('/api/orders');
      const orderData = await orderRes.json();
      setOrders(orderData);

    } catch (err) {
      setErrorMsg('Failed to load dashboard data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      window.location.href = '/login';
    } catch (err) {
      setErrorMsg('Logout failed');
    }
  };

  const handleOpenProductModal = (product = null) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (product) {
      setEditingProduct(product);
      setSku(product.sku);
      setName(product.name);
      setDescription(product.description || '');
      setCategory(product.category || '');
      setBaseUnit(product.baseUnit);
      setPricePerBaseUnit(product.pricePerBaseUnit.toString());
      setStockQuantity(product.stockQuantity.toString());
    } else {
      setEditingProduct(null);
      setSku('');
      setName('');
      setDescription('');
      setCategory('');
      setBaseUnit('g');
      setPricePerBaseUnit('');
      setStockQuantity('');
    }
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const payload = {
      sku,
      name,
      description,
      category,
      baseUnit,
      pricePerBaseUnit: parseFloat(pricePerBaseUnit),
      stockQuantity: parseFloat(stockQuantity)
    };

    try {
      let res;
      if (editingProduct) {
        // Edit product
        res = await fetch(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Create product
        res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed');

      setSuccessMsg(editingProduct ? 'Product updated successfully!' : 'Product added successfully!');
      setIsProductModalOpen(false);
      
      // Refresh products list
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);
      
      // Update categories
      const cats = Array.from(new Set(prodData.map(p => p.category).filter(Boolean)));
      setCategories(cats);

    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleProductDelete = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to delete product');

      setSuccessMsg('Product deleted successfully!');
      
      // Refresh products list
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to update order status');

      setSuccessMsg(`Order status updated to ${newStatus}!`);

      // Refresh orders and products (to show restored stock if rejected)
      const orderRes = await fetch('/api/orders');
      const orderData = await orderRes.json();
      setOrders(orderData);

      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Activity size={40} className="animate-pulse" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading AASAMEDCHEM Admin Panel...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      {/* Header */}
      <header className="header-glass">
        <div className="container header-container">
          <div className="logo-text">
            <Activity size={28} />
            <span>AASAMEDCHEM</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '50px', marginLeft: '0.5rem' }}>ADMIN PANEL</span>
          </div>
          <div className="nav-links">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserIcon size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</span>
            </div>
            <button className="btn btn-outline btn-sm" onClick={handleLogout}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ marginTop: '2rem' }}>
        {/* Messages */}
        {errorMsg && (
          <div className="alert alert-error fade-in">
            <Check size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success fade-in">
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
          <div className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Products</p>
                <h3 style={{ fontSize: '2rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>{products.length}</h3>
              </div>
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--br-md)', color: 'var(--primary)' }}>
                <Package size={24} />
              </div>
            </div>
          </div>

          <div className="card fade-in" style={{ animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Pending Orders</p>
                <h3 style={{ fontSize: '2rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)', color: 'var(--warning)' }}>
                  {orders.filter(o => o.status === 'PENDING').length}
                </h3>
              </div>
              <div style={{ background: 'var(--warning-light)', padding: '0.75rem', borderRadius: 'var(--br-md)', color: 'var(--warning)' }}>
                <RefreshCw size={24} />
              </div>
            </div>
          </div>

          <div className="card fade-in" style={{ animationDelay: '0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Completed Orders</p>
                <h3 style={{ fontSize: '2rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                  {orders.filter(o => o.status === 'COMPLETED').length}
                </h3>
              </div>
              <div style={{ background: 'var(--success-light)', padding: '0.75rem', borderRadius: 'var(--br-md)', color: 'var(--success)' }}>
                <ShoppingBag size={24} />
              </div>
            </div>
          </div>

          <div className="card fade-in" style={{ animationDelay: '0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Revenue</p>
                <h3 style={{ fontSize: '1.8rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>
                  ₹{orders.filter(o => o.status !== 'REJECTED').reduce((acc, curr) => acc + parseFloat(curr.totalPrice), 0).toFixed(2)}
                </h3>
              </div>
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--br-md)', color: 'var(--primary)' }}>
                <DollarSign size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs / Headers */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700 }}>
            Inventory Management
          </h2>
          <button className="btn btn-primary" onClick={() => handleOpenProductModal()}>
            <Plus size={18} />
            <span>Add Product</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="search-container">
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search by SKU, Product Name, Category..."
              className="form-control search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.5rem' }}>
            <Filter size={18} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-control"
              style={{ width: '180px', padding: '0.5rem 1rem' }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="table-container fade-in">
          <table className="custom-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Category</th>
                <th>Base Unit</th>
                <th style={{ textAlign: 'right' }}>Stock Level</th>
                <th style={{ textAlign: 'right' }}>Price / Base Unit</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No products found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.sku}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{p.description}</div>}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', background: '#F8F9FA', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid #E9ECEF' }}>
                        {p.category || 'N/A'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, textTransform: 'lowercase' }}>{p.baseUnit}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                      {parseFloat(p.stockQuantity).toFixed(6)}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--success)' }}>
                      ₹{parseFloat(p.pricePerBaseUnit).toFixed(6)}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => handleOpenProductModal(p)} title="Edit">
                          <Edit size={14} />
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleProductDelete(p.id)} title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Orders Section */}
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem', marginTop: '3rem' }}>
          Incoming Quotations & Orders
        </h2>

        {/* Orders Table */}
        <div className="table-container fade-in">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Order Details</th>
                <th>Seller Info</th>
                <th>Items & Unit Conversions</th>
                <th style={{ textAlign: 'right' }}>Total Price</th>
                <th>Status</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No incoming quotations or orders yet.
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>#{o.id.substring(0, 8)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(o.createdAt).toLocaleString()}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{o.user?.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{o.user?.username}</div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {o.items?.map((item, idx) => (
                          <div key={item.id} style={{
                            padding: '0.6rem',
                            background: '#FFF8F9',
                            border: '1px solid #FFE3E6',
                            borderRadius: '6px',
                            fontSize: '0.85rem'
                          }}>
                            {/* Product Name */}
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              [{item.product?.sku}] {item.product?.name}
                            </div>
                            
                            {/* Conversion Formula */}
                            <div style={{ display: 'flex', flexDirection: 'column', marginTop: '0.25rem', gap: '0.15rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                              <div>
                                • Ordered: <strong style={{ color: 'var(--text-main)' }}>{item.orderedQuantity} {item.orderedUnit}</strong>
                              </div>
                              {item.orderedUnit !== item.baseUnit && (
                                <div style={{ color: 'var(--primary)' }}>
                                  • Conversion: {item.orderedQuantity} {item.orderedUnit} → <strong style={{ fontFamily: 'monospace' }}>{parseFloat(item.convertedQuantity).toFixed(6)} {item.baseUnit}</strong>
                                </div>
                              )}
                              <div>
                                • Base Rate: ₹{parseFloat(item.pricePerBaseUnit).toFixed(6)} per {item.baseUnit}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.2rem', paddingTop: '0.2rem', borderTop: '1px dashed #FFCCD2' }}>
                                <span style={{ fontWeight: 600 }}>Item Total:</span>
                                <strong style={{ color: 'var(--success)' }}>₹{parseFloat(item.calculatedPrice).toFixed(2)}</strong>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)', verticalAlign: 'top', paddingTop: '1.5rem' }}>
                      ₹{parseFloat(o.totalPrice).toFixed(2)}
                    </td>
                    <td style={{ verticalAlign: 'top', paddingTop: '1.5rem' }}>
                      <span className={`badge badge-${o.status.toLowerCase()}`}>
                        {o.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '1.25rem' }}>
                      {o.status === 'PENDING' && (
                        <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '0.4rem 0.8rem', background: 'var(--success)' }}
                            onClick={() => handleOrderStatusUpdate(o.id, 'APPROVED')}
                            title="Approve Order"
                          >
                            <Check size={14} />
                            <span>Approve</span>
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.4rem 0.8rem' }}
                            onClick={() => handleOrderStatusUpdate(o.id, 'REJECTED')}
                            title="Reject Order"
                          >
                            <X size={14} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}
                      {o.status === 'APPROVED' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '0.4rem 0.8rem', color: '#2B6CB0', border: '1px solid #BEE3F8', background: '#EBF8FF' }}
                          onClick={() => handleOrderStatusUpdate(o.id, 'COMPLETED')}
                        >
                          <Check size={14} />
                          <span>Complete</span>
                        </button>
                      )}
                      {(o.status === 'COMPLETED' || o.status === 'REJECTED') && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Archived</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* Product Create/Edit Modal */}
      {isProductModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem' }}>
                {editingProduct ? 'Modify Product Details' : 'Add New Product'}
              </h3>
              <button className="modal-close" onClick={() => setIsProductModalOpen(false)}>×</button>
            </div>
            
            <form onSubmit={handleProductSubmit}>
              <div className="form-group">
                <label className="form-label">SKU (Stock Keeping Unit)</label>
                <input
                  type="text"
                  className="form-control"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  disabled={!!editingProduct}
                  placeholder="e.g. PAR-RAW-001"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paracetamol Raw Material"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description (Optional)</label>
                <textarea
                  className="form-control"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter details..."
                  style={{ minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  className="form-control"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. API / Raw Material"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Base Quantity Unit</label>
                <select
                  className="form-control"
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                  disabled={!!editingProduct}
                >
                  <option value="g">Grams (g)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="mL">Milliliters (mL)</option>
                  <option value="L">Liters (L)</option>
                  <option value="items">Items (unit count)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Price per Base Unit (₹ INR)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="0.000001"
                  className="form-control"
                  value={pricePerBaseUnit}
                  onChange={(e) => setPricePerBaseUnit(e.target.value)}
                  placeholder="e.g. 1.500000"
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.75rem' }}>
                <label className="form-label">Stock Quantity (in Base Unit)</label>
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  className="form-control"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  placeholder="e.g. 5000.000000"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setIsProductModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
