/// Utility for REACT_APP_* env fallback in client code
// Use this so your app works with or without .env present. Set defaults for missing values here.

export const getEnv = (key, fallback) => {
  // Tries import.meta.env[key], then fallback value if undefined
  return import.meta.env[key] ?? fallback;
};

/**
 * Returns all relevant Chronose env values (with sensible defaults).
 */
export const chronoseEnv = {
  API_BASE: getEnv('REACT_APP_API_BASE', 'http://localhost:8000'),
  BACKEND_URL: getEnv('REACT_APP_BACKEND_URL', 'http://localhost:8000'),
  FRONTEND_URL: getEnv('REACT_APP_FRONTEND_URL', 'http://localhost:3000'),
  WS_URL: getEnv('REACT_APP_WS_URL', 'ws://localhost:8000'),
  NODE_ENV: getEnv('REACT_APP_NODE_ENV', 'development'),
  NEXT_TELEMETRY_DISABLED: getEnv('REACT_APP_NEXT_TELEMETRY_DISABLED', '1'),
  ENABLE_SOURCE_MAPS: getEnv('REACT_APP_ENABLE_SOURCE_MAPS', 'false'),
  PORT: getEnv('REACT_APP_PORT', '3000'),
  TRUST_PROXY: getEnv('REACT_APP_TRUST_PROXY', 'true'),
  LOG_LEVEL: getEnv('REACT_APP_LOG_LEVEL', 'info'),
  HEALTHCHECK_PATH: getEnv('REACT_APP_HEALTHCHECK_PATH', '/healthz'),
  FEATURE_FLAGS: getEnv('REACT_APP_FEATURE_FLAGS', ''),
  EXPERIMENTS_ENABLED: getEnv('REACT_APP_EXPERIMENTS_ENABLED', ''),
  SUPABASE_URL: getEnv('REACT_APP_SUPABASE_URL', ''),
  SUPABASE_KEY: getEnv('REACT_APP_SUPABASE_KEY', ''),
};
