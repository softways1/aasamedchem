'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  LogOut, 
  Trash2, 
  Search, 
  Filter, 
  Package, 
  DollarSign, 
  FileText, 
  User as UserIcon,
  Users as UsersIcon,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Check
} from 'lucide-react';

export default function AdminPage() {
  // Auth state
  const [user, setUser] = useState(null);
  
  // Data state
  const [usersList, setUsersList] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'products' | 'orders'

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
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

      // Fetch users
      const userRes = await fetch('/api/users');
      const userData = await userRes.json();
      setUsersList(userData);

      // Fetch products
      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);

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

  const handleUserDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? All their associated records will be deleted.')) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setSuccessMsg('User deleted successfully!');
      
      // Refresh user list and other states
      const userRes = await fetch('/api/users');
      const userData = await userRes.json();
      setUsersList(userData);

      const prodRes = await fetch('/api/products');
      const prodData = await prodRes.json();
      setProducts(prodData);

      const orderRes = await fetch('/api/orders');
      const orderData = await orderRes.json();
      setOrders(orderData);
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

  // Filter lists based on active tab & query
  const getFilteredData = () => {
    if (activeTab === 'users') {
      return usersList.filter(u => {
        const matchesSearch = 
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter ? u.role === roleFilter : true;
        return matchesSearch && matchesRole;
      });
    } else if (activeTab === 'products') {
      return products.filter(p => {
        const matchesSearch = 
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (p.seller?.name && p.seller.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesSearch;
      });
    } else {
      return orders.filter(o => {
        const matchesSearch = 
          o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.seller?.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
    }
  };

  const filteredItems = getFilteredData();

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <Activity size={40} className="animate-pulse" style={{ color: 'var(--primary)' }} />
        <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Loading AASAMEDCHEM Admin Control Console...</p>
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
            <span style={{ fontSize: '0.9rem', fontWeight: 600, background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.2rem 0.6rem', borderRadius: '50px', marginLeft: '0.5rem' }}>ADMIN HQ</span>
          </div>
          <div className="nav-links">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserIcon size={18} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>ASSAMEDCHEM Admin Panel</span>
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

        {/* Dashboard Stat Cards */}
        <div className="grid grid-cols-4" style={{ marginBottom: '2.5rem' }}>
          <div className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Marketplace Users</p>
                <h3 style={{ fontSize: '2rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>
                  {usersList.filter(u => u.role !== 'ADMIN').length}
                </h3>
              </div>
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--br-md)', color: 'var(--primary)' }}>
                <UsersIcon size={24} />
              </div>
            </div>
          </div>

          <div className="card fade-in" style={{ animationDelay: '0.1s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Active listings</p>
                <h3 style={{ fontSize: '2rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)' }}>
                  {products.length}
                </h3>
              </div>
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--br-md)', color: 'var(--primary)' }}>
                <Package size={24} />
              </div>
            </div>
          </div>

          <div className="card fade-in" style={{ animationDelay: '0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Total Orders</p>
                <h3 style={{ fontSize: '2rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)', color: 'var(--primary)' }}>
                  {orders.length}
                </h3>
              </div>
              <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--br-md)', color: 'var(--primary)' }}>
                <ShoppingBag size={24} />
              </div>
            </div>
          </div>

          <div className="card fade-in" style={{ animationDelay: '0.3s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Gross Volume</p>
                <h3 style={{ fontSize: '1.8rem', marginTop: '0.5rem', fontFamily: 'var(--font-display)', color: 'var(--success)' }}>
                  ₹{orders.filter(o => o.status !== 'REJECTED').reduce((acc, curr) => acc + parseFloat(curr.totalPrice), 0).toFixed(2)}
                </h3>
              </div>
              <div style={{ background: 'var(--success-light)', padding: '0.75rem', borderRadius: 'var(--br-md)', color: 'var(--success)' }}>
                <DollarSign size={24} />
              </div>
            </div>
          </div>
        </div>

        {/* Section Tabs */}
        <div style={{ display: 'flex', gap: '1rem', borderBottom: '2px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '2rem' }}>
          <button 
            className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => { setActiveTab('users'); setSearchQuery(''); setRoleFilter(''); }}
            style={{ borderRadius: '8px' }}
          >
            <UsersIcon size={18} />
            <span>Manage Users</span>
          </button>
          <button 
            className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => { setActiveTab('products'); setSearchQuery(''); setRoleFilter(''); }}
            style={{ borderRadius: '8px' }}
          >
            <Package size={18} />
            <span>Manage Products</span>
          </button>
          <button 
            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-outline'}`} 
            onClick={() => { setActiveTab('orders'); setSearchQuery(''); setRoleFilter(''); }}
            style={{ borderRadius: '8px' }}
          >
            <FileText size={18} />
            <span>Monitor Orders</span>
          </button>
        </div>

        {/* Controls (Search & Filters) */}
        <div className="search-container" style={{ marginBottom: '1.5rem' }}>
          <div className="search-input-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder={
                activeTab === 'users' ? 'Search users by name, username...' :
                activeTab === 'products' ? 'Search products by SKU, name, seller...' :
                'Search orders by ID, customer, seller, status...'
              }
              className="form-control search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          {activeTab === 'users' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingRight: '0.5rem' }}>
              <Filter size={18} style={{ color: 'var(--text-muted)' }} />
              <select
                className="form-control"
                style={{ width: '160px', padding: '0.5rem 1rem' }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="CUSTOMER">Customer</option>
                <option value="SELLER">Seller</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          )}
        </div>

        {/* Dynamic Table Content */}
        <div className="table-container fade-in">
          {activeTab === 'users' && (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Display Name</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ color: 'var(--text-muted)' }}>@{u.username}</td>
                      <td>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          fontWeight: 700,
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          background: u.role === 'ADMIN' ? '#EBF8FF' : u.role === 'SELLER' ? '#FFF5F5' : '#E6FFFA',
                          color: u.role === 'ADMIN' ? '#2B6CB0' : u.role === 'SELLER' ? '#C53030' : '#319795'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td style={{ textAlign: 'center' }}>
                        {u.id !== user?.id && u.role !== 'ADMIN' ? (
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleUserDelete(u.id)}
                            title="Delete User"
                          >
                            <Trash2 size={14} />
                            <span>Delete</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Restricted</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'products' && (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product Details</th>
                  <th>Owner Seller</th>
                  <th style={{ textAlign: 'right' }}>Stock Level</th>
                  <th style={{ textAlign: 'right' }}>Price/Unit</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.sku}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.category && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{p.category}</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{p.seller?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{p.seller?.username}</div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>
                        {parseFloat(p.stockQuantity).toFixed(4)} {p.baseUnit}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'monospace', color: 'var(--success)' }}>
                        ₹{parseFloat(p.pricePerBaseUnit).toFixed(2)}/{p.baseUnit}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button 
                          className="btn btn-danger btn-sm" 
                          onClick={() => handleProductDelete(p.id)}
                          title="Delete Listing"
                        >
                          <Trash2 size={14} />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'orders' && (
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer Info</th>
                  <th>Seller Info</th>
                  <th>Details</th>
                  <th style={{ textAlign: 'right' }}>Total Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(o => (
                    <tr key={o.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>#{o.id.substring(0, 8)}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(o.createdAt).toLocaleString()}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.user?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{o.user?.username}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.seller?.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{o.seller?.username}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {o.items?.map(item => (
                            <div key={item.id} style={{ fontSize: '0.8rem', color: 'var(--text-main)' }}>
                              • {item.product?.name} ({item.orderedQuantity} {item.orderedUnit})
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                        ₹{parseFloat(o.totalPrice).toFixed(2)}
                      </td>
                      <td>
                        <span className={`badge badge-${o.status.toLowerCase()}`} style={{ fontSize: '0.75rem' }}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
