const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'Data', 'rate_limit_config.json');

const defaultConfig = {
  enabled: true,
  windowMinutes: 15,
  maxRequests: 150,
  loginWindowMinutes: 5,
  loginMaxRequests: 10,
  whitelistedIps: ['127.0.0.1', '::1', '::ffff:127.0.0.1'],
  message: 'Limite de requêtes dépassée. Veuillez patienter avant de renouveler votre requête.',
  specialAdminSendEmailDefault: false
};

let currentConfig = { ...defaultConfig };

// Load config from disk if available
try {
  if (fs.existsSync(configPath)) {
    const raw = fs.readFileSync(configPath, 'utf8');
    if (raw && raw.trim().length > 0) {
      currentConfig = { ...defaultConfig, ...JSON.parse(raw) };
    }
  } else {
    // Ensure Data dir exists and write default config
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
  }
} catch (e) {
  console.error('[RateLimiter] Error loading config, using defaults:', e.message);
  currentConfig = { ...defaultConfig };
}

// In-memory sliding stores
// ip -> { count: number, startTime: number, lastRequest: number }
const generalStore = new Map();
// ip -> { count: number, startTime: number, lastRequest: number }
const loginStore = new Map();

// Global metrics
let totalBlockedRequests = 0;

// Periodic cleanup of stale records every 60 seconds (unref'd to prevent keeping process alive)
const cleanupInterval = setInterval(() => {
  const now = Date.now();

  const generalExpiry = (currentConfig.windowMinutes || 15) * 60 * 1000;
  for (const [ip, data] of generalStore.entries()) {
    if (now - data.startTime > generalExpiry) {
      generalStore.delete(ip);
    }
  }

  const loginExpiry = (currentConfig.loginWindowMinutes || 5) * 60 * 1000;
  for (const [ip, data] of loginStore.entries()) {
    if (now - data.startTime > loginExpiry) {
      loginStore.delete(ip);
    }
  }
}, 60000);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}

/**
 * Normalizes client IP address from request headers or socket.
 */
function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }
  return req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || '127.0.0.1';
}

/**
 * Checks if the IP is in the whitelist.
 */
function isWhitelisted(ip) {
  if (!currentConfig.whitelistedIps || !Array.isArray(currentConfig.whitelistedIps)) {
    return false;
  }
  return currentConfig.whitelistedIps.some(w => {
    if (!w) return false;
    const cleanW = w.trim();
    return cleanW === ip || cleanW === '*' || (cleanW.startsWith('::ffff:') && cleanW.replace('::ffff:', '') === ip) || `::ffff:${cleanW}` === ip;
  });
}

/**
 * Express middleware for clean rate limiting.
 */
function apiLimiter(req, res, next) {
  // If rate limiting is disabled or request is CORS preflight (OPTIONS), pass through immediately
  if (!currentConfig.enabled || req.method === 'OPTIONS') {
    return next();
  }

  // Bypass static files or health checks
  const url = req.originalUrl || req.url || '';
  if (url === '/pdf.worker.min.mjs' || url.startsWith('/favicon.ico')) {
    return next();
  }

  const clientIp = getClientIp(req);

  // Whitelisted IPs bypass limits
  if (isWhitelisted(clientIp)) {
    return next();
  }

  const now = Date.now();
  const isAuthLogin = url.includes('/api/authentifications/login');

  if (isAuthLogin) {
    // Dedicated strict limiter for login routes
    const windowMs = (currentConfig.loginWindowMinutes || 5) * 60 * 1000;
    const max = currentConfig.loginMaxRequests || 10;

    let record = loginStore.get(clientIp);
    if (!record || now - record.startTime > windowMs) {
      record = { count: 1, startTime: now, lastRequest: now };
      loginStore.set(clientIp, record);
    } else {
      record.count += 1;
      record.lastRequest = now;
    }

    const resetSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
    const remaining = Math.max(0, max - record.count);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil((record.startTime + windowMs) / 1000));

    if (record.count > max) {
      totalBlockedRequests += 1;
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: currentConfig.message || 'Trop de tentatives de connexion. Veuillez patienter avant de réessayer.',
        retryAfter: resetSeconds,
        type: 'auth_rate_limit'
      });
    }

    return next();
  }

  // General API rate limiter
  const windowMs = (currentConfig.windowMinutes || 15) * 60 * 1000;
  const max = currentConfig.maxRequests || 150;

  let record = generalStore.get(clientIp);
  if (!record || now - record.startTime > windowMs) {
    record = { count: 1, startTime: now, lastRequest: now };
    generalStore.set(clientIp, record);
  } else {
    record.count += 1;
    record.lastRequest = now;
  }

  const resetSeconds = Math.ceil((record.startTime + windowMs - now) / 1000);
  const remaining = Math.max(0, max - record.count);

  res.setHeader('X-RateLimit-Limit', max);
  res.setHeader('X-RateLimit-Remaining', remaining);
  res.setHeader('X-RateLimit-Reset', Math.ceil((record.startTime + windowMs) / 1000));

  if (record.count > max) {
    totalBlockedRequests += 1;
    res.setHeader('Retry-After', resetSeconds);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: currentConfig.message || 'Limite de requêtes atteinte. Veuillez patienter avant de réessayer.',
      retryAfter: resetSeconds,
      type: 'general_rate_limit'
    });
  }

  next();
}

