import { CorsOptions } from 'cors';

/**
 * CORS Configuration
 * Development: Permissive (allows localhost and Codespaces)
 * Production: Strict whitelist only
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

// Development origins - permissive for easy development
const developmentOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
];

// Production origins - strict whitelist
// IMPORTANT: Update these with your actual production URLs
const productionOrigins = [
  process.env.FRONTEND_URL,
  // Add your production domains here:
  // 'https://yourdomain.com',
  // 'https://app.yourdomain.com',
  // 'https://www.yourdomain.com',
].filter(Boolean) as string[];

// Add Codespaces URLs dynamically (for development)
if (isDevelopment && process.env.CODESPACE_NAME) {
  developmentOrigins.push(`https://${process.env.CODESPACE_NAME}-3000.app.github.dev`);
  developmentOrigins.push(`https://${process.env.CODESPACE_NAME}-5173.app.github.dev`);
  developmentOrigins.push(`https://${process.env.CODESPACE_NAME}-5174.app.github.dev`);
  developmentOrigins.push(`https://${process.env.CODESPACE_NAME}-4173.app.github.dev`);
}

/**
 * CORS options based on environment
 */
export const corsOptions: CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, curl) in development
    if (!origin && isDevelopment) {
      return callback(null, true);
    }

    // In production, require origin header
    if (!origin && !isDevelopment) {
      return callback(new Error('Origin header required'));
    }

    const origin_str = origin || '';

    // Development mode - permissive
    if (isDevelopment) {
      // Check against development whitelist
      if (developmentOrigins.some(allowed => origin_str.startsWith(allowed))) {
        return callback(null, true);
      }

      // Allow any localhost in development
      if (origin_str.includes('localhost') || origin_str.includes('127.0.0.1')) {
        return callback(null, true);
      }

      // Allow Codespaces URLs
      if (origin_str.includes('.app.github.dev')) {
        return callback(null, true);
      }

      console.warn(`⚠️  CORS blocked (dev): ${origin_str}`);
      return callback(new Error(`Origin ${origin_str} not allowed by CORS`));
    }

    // Production mode - strict whitelist only
    if (productionOrigins.includes(origin_str)) {
      return callback(null, true);
    }

    console.warn(`⚠️  CORS blocked (prod): ${origin_str}`);
    return callback(new Error(`Origin ${origin_str} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400, // 24 hours - cache preflight requests
  optionsSuccessStatus: 200
};

// Log CORS configuration on startup
if (isDevelopment) {
  console.log('✅ CORS: Development mode - permissive policy');
  console.log('   Allowed:', developmentOrigins.slice(0, 5).join(', '), '...');
} else {
  console.log('✅ CORS: Production mode - strict whitelist');
  console.log('   Allowed origins:', productionOrigins.length);
}
