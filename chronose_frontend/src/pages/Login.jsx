import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login page for Chronose with email/password sign-in and sign-up.
 * Microsoft SSO is behind a feature flag and hidden by default.
 */

// PUBLIC_INTERFACE
export default function Login() {
  const { user, signIn, signUp, featureFlags } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  if (user) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
    if (!email) return 'Please enter your email.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    if (mode === 'signup' && password.length < 6) {
      return 'Password must be at least 6 characters.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: signInErr } = await signIn(email, password);
        if (signInErr) throw signInErr;
        navigate('/', { replace: true });
      } else {
        const { error: signUpErr } = await signUp(email, password);
        if (signUpErr) throw signUpErr;
        setInfo('Sign-up successful. Please check your email for a confirmation link.');
        setMode('signin');
      }
    } catch (err) {
      setError(err?.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.card} aria-live="polite">
        <div style={styles.header}>
          <div style={styles.logoCircle}>C</div>
          <h1 style={styles.title}>Chronose</h1>
          <p style={styles.subtitle}>Sign {mode === 'signin' ? 'in' : 'up'} to continue</p>
        </div>

        {error && <div role="alert" style={styles.error}>{error}</div>}
        {info && <div role="status" style={styles.info}>{info}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </label>
          <label style={styles.label}>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'signup' ? 6 : undefined}
            />
          </label>
          <button type="submit" style={styles.primaryBtn} disabled={loading}>
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {featureFlags.enableMicrosoftSSO ? (
          <div style={styles.divider}>
            <span style={styles.dividerText}>or</span>
          </div>
        ) : null}

        {featureFlags.enableMicrosoftSSO ? (
          <button type="button" style={styles.secondaryBtn} disabled>
            Continue with Microsoft (disabled)
          </button>
        ) : null}

        <p style={styles.switchMode}>
          {mode === 'signin' ? (
            <>
              Don&apos;t have an account?{' '}
              <button onClick={() => setMode('signup')} style={styles.linkBtn} type="button">
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button onClick={() => setMode('signin')} style={styles.linkBtn} type="button">
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F4F6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    padding: 24,
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.06)',
  },
  header: {
    textAlign: 'center',
    marginBottom: 16,
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: '#374151',
    color: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    color: '#111827',
    fontSize: 24,
    lineHeight: '28px',
  },
  subtitle: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 14,
  },
  form: {
    display: 'grid',
    gap: 12,
    marginTop: 8,
  },
  label: {
    color: '#111827',
    fontWeight: 600,
    fontSize: 13,
    display: 'grid',
    gap: 6,
  },
  input: {
    height: 40,
    borderRadius: 8,
    border: '1px solid #E5E7EB',
    padding: '0 12px',
    fontSize: 14,
    outline: 'none',
    color: '#111827',
    background: '#FFFFFF',
  },
  primaryBtn: {
    marginTop: 8,
    height: 42,
    borderRadius: 8,
    border: '1px solid #374151',
    background: '#374151',
    color: '#FFFFFF',
    fontWeight: 600,
    cursor: 'pointer',
  },
  secondaryBtn: {
    marginTop: 8,
    height: 42,
    borderRadius: 8,
    border: '1px solid #D1D5DB',
    background: '#FFFFFF',
    color: '#111827',
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  dividerText: {
    background: '#FFFFFF',
    padding: '0 8px',
    color: '#9CA3AF',
    fontSize: 12,
  },
  error: {
    background: '#FEF2F2',
    color: '#B91C1C',
    border: '1px solid #FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  info: {
    background: '#ECFDF5',
    color: '#065F46',
    border: '1px solid #A7F3D0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    fontSize: 13,
  },
  switchMode: {
    marginTop: 14,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 14,
  },
  linkBtn: {
    color: '#374151',
    background: 'transparent',
    border: 'none',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
};
