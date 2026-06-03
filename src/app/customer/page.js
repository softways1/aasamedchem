'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  LogOut, 
  Search, 
  Filter, 
  ShoppingCart, 
  Trash2, 
  Check, 
  AlertCircle, 
  User as UserIcon, 
  ShoppingBag,
  Info,
  Clock
} from 'lucide-react';
import { getCompatibleUnits, calculateItemPrice } from '@/lib/units';

export default function CustomerPage() {
  // Auth state
  const [user, setUser] = useState(null);

  // Data state
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Active product input states (selection)
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderUnit, setOrderUnit] = useState('');
  
  // Real-time calculation previews
  const [previewConvertedQty, setPreviewConvertedQty] = useState(0);
  const [previewPrice, setPreviewPrice] = useState(0);
  const [isStockSufficient, setIsStockSufficient] = useState(true);

  // Cart state
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Status flags
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [orderPlacing, setOrderPlacing] = useState(false);

  // Fetch initial data
  const checkAuthAndFetchData = async () => {
    try {
      const authRes = await fetch('/api/auth');
      const authData = await authRes.json();

      if (!authData.authenticated || authData.user.role !== 'CUSTOMER') {
        window.location.href = '/login';
        return;
      }

      setUser(authData.user);

      // Fetch products (shows all sellers)
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);

      // Collect unique categories
      const cats = Array.from(new Set(prodData.map(p => p.category).filter(Boolean)));
      setCategories(cats);

      // Fetch customer orders
      const orderRes = await fetch('/api/orders');
      const orderData = await orderRes.json();
      setOrders(orderData);

    } catch (err) {
      setErrorMsg('Failed to load marketplace data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  // Update calculation preview whenever selected product, quantity, or unit changes
  useEffect(() => {
    if (!selectedProduct || !orderQuantity || isNaN(parseFloat(orderQuantity))) {
      setPreviewConvertedQty(0);
      setPreviewPrice(0);
      setIsStockSufficient(true);
      return;
    }

    const qty = parseFloat(orderQuantity);
    if (qty <= 0) {
      setPreviewConvertedQty(0);
      setPreviewPrice(0);
      setIsStockSufficient(true);
      return;
    }

    try {
      const calc = calculateItemPrice(
        qty,
        orderUnit,
        selectedProduct.baseUnit,
        Number(selectedProduct.pricePerBaseUnit)
      );

      setPreviewConvertedQty(calc.convertedQuantity);
      setPreviewPrice(calc.totalPrice);

      const availableStock = Number(selectedProduct.stockQuantity);
      setIsStockSufficient(availableStock >= calc.convertedQuantity);
    } catch (e) {
      // Incompatible dimensions
      setIsStockSufficient(false);
    }

  }, [selectedProduct, orderQuantity, orderUnit]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      window.location.href = '/login';
    } catch (err) {
      setErrorMsg('Logout failed');
    }
  };

  const handleSelectProduct = (product) => {
    setErrorMsg('');
    setSuccessMsg('');
    setSelectedProduct(product);
    setOrderQuantity('');
    setOrderUnit(product.baseUnit);
  };

  const handleAddToCart = () => {
    if (!selectedProduct || !orderQuantity || parseFloat(orderQuantity) <= 0) return;

    const qty = parseFloat(orderQuantity);
    
    // Perform final check
    const calc = calculateItemPrice(
      qty,
      orderUnit,
      selectedProduct.baseUnit,
      Number(selectedProduct.pricePerBaseUnit)
    );

    const availableStock = Number(selectedProduct.stockQuantity);
    if (availableStock < calc.convertedQuantity) {
      setErrorMsg('Insufficient stock to add this item to cart.');
      return;
    }

    // Check if product already in cart
    const existingIndex = cart.findIndex(item => item.product.id === selectedProduct.id);
    
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex] = {
        product: selectedProduct,
        orderedQuantity: qty,
        orderedUnit: orderUnit,
        convertedQuantity: calc.convertedQuantity,
        calculatedPrice: calc.totalPrice
      };
      setCart(updatedCart);
      setSuccessMsg(`Updated cart item for ${selectedProduct.name}`);
    } else {
      setCart([
        ...cart,
        {
          product: selectedProduct,
          orderedQuantity: qty,
          orderedUnit: orderUnit,
          convertedQuantity: calc.convertedQuantity,
          calculatedPrice: calc.totalPrice
        }
      ]);
      setSuccessMsg(`Added ${selectedProduct.name} to cart`);
    }

    // Reset selection
    setSelectedProduct(null);
    setOrderQuantity('');
    setOrderUnit('');
    setPreviewConvertedQty(0);
    setPreviewPrice(0);
  };

  const handleRemoveFromCart = (productId) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setErrorMsg('');
    setSuccessMsg('');
    setOrderPlacing(true);

    const payload = {
      items: cart.map(item => ({
        productId: item.product.id,
        orderedQuantity: item.orderedQuantity,
        orderedUnit: item.orderedUnit
      }))
    };

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to place order');

      setSuccessMsg('Your checkout succeeded! Your orders have been sent to the respective sellers.');
      setCart([]);
      setIsCartOpen(false);

      // Refresh product stock levels and orders list
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);

      const orderRes = await fetch('/api/orders');
      const orderData = await orderRes.json();
      setOrders(orderData);

    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setOrderPlacing(false);
    }
  };

  // Filtered catalogue
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.seller?.name && p.seller.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory ? p.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((acc, item) => acc + item.calculatedPrice, 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Activity size={40} className="animate-pulse" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading AASAMEDCHEM Pharmacy Marketplace...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '6rem' }}>
      {/* Header */}
      <header className="header-glass">
        <div className="container header-container">
          <div className="logo-text">
            <Activity size={28} />
            <span>AASAMEDCHEM</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '50px', marginLeft: '0.5rem' }}>MARKETPLACE</span>
          </div>
          <div className="nav-links">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserIcon size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.name}</span>
            </div>
            
            {/* Cart Trigger */}
            <button 
              className="btn btn-secondary btn-sm" 
              style={{ position: 'relative' }}
              onClick={() => setIsCartOpen(true)}
            >
              <ShoppingCart size={16} />
              <span>Cart</span>
              {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
            </button>

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
            <AlertCircle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="alert alert-success fade-in">
            <Check size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-3" style={{ alignItems: 'flex-start' }}>
          {/* Catalogue and Order history */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Catalogue search and filters */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.25rem' }}>
                Browse Pharmacy Catalog
              </h2>
              
              <div className="search-container">
                <div className="search-input-wrapper">
                  <Search className="search-icon" size={20} />
                  <input
                    type="text"
                    placeholder="Search by SKU, medicine, category, seller name..."
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

              {/* Grid Catalogue items */}
              <div className="grid grid-cols-2">
                {filteredProducts.length === 0 ? (
                  <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: 'var(--br-lg)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                    No products found in the catalog.
                  </div>
                ) : (
                  filteredProducts.map(p => {
                    const isSelected = selectedProduct?.id === p.id;
                    const stock = Number(p.stockQuantity);
                    return (
                      <div 
                        key={p.id} 
                        className={`card fade-in ${isSelected ? 'selected-card' : ''}`}
                        onClick={() => handleSelectProduct(p)}
                        style={{
                          cursor: 'pointer',
                          border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                          background: stock === 0 ? '#FAF6F7' : 'white'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '0.05em' }}>
                            {p.sku}
                          </span>
                          <span style={{ fontSize: '0.8rem', background: '#F7EFF1', color: 'var(--text-main)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>
                            {p.category || 'API'}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                          {p.name}
                        </h4>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', minHeight: '36px', marginBottom: '0.5rem' }}>
                          {p.description || 'No description provided.'}
                        </p>
                        
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem' }}>
                          Sold by: {p.seller?.name || 'Unknown Seller'}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Stock:</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: stock === 0 ? 'var(--error)' : 'var(--text-main)' }}>
                              {stock > 0 ? `${stock.toFixed(4)} ${p.baseUnit}` : 'OUT OF STOCK'}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Price Rate:</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'monospace', color: 'var(--success)' }}>
                              ₹{Number(p.pricePerBaseUnit).toFixed(2)}/{p.baseUnit}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Order history */}
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={22} style={{ color: 'var(--primary)' }} />
                <span>My Purchase History</span>
              </h2>

              <div className="table-container">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Merchant</th>
                      <th>Details</th>
                      <th style={{ textAlign: 'right' }}>Total Price</th>
                      <th style={{ textAlign: 'center' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                          You have not placed any orders yet.
                        </td>
                      </tr>
                    ) : (
                      orders.map(o => (
                        <tr key={o.id}>
                          <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>#{o.id.substring(0, 8)}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{o.seller?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{o.seller?.username}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                              {o.items?.map(item => (
                                <div key={item.id} style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                  • {item.product?.name} ({item.orderedQuantity} {item.orderedUnit})
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                            ₹{parseFloat(o.totalPrice).toFixed(2)}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge badge-${o.status.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                              {o.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Interactive Configurator Column */}
          <div style={{ position: 'sticky', top: '100px' }}>
            {selectedProduct ? (
              <div className="card fade-in" style={{ border: '2px solid var(--primary-border)', background: 'white' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '0.25rem', color: 'var(--text-main)' }}>
                  Configure Quantity
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Select unit and quantity to add to cart.
                </p>

                <div style={{ padding: '0.85rem', background: 'var(--bg-primary)', borderRadius: 'var(--br-md)', border: '1px dashed var(--primary-border)', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>SELECTED PRODUCT:</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)', marginTop: '0.15rem' }}>{selectedProduct.name}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                    <span>Merchant: <strong>{selectedProduct.seller?.name}</strong></span>
                    <span>Available: <strong>{Number(selectedProduct.stockQuantity).toFixed(4)} {selectedProduct.baseUnit}</strong></span>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Order Unit</label>
                  <select
                    className="form-control"
                    value={orderUnit}
                    onChange={(e) => setOrderUnit(e.target.value)}
                  >
                    {getCompatibleUnits(selectedProduct.baseUnit).map(u => (
                      <option key={u} value={u}>
                        {u === 'items' ? 'Items (count)' : u}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0.0001"
                    placeholder="Enter quantity..."
                    className="form-control"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                  />
                </div>

                {/* Calculation breakdown */}
                {previewConvertedQty > 0 && (
                  <div style={{
                    padding: '1rem',
                    background: '#FFF8F9',
                    border: '1px solid #FFE3E6',
                    borderRadius: 'var(--br-md)',
                    marginBottom: '1.5rem',
                    fontSize: '0.85rem'
                  }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Info size={16} />
                      <span>Conversion & Pricing breakdown</span>
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Requested qty:</span>
                        <strong style={{ color: 'var(--text-main)' }}>{orderQuantity} {orderUnit}</strong>
                      </div>
                      
                      {orderUnit !== selectedProduct.baseUnit && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--primary)' }}>
                          <span>Conversion to base:</span>
                          <strong>{previewConvertedQty.toFixed(6)} {selectedProduct.baseUnit}</strong>
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Rate per base unit:</span>
                        <strong style={{ color: 'var(--text-main)' }}>₹{Number(selectedProduct.pricePerBaseUnit).toFixed(4)}/{selectedProduct.baseUnit}</strong>
                      </div>

                      <div style={{ borderTop: '1px dashed #FFCCD2', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem' }}>
                        <span style={{ fontWeight: 700 }}>Total Price (INR):</span>
                        <strong style={{ color: 'var(--success)', fontSize: '1.05rem' }}>₹{previewPrice.toFixed(2)}</strong>
                      </div>
                    </div>

                    {!isStockSufficient && (
                      <div style={{ display: 'flex', gap: '0.35rem', color: 'var(--error)', marginTop: '0.75rem', fontWeight: 600 }}>
                        <AlertCircle size={16} />
                        <span>Insufficient merchant inventory!</span>
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setSelectedProduct(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={!isStockSufficient || !orderQuantity || parseFloat(orderQuantity) <= 0}
                    onClick={handleAddToCart}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            ) : (
              <div className="card fade-in" style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--primary-border)', background: '#FFFDFD' }}>
                <div style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'inline-flex', background: 'var(--primary-light)', padding: '0.75rem', borderRadius: '50%' }}>
                  <ShoppingCart size={24} />
                </div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  No Product Selected
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Click on a product card from the catalogue to configure your order quantity and add it to your shopping cart.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Cart Drawer overlay */}
      {isCartOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShoppingCart size={22} style={{ color: 'var(--primary)' }} />
                <span>My Shopping Cart</span>
              </h3>
              <button className="modal-close" onClick={() => setIsCartOpen(false)}>×</button>
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Your cart is empty. Select products from the catalogue to add them here.
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '350px', overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.25rem' }}>
                  {cart.map(item => (
                    <div key={item.product.id} style={{
                      padding: '1rem',
                      background: '#FFF8F9',
                      border: '1px solid #FFE3E6',
                      borderRadius: '8px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem' }}>{item.product.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                          Sold by: {item.product.seller?.name} | Qty: <strong style={{ color: 'var(--text-main)' }}>{item.orderedQuantity} {item.orderedUnit}</strong>
                        </div>
                        {item.orderedUnit !== item.product.baseUnit && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginTop: '0.15rem' }}>
                            Converts to: {item.convertedQuantity.toFixed(4)} {item.product.baseUnit}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Total Price</span>
                          <strong style={{ color: 'var(--success)', fontFamily: 'monospace', fontSize: '1rem' }}>₹{item.calculatedPrice.toFixed(2)}</strong>
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.35rem', borderRadius: '4px' }}
                          onClick={() => handleRemoveFromCart(item.product.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: '1rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>Total Checkout Value:</span>
                  <strong style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>₹{cartTotal.toFixed(2)}</strong>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsCartOpen(false)}
                  >
                    Continue Shopping
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={orderPlacing}
                    onClick={handlePlaceOrder}
                  >
                    {orderPlacing ? 'Processing Checkout...' : 'Place Marketplace Order'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
