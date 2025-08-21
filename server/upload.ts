import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Express, Request } from 'express';

// Ensure upload directories exist
const createUploadDirectories = () => {
  const dirs = [
    path.join(process.cwd(), 'public'),
    path.join(process.cwd(), 'public/uploads'),
    path.join(process.cwd(), 'public/uploads/teams'),
    path.join(process.cwd(), 'public/uploads/users'),
    path.join(process.cwd(), 'public/uploads/site'),
    path.join(process.cwd(), 'public/uploads/tournaments')
  ];

  for (const dir of dirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
        
      }
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
    }
  }
};

// Ensure directories exist on startup
createUploadDirectories();

// Configure storage for team logos
const teamLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'public/uploads/teams'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'team-' + uniqueSuffix + ext);
  }
});

// Configure storage for user profile images
const userProfileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'public/uploads/users'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'user-' + uniqueSuffix + ext);
  }
});

// Configure storage for site logo
const siteLogoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Ensure directory exists
    const uploadDir = path.join(process.cwd(), 'public/uploads/site');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate random filename with timestamp to avoid caching issues
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'site-logo-' + uniqueSuffix + ext);
  }
});

// Configure storage for tournament images
const tournamentImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'public/uploads/tournaments'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'tournament-' + uniqueSuffix + ext);
  }
});

// File filter for images
const imageFileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG images are allowed.'));
  }
};

// Create upload instances
export const uploadTeamLogo = multer({ 
  storage: teamLogoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export const uploadUserProfile = multer({ 
  storage: userProfileStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export const uploadSiteLogo = multer({ 
  storage: siteLogoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

export const uploadTournamentImage = multer({ 
  storage: tournamentImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Helper function to get public URL from file path
export const getPublicUrl = (filePath: string): string => {
  try {
    const publicDir = process.cwd() + '/public';
    
    if (!filePath.includes(publicDir)) {
      return '/uploads/default.png';
    }
    
    const relativePath = filePath.replace(publicDir, '');
    return relativePath.startsWith('/') ? relativePath : '/' + relativePath;
  } catch (error) {
    return '/uploads/default.png';
  }
};