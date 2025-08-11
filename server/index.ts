import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import cors from "cors";

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for development, can be configured properly for production
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased to 1000 requests per windowMs for better user experience
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Increased to 10 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

const applyRateLimiters = (req: Request, res: Response, next: NextFunction) => {
  // Skip rate limiting for static assets and non-API routes
  if (!req.path.startsWith('/api/')) {
    return next();
  }
  
  if (req.path === '/api/login' || req.path === '/api/register') {
    authLimiter(req, res, next);
  } else {
    generalLimiter(req, res, next);
  }
};

app.use(applyRateLimiters);

// Enhanced input validation middleware to prevent injection attacks
const validateUserInput = (req: Request, res: Response, next: NextFunction) => {
  // Check all string inputs for dangerous patterns
  const checkInput = (obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        // Block null bytes and control characters
        if (/[\x00-\x1f\x7f-\x9f]/.test(obj[key])) {
          return false;
        }
        // Block potential script tags
        if (/<script|javascript:/i.test(obj[key])) {
          return false;
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (!checkInput(obj[key])) {
          return false;
        }
      }
    }
    return true;
  };
  
  if (req.body && !checkInput(req.body)) {
    return res.status(400).json({ message: 'Invalid characters detected in input' });
  }
  
  if (req.params && !checkInput(req.params)) {
    return res.status(400).json({ message: 'Invalid characters detected in parameters' });
  }
  
  if (req.query && !checkInput(req.query)) {
    return res.status(400).json({ message: 'Invalid characters detected in query' });
  }
  
  next();
};

// URL parameter security middleware - handles encoded attacks like admin%%00
const validateURLParams = (req: Request, res: Response, next: NextFunction) => {
  // Check for URL encoded attacks in path parameters
  const originalUrl = req.originalUrl;
  
  // Debug log to see exactly what we're getting
  if (originalUrl.includes('%%')) {
    console.log('Suspicious URL detected:', originalUrl);
  }
  
  // Block double-encoded null bytes and dangerous patterns (including %% which becomes % after first decode)
  if (/%00|%%00|%25%00|%%/.test(originalUrl)) {
    return res.status(400).json({ message: 'Invalid characters detected in URL' });
  }
  
  // Block encoded SQL injection patterns
  if (/%27|%22|%3B|%2D%2D/.test(originalUrl)) {
    return res.status(400).json({ message: 'Invalid characters detected in URL' });
  }
  
  next();
};

app.use('/api/', validateURLParams);
app.use('/api/', validateUserInput);

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

// Body parsing middleware with size limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
