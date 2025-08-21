# CricProAce - Sports Prediction Platform

## Overview

CricProAce is a comprehensive cricket prediction platform designed to manage tournaments, facilitate user predictions with leaderboards, and provide real-time support. It includes features for admin verification, user authentication, and a robust support ticket system. The project aims to provide an engaging experience for cricket enthusiasts, combining prediction mechanics with social features and robust tournament management.

## Recent Changes (August 2025)

✓ **PRODUCTION READY**: Complete codebase optimization and security hardening (August 21, 2025)
- Comprehensive security audit with all critical issues resolved
- Enhanced password requirements (12+ characters with complexity)
- Removed all hardcoded secrets and console.log statements
- Production-grade CSP headers and CORS configuration
- Advanced rate limiting with environment-based controls
- Cleaned up all unnecessary files and development artifacts
- Created comprehensive production deployment checklist

✓ **POLISHED & OPTIMIZED**: Backup & Restore system (August 21, 2025)
- Fixed duplicate backup creation - now creates only JSON format by default
- Fixed progress bar reaching 100% during restore operations
- Added smart file filtering - only backs up database-referenced files (reduced 30MB+ to smaller sizes)
- Implemented orphaned file cleanup system to remove unused uploads
- Added automatic old backup cleanup (keeps 10 most recent)
- Fixed "Dynamic require of fs" production build errors
- Added comprehensive cleanup management UI in admin panel

✓ **COMPLETELY REBUILT**: Backup & Restore system with JSON-based architecture (August 21, 2025)
- Eliminated ZIP dependency issues causing production build failures
- Implemented direct JSON backup format with database tables, uploads, and settings
- Fixed "ZIP signature not found" errors during restore operations
- Added proper base64 encoding for images and UTF-8 for text files
- Created structured backup format with metadata and comprehensive error handling

✓ **RESOLVED**: Tournament image upload functionality - Fixed backend date handling in Drizzle ORM
✓ **RESOLVED**: Team image upload and display issues - Forms now work correctly
✓ **COMPLETED**: WordPress integration with detailed implementation guide
✓ **ENHANCED**: User profile update forms with comprehensive logging and error handling
✓ **IMPLEMENTED**: Security features for iframe embedding with X-Frame-Options protection
✓ **OPTIMIZED**: Performance improvements and production server stability fixes

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: React Query (TanStack Query)
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite
- **UI/UX**: Comprehensive shadcn/ui components, custom CSS variables for theming, responsive design. Features include gradient animations in headers/footers, and percentage bar graphs for prediction results.
- **Features**: Tournament management, match predictions, user leaderboards, admin verification.

### Backend
- **Runtime**: Node.js 20 with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Custom passport-local strategy with bcrypt, session management via express sessions. Security features include rate limiting, account lockout, input validation, CSRF protection, security headers, password strength requirements, and file upload restrictions.
- **File Upload**: Multer
- **Real-time**: WebSocket support for live updates.
- **Data Flow**: React components make API calls to Express.js routes, which interact with the storage layer (Drizzle ORM for PostgreSQL) for data operations. Responses are JSON, with React Query managing client-side caching.

### Data Storage
- **Primary Database**: PostgreSQL (configured for Neon Database, but adaptable for local PostgreSQL).
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema**: `shared/schema.ts` for unified client/server types.
- **Migrations**: Drizzle Kit.

### Core System Features
- **Shared Schema**: User model and Zod validation schemas for type safety.
- **Storage Interface**: `IStorage` for CRUD operations, with `MemStorage` for development.
- **Security**: Comprehensive protection against DDoS, SQL injection (with parameterized queries), and fraud; robust input sanitization, URL decoding security, and strong authentication practices.
- **Deployment**: Designed as a full-stack monorepo with an automated build process for Replit and containerized environments.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL driver for Neon Database.
- **drizzle-orm**: TypeScript ORM.
- **@tanstack/react-query**: Server state management for React.
- **wouter**: Lightweight client-side routing.
- **@radix-ui/***: Primitive UI components.
- **tailwindcss**: Utility-first CSS framework.
- **class-variance-authority**: Component variant handling.
- **clsx**: Conditional className utility.
- **vite**: Build tool and development server.
- **tsx**: TypeScript execution for development.
- **esbuild**: Bundler for production server.
- **passport-local**: Authentication strategy.
- **bcrypt**: Password hashing.
- **multer**: File upload handling.
- **connect-pg-simple**: PostgreSQL session store.