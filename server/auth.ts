import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import bcrypt from 'bcryptjs';
import { storage } from "./storage";
import { User } from "@shared/schema";
import { validateRegister, validateLogin, validate } from "./validators";

declare global {
  namespace Express {
    // Define Express User interface to match our User type
    interface User {
      id: number;
      username: string;
      email: string | null;
      password: string;
      displayName: string | null;
      profileImage: string | null;
      role: 'user' | 'admin';
      points: number;
    }
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express): void {
  const sessionSecret = process.env.SESSION_SECRET || 'proace-predictions-secret-key';
  
  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for user: ${username}`);
        const user = await storage.getUserByUsername(username);
        console.log(`User found:`, user ? 'Yes' : 'No');
        
        if (!user) {
          console.log('User not found');
          return done(null, false);
        }
        
        const passwordMatch = await comparePasswords(password, user.password);
        console.log(`Password match:`, passwordMatch ? 'Yes' : 'No');
        
        if (!passwordMatch) {
          return done(null, false);
        } else {
          // @ts-ignore - Type issue with returned user format
          return done(null, user);
        }
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      if (!user) {
        // User doesn't exist anymore, clear the session
        return done(null, false);
      }
      done(null, user);
    } catch (error) {
      // Log error but don't crash - clear invalid session
      console.error('Session deserialization error:', error);
      done(null, false);
    }
  });

  app.post("/api/register", validateRegister, validate, async (req: any, res: any, next: any) => {
    try {
      const { username, password, email, displayName } = req.body;
      
      // Additional security validation beyond express-validator
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }
      
      // Strict username validation with security checks
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ message: "Username must be 3-20 characters and contain only letters, numbers, and underscores" });
      }
      
      // Prevent null bytes and control characters
      if (/[\x00-\x1f\x7f-\x9f]/.test(username) || /[\x00-\x1f\x7f-\x9f]/.test(password)) {
        return res.status(400).json({ message: "Invalid characters detected" });
      }
      
      // Prevent admin variations (security risk)
      if (username.toLowerCase().includes('admin') && username.toLowerCase() !== 'admin') {
        return res.status(400).json({ message: "Username cannot contain admin variations" });
      }
      
      // Validate password strength
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password and create user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        password: hashedPassword,
        email: email || null,
        displayName: displayName || null,
      });
      
      // Check if the request is coming from the admin panel
      const isAdminCreation = req.headers['x-admin-creation'] === 'true';
      
      if (isAdminCreation) {
        // For admin user creation, don't auto-login the created user
        return res.status(201).json(user);
      } else {
        // For regular registration, log in the user as before
        req.login(user, (err: any) => {
          if (err) return next(err);
          return res.status(201).json(user);
        });
      }
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Error creating user account" });
    }
  });

  app.post("/api/login", validateLogin, validate, passport.authenticate("local"), (req: any, res: any) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Forgot password - verify security code
  app.post("/api/forgot-password/verify", async (req, res) => {
    try {
      const { username, securityCode } = req.body;
      
      if (!username || !securityCode) {
        return res.status(400).json({ message: "Username and security code are required" });
      }
      
      // Validate username format to prevent injection
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ message: "Invalid username format" });
      }
      
      // Prevent null bytes and control characters
      if (/[\x00-\x1f\x7f-\x9f]/.test(username) || /[\x00-\x1f\x7f-\x9f]/.test(securityCode)) {
        return res.status(400).json({ message: "Invalid characters detected" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.securityCode) {
        return res.status(400).json({ message: "Security code not set for this user" });
      }
      
      if (user.securityCode !== securityCode.trim()) {
        return res.status(400).json({ message: "Invalid security code" });
      }
      
      res.json({ message: "Security code verified", userId: user.id });
    } catch (error) {
      console.error("Error verifying security code:", error);
      res.status(500).json({ message: "Error verifying security code" });
    }
  });

  // Forgot password - reset password
  app.post("/api/forgot-password/reset", async (req, res) => {
    try {
      const { username, securityCode, newPassword } = req.body;
      
      if (!username || !securityCode || !newPassword) {
        return res.status(400).json({ message: "Username, security code, and new password are required" });
      }
      
      // Validate username format to prevent injection
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ message: "Invalid username format" });
      }
      
      // Prevent null bytes and control characters
      if (/[\x00-\x1f\x7f-\x9f]/.test(username) || /[\x00-\x1f\x7f-\x9f]/.test(securityCode) || /[\x00-\x1f\x7f-\x9f]/.test(newPassword)) {
        return res.status(400).json({ message: "Invalid characters detected" });
      }
      
      // Enhanced password validation
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }
      
      if (newPassword.length > 200) {
        return res.status(400).json({ message: "Password too long" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.securityCode || user.securityCode !== securityCode.trim()) {
        return res.status(400).json({ message: "Invalid security code" });
      }
      
      // Update password
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Error resetting password" });
    }
  });
}
