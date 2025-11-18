import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute ensures only authenticated users can access the children.
 * Redirects to /login if not authenticated.
 */

// PUBLIC_INTERFACE
export default function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();

  if (initializing) {
    return (
      <div style={styles.splash}>
        <div style={styles.spinner} aria-busy="true" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

const styles = {
  splash: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#F9FAFB',
  },
  spinner: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    border: '3px solid #E5E7EB',
    borderTopColor: '#374151',
    animation: 'spin 1s linear infinite',
  },
};