/**
 * Returns current configuration.
 */
function getConfig() {
  return { ...currentConfig };
}

/**
 * Updates configuration, persists to disk, and updates memory.
 */
function updateConfig(newConfig) {
  if (!newConfig || typeof newConfig !== 'object') {
    throw new Error('Invalid configuration object');
  }

  const updated = {
    ...currentConfig,
    enabled: typeof newConfig.enabled === 'boolean' ? newConfig.enabled : currentConfig.enabled,
    windowMinutes: Number(newConfig.windowMinutes) > 0 ? Number(newConfig.windowMinutes) : currentConfig.windowMinutes,
    maxRequests: Number(newConfig.maxRequests) > 0 ? Number(newConfig.maxRequests) : currentConfig.maxRequests,
    loginWindowMinutes: Number(newConfig.loginWindowMinutes) > 0 ? Number(newConfig.loginWindowMinutes) : currentConfig.loginWindowMinutes,
    loginMaxRequests: Number(newConfig.loginMaxRequests) > 0 ? Number(newConfig.loginMaxRequests) : currentConfig.loginMaxRequests,
    whitelistedIps: Array.isArray(newConfig.whitelistedIps)
      ? newConfig.whitelistedIps.map(ip => String(ip).trim()).filter(Boolean)
      : (typeof newConfig.whitelistedIps === 'string'
          ? newConfig.whitelistedIps.split(',').map(s => s.trim()).filter(Boolean)
          : currentConfig.whitelistedIps),
    message: typeof newConfig.message === 'string' && newConfig.message.trim().length > 0 ? newConfig.message.trim() : currentConfig.message,
    specialAdminSendEmailDefault: typeof newConfig.specialAdminSendEmailDefault === 'boolean'
      ? newConfig.specialAdminSendEmailDefault
      : currentConfig.specialAdminSendEmailDefault
  };

  currentConfig = updated;

  try {
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 2), 'utf8');
  } catch (err) {
    console.error('[RateLimiter] Error persisting configuration to disk:', err);
  }

  return { ...currentConfig };
}

/**
 * Resets tracked requests in memory.
 */
function resetStats() {
  generalStore.clear();
  loginStore.clear();
  totalBlockedRequests = 0;
  return { success: true, message: 'Compteurs de limitation de débit réinitialisés avec succès.' };
}

/**
 * Returns runtime statistics.
 */
function getStats() {
  return {
    enabled: currentConfig.enabled,
    totalBlockedRequests,
    activeTrackedGeneralIps: generalStore.size,
    activeTrackedLoginIps: loginStore.size,
    windowMinutes: currentConfig.windowMinutes,
    maxRequests: currentConfig.maxRequests,
    loginWindowMinutes: currentConfig.loginWindowMinutes,
    loginMaxRequests: currentConfig.loginMaxRequests,
    whitelistedIps: currentConfig.whitelistedIps,
    specialAdminSendEmailDefault: currentConfig.specialAdminSendEmailDefault
  };
}

module.exports = {
  apiLimiter,
  getConfig,
  updateConfig,
  resetStats,
  getStats,
  getClientIp
};

