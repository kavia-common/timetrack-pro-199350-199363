import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Basic dashboard placeholder with a top bar and logout action.
 */

// PUBLIC_INTERFACE
export default function Dashboard() {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Logout failed', e);
    }
  };

  return (
    <div style={styles.layout}>
      <header style={styles.topbar}>
        <div style={styles.brand}>Chronose</div>
        <div style={styles.userArea}>
          <span style={styles.userEmail}>{user?.email}</span>
          <button style={styles.logoutBtn} onClick={handleLogout} aria-label="Log out">
            Logout
          </button>
        </div>
      </header>
      <main style={styles.main}>
        <section style={styles.card}>
          <h2 style={styles.title}>Welcome</h2>
          <p style={styles.muted}>
            This is your dashboard placeholder. Use the navigation to access timesheets and more.
          </p>
        </section>
      </main>
    </div>
  );
}

const styles = {
  layout: {
    minHeight: '100vh',
    background: '#F9FAFB',
    color: '#111827',
  },
  topbar: {
    height: 56,
    borderBottom: '1px solid #E5E7EB',
    background: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
  },
  brand: {
    fontWeight: 700,
    color: '#374151',
  },
  userArea: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  userEmail: {
    fontSize: 14,
    color: '#374151',
  },
  logoutBtn: {
    height: 32,
    padding: '0 12px',
    borderRadius: 8,
    border: '1px solid #EF4444',
    background: '#EF4444',
    color: '#FFFFFF',
    fontWeight: 600,
    cursor: 'pointer',
  },
  main: {
    padding: 16,
  },
  card: {
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 16,
    maxWidth: 720,
  },
  title: {
    marginTop: 0,
    marginBottom: 6,
  },
  muted: {
    color: '#6B7280',
  },
};
