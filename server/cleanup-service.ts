import { promises as fs } from 'fs';
import path from 'path';

export class CleanupService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'public/uploads');
  }

  // Clean up orphaned files that are no longer referenced in database
  async cleanupOrphanedFiles(): Promise<{ deleted: string[], errors: string[] }> {
    const deleted: string[] = [];
    const errors: string[] = [];

    try {
      const allFiles = await this.getAllUploadedFiles();
      

      for (const filePath of allFiles) {
        try {
          if (!(await this.isFileReferenced(filePath))) {
            await fs.unlink(filePath);
            deleted.push(path.basename(filePath));
            
          }
        } catch (error) {
          errors.push(`Failed to delete ${path.basename(filePath)}: ${(error as Error).message}`);
        }
      }

      return { deleted, errors };
    } catch (error) {
      console.error('Cleanup failed:', error);
      return { deleted, errors: [`Cleanup failed: ${(error as Error).message}`] };
    }
  }

  private async getAllUploadedFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const subdirs = ['teams', 'users', 'site', 'tournaments'];
      
      for (const subdir of subdirs) {
        const dirPath = path.join(this.uploadsDir, subdir);
        try {
          const dirFiles = await fs.readdir(dirPath);
          for (const file of dirFiles) {
            files.push(path.join(dirPath, file));
          }
        } catch {
          // Directory doesn't exist, skip
        }
      }
    } catch (error) {
      console.error('Error reading uploads directory:', error);
    }
    
    return files;
  }

  private async isFileReferenced(filePath: string): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const filename = path.basename(filePath);
      const relativePath = '/uploads/' + path.relative(this.uploadsDir, filePath).replace(/\\/g, '/');
      
      // Check if file is referenced in any database table
      const queries = [
        `SELECT COUNT(*) as count FROM users WHERE avatar LIKE '%${filename}%' OR avatar LIKE '%${relativePath}%'`,
        `SELECT COUNT(*) as count FROM teams WHERE logo LIKE '%${filename}%' OR logo LIKE '%${relativePath}%'`,
        `SELECT COUNT(*) as count FROM tournaments WHERE image LIKE '%${filename}%' OR image LIKE '%${relativePath}%'`,
        `SELECT COUNT(*) as count FROM site_settings WHERE value LIKE '%${filename}%' OR value LIKE '%${relativePath}%'`
      ];
      
      for (const query of queries) {
        const result = await db.execute(query) as any;
        if (result.rows && result.rows[0] && result.rows[0].count > 0) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking file reference:', error);
      // If we can't check, keep the file to be safe
      return true;
    }
  }

  // Clean up old backup files (keep only last 10)
  async cleanupOldBackups(backupDir: string, keepCount: number = 10): Promise<number> {
    try {
      const files = await fs.readdir(backupDir);
      const backupFiles = files
        .filter(file => file.endsWith('.json') || file.endsWith('.zip') || file.endsWith('.tar.gz'))
        .map(file => ({
          name: file,
          path: path.join(backupDir, file),
          stat: null as any
        }));

      // Get file stats for sorting by creation time
      for (const file of backupFiles) {
        try {
          file.stat = await fs.stat(file.path);
        } catch {
          // Skip files we can't stat
        }
      }

      // Sort by creation time (newest first) and remove old ones
      const sortedFiles = backupFiles
        .filter(f => f.stat)
        .sort((a, b) => b.stat.birthtimeMs - a.stat.birthtimeMs);

      const filesToDelete = sortedFiles.slice(keepCount);
      let deletedCount = 0;

      for (const file of filesToDelete) {
        try {
          await fs.unlink(file.path);
          deletedCount++;
          
        } catch (error) {
          console.error(`Failed to delete backup ${file.name}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Backup cleanup failed:', error);
      return 0;
    }
  }
}

export const cleanupService = new CleanupService();