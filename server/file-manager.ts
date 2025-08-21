import { promises as fs } from 'fs';
import path from 'path';
import { db } from "./db";
import { users, teams, tournaments } from "@shared/schema";

export interface FileInfo {
  filename: string;
  path: string;
  size: number;
  lastModified: Date;
  type: 'image' | 'other';
  category: 'users' | 'teams' | 'tournaments' | 'other';
  isReferenced: boolean;
  referencedBy?: string[];
}

export interface FileStats {
  totalFiles: number;
  totalSize: number;
  referencedFiles: number;
  orphanedFiles: number;
  categories: Record<string, number>;
}

export class FileManagerService {
  private uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  async getAllFiles(): Promise<FileInfo[]> {
    const files: FileInfo[] = [];
    
    try {
      await this.scanDirectory(this.uploadsDir, files);
      
      // Check which files are referenced in the database
      const referencedFiles = await this.getReferencedFiles();
      
      // Update file information with reference status
      files.forEach(file => {
        const filename = path.basename(file.path);
        const fullPath = file.path;
        
        // Check both filename and full path matches
        if (referencedFiles.has(filename)) {
          file.isReferenced = true;
          file.referencedBy = referencedFiles.get(filename);
        } else if (referencedFiles.has(fullPath)) {
          file.isReferenced = true;
          file.referencedBy = referencedFiles.get(fullPath);
        } else {
          file.isReferenced = false;
        }
      });
      
      return files;
    } catch (error) {
      console.error('Error scanning files:', error);
      return [];
    }
  }

  private async scanDirectory(dirPath: string, files: FileInfo[], category: string = 'other'): Promise<void> {
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item.name);
        
        if (item.isDirectory()) {
          // Determine category based on directory name
          let subCategory = category;
          if (item.name === 'users') subCategory = 'users';
          else if (item.name === 'teams') subCategory = 'teams';
          else if (item.name === 'tournaments') subCategory = 'tournaments';
          
          await this.scanDirectory(fullPath, files, subCategory);
        } else {
          const stats = await fs.stat(fullPath);
          const relativePath = fullPath.replace(path.join(process.cwd(), 'public'), '');
          
          files.push({
            filename: item.name,
            path: relativePath,
            size: stats.size,
            lastModified: stats.mtime,
            type: this.getFileType(item.name),
            category: category as 'users' | 'teams' | 'tournaments' | 'other',
            isReferenced: false
          });
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }
  }

  private getFileType(filename: string): 'image' | 'other' {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const ext = path.extname(filename).toLowerCase();
    return imageExtensions.includes(ext) ? 'image' : 'other';
  }

  private async getReferencedFiles(): Promise<Map<string, string[]>> {
    const referencedFiles = new Map<string, string[]>();

    try {
      // Check user profile images
      const usersWithImages = await db.select().from(users);
      
      usersWithImages.forEach(user => {
        if (user.profileImage && user.profileImage.startsWith('/uploads/')) {
          const filename = path.basename(user.profileImage);
          const fullPath = user.profileImage;
          
          // Store both filename and full path references
          if (!referencedFiles.has(filename)) {
            referencedFiles.set(filename, []);
          }
          if (!referencedFiles.has(fullPath)) {
            referencedFiles.set(fullPath, []);
          }
          
          referencedFiles.get(filename)!.push(`User: ${user.username}`);
          referencedFiles.get(fullPath)!.push(`User: ${user.username}`);
        }
      });

      // Check team logos
      const teamsWithLogos = await db.select().from(teams);
      
      teamsWithLogos.forEach(team => {
        if (team.logoUrl && team.logoUrl.startsWith('/uploads/')) {
          const filename = path.basename(team.logoUrl);
          const fullPath = team.logoUrl;
          
          // Store both filename and full path references
          if (!referencedFiles.has(filename)) {
            referencedFiles.set(filename, []);
          }
          if (!referencedFiles.has(fullPath)) {
            referencedFiles.set(fullPath, []);
          }
          
          referencedFiles.get(filename)!.push(`Team: ${team.name}`);
          referencedFiles.get(fullPath)!.push(`Team: ${team.name}`);
        }
      });

      // Check tournament images
      const tournamentsWithImages = await db.select().from(tournaments);
      
      tournamentsWithImages.forEach(tournament => {
        if (tournament.imageUrl && tournament.imageUrl.startsWith('/uploads/')) {
          const filename = path.basename(tournament.imageUrl);
          const fullPath = tournament.imageUrl;
          
          // Store both filename and full path references
          if (!referencedFiles.has(filename)) {
            referencedFiles.set(filename, []);
          }
          if (!referencedFiles.has(fullPath)) {
            referencedFiles.set(fullPath, []);
          }
          
          referencedFiles.get(filename)!.push(`Tournament: ${tournament.name}`);
          referencedFiles.get(fullPath)!.push(`Tournament: ${tournament.name}`);
        }
      });

    } catch (error) {
      console.error('Error checking referenced files:', error);
    }

    return referencedFiles;
  }

  async getFileStats(): Promise<FileStats> {
    const files = await this.getAllFiles();
    
    const stats: FileStats = {
      totalFiles: files.length,
      totalSize: files.reduce((total, file) => total + file.size, 0),
      referencedFiles: files.filter(f => f.isReferenced).length,
      orphanedFiles: files.filter(f => !f.isReferenced).length,
      categories: {}
    };

    // Count files by category
    files.forEach(file => {
      stats.categories[file.category] = (stats.categories[file.category] || 0) + 1;
    });

    return stats;
  }

  async deleteFile(filename: string): Promise<boolean> {
    try {
      const files = await this.getAllFiles();
      const file = files.find(f => f.filename === filename);
      
      if (!file) {
        throw new Error('File not found');
      }

      const fullPath = path.join(process.cwd(), 'public', file.path);
      await fs.unlink(fullPath);
      
      return true;
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  async cleanupOrphanedFiles(): Promise<{ deletedCount: number; deletedFiles: string[] }> {
    const files = await this.getAllFiles();
    const orphanedFiles = files.filter(f => !f.isReferenced);
    
    const deletedFiles: string[] = [];
    
    for (const file of orphanedFiles) {
      try {
        const fullPath = path.join(process.cwd(), 'public', file.path);
        await fs.unlink(fullPath);
        deletedFiles.push(file.filename);
      } catch (error) {
        console.error(`Error deleting orphaned file ${file.filename}:`, error);
      }
    }

    return {
      deletedCount: deletedFiles.length,
      deletedFiles
    };
  }

  async saveUploadedFile(file: Express.Multer.File, category: string): Promise<string> {
    const categoryDir = path.join(this.uploadsDir, category);
    
    // Ensure category directory exists
    await fs.mkdir(categoryDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000000);
    const extension = path.extname(file.originalname);
    const filename = `${category}-${timestamp}-${randomNum}${extension}`;
    
    const filePath = path.join(categoryDir, filename);
    
    // Move file to destination
    await fs.writeFile(filePath, file.buffer);
    
    return `/uploads/${category}/${filename}`;
  }
}