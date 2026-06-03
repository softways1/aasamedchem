'use strict';
'use client';

import React, { useState } from 'react';
import { Activity, Lock, User, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('CUSTOMER');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const url = isSignUp ? '/api/auth/signup' : '/api/auth';
      const payload = isSignUp 
        ? { username, password, name, role }
        : { username, password };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Operation failed');
      }

      if (isSignUp) {
        setSuccess('Registration successful! Logging you in...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (type) => {
    setError('');
    setSuccess('');
    setIsSignUp(false);
    if (type === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else if (type === 'seller') {
      setUsername('seller');
      setPassword('seller123');
    } else {
      setUsername('aman');
      setPassword('aman123');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1.5rem',
      background: 'radial-gradient(circle at 50% 50%, #FFF5F6 0%, #FFF0F2 100%)'
    }}>
      <div className="card fade-in" style={{
        maxWidth: '480px',
        width: '100%',
        padding: '2.5rem',
        boxShadow: '0 20px 40px rgba(255, 182, 193, 0.15)',
        border: '1px solid rgba(255, 182, 193, 0.3)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            marginBottom: '1rem'
          }}>
            <Activity size={32} />
          </div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 800,
            background: 'linear-gradient(135deg, var(--primary), #FF5E7E)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '0.25rem'
          }}>
            AASAMEDCHEM
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
            Pharma Inventory & Ordering Hub
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error fade-in" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="alert alert-success fade-in" style={{ marginBottom: '1.5rem', background: '#E6FFFA', color: '#00A389', border: '1px solid #B2F5EA' }}>
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {isSignUp && (
            <div className="form-group">
              <label className="form-label" htmlFor="name">Display Name</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}>
                  <Sparkles size={18} />
                </span>
                <input
                  className="form-control"
                  id="name"
                  type="text"
                  placeholder="e.g. Aman Singh"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ paddingLeft: '2.75rem' }}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}>
                <User size={18} />
              </span>
              <input
                className="form-control"
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: isSignUp ? '1rem' : '1.5rem' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}>
                <Lock size={18} />
              </span>
              <input
                className="form-control"
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{ paddingLeft: '2.75rem' }}
              />
            </div>
          </div>

          {isSignUp && (
            <div className="form-group" style={{ marginBottom: '1.75rem' }}>
              <label className="form-label" htmlFor="role">Register As</label>
              <select
                className="form-control"
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ padding: '0.8rem 1rem' }}
              >
                <option value="CUSTOMER">Customer (Buy Medicines)</option>
                <option value="SELLER">Seller (List/Sell Medicines)</option>
              </select>
            </div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '0.9rem', marginBottom: '1.5rem', fontWeight: 700 }}
          >
            {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        {/* View Toggle */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setSuccess('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary)',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              textDecoration: 'underline'
            }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Register Now"}
          </button>
        </div>

        {/* Quick Fill Accounts */}
        <div style={{
          borderTop: '1px solid var(--border-color)',
          paddingTop: '1.5rem',
          textAlign: 'center'
        }}>
          <p style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            fontWeight: 600,
            marginBottom: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Quick Fill Demo Accounts
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('admin')}
              type="button"
              style={{ fontSize: '0.75rem' }}
            >
              Dr. Sarah (Admin)
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('seller')}
              type="button"
              style={{ fontSize: '0.75rem' }}
            >
              Rohan (Seller)
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleQuickFill('customer')}
              type="button"
              style={{ fontSize: '0.75rem' }}
            >
              Aman (Customer)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
