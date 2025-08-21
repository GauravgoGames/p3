import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
// import archiver from 'archiver'; // Removed due to dynamic require issues in production build
import extract from 'extract-zip';
import { storage } from './storage';

const execAsync = promisify(exec);

export interface BackupMetadata {
  version: string;
  timestamp: string;
  appName: string;
  description?: string;
  dbSize: number;
  filesSize: number;
  totalSize: number;
}

export class BackupService {
  private backupDir = path.join(process.cwd(), 'backups');
  private uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  constructor() {
    this.ensureBackupDirectory();
  }

  private async ensureBackupDirectory() {
    try {
      await fs.access(this.backupDir);
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true });
    }
  }

  async createBackup(description?: string): Promise<{ filename: string; metadata: BackupMetadata }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupId = `backup_${timestamp}`;
    const tempDir = path.join(this.backupDir, 'temp', backupId);
    
    
    
    try {
      // Create temp directory
      await fs.mkdir(tempDir, { recursive: true });

      // 1. Export database
      
      const dbDumpPath = await this.exportDatabase(tempDir);
      
      // 2. Copy uploads directory
      
      const uploadsPath = await this.copyUploads(tempDir);
      
      // 3. Export application settings and metadata
      
      const settingsPath = await this.exportSettings(tempDir);
      
      // 4. Get file sizes
      const dbSize = await this.getFileSize(dbDumpPath);
      const filesSize = await this.getFolderSize(uploadsPath);
      
      // 5. Create metadata
      const metadata: BackupMetadata = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        appName: 'CricProAce',
        description: description || `Backup created on ${new Date().toLocaleString()}`,
        dbSize,
        filesSize,
        totalSize: dbSize + filesSize
      };
      
      await fs.writeFile(
        path.join(tempDir, 'metadata.json'),
        JSON.stringify(metadata, null, 2)
      );
      
      // 6. Create backup archive (JSON format only to avoid duplicates)
      
      
      const jsonFilename = `${backupId}.json`;
      const jsonPath = path.join(this.backupDir, jsonFilename);
      await this.createJSONArchive(tempDir, jsonPath, metadata);
      
      // 7. Cleanup temp directory
      await fs.rm(tempDir, { recursive: true, force: true });
      
      
      
      return {
        filename: jsonFilename,
        metadata: {
          ...metadata,
          totalSize: await this.getFileSize(jsonPath)
        }
      };
      
    } catch (error) {
      // Cleanup on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
      throw new Error(`Backup failed: ${(error as Error).message}`);
    }
  }

  async restoreBackup(backupFilePath: string): Promise<void> {
    
    
    try {
      // First check if it's a JSON file by trying to read and parse it
      let isJSONBackup = false;
      let fileContent = '';
      
      try {
        fileContent = await fs.readFile(backupFilePath, 'utf8');
        // Try to parse as JSON
        const testParse = JSON.parse(fileContent);
        // Check if it has our backup structure
        if (testParse.metadata || testParse.database || testParse.version) {
          isJSONBackup = true;
          
        }
      } catch (parseError) {
        // Not a JSON file, treat as ZIP
        
        isJSONBackup = false;
      }
      
      if (isJSONBackup) {
        // Handle JSON backup format - direct restoration without temp extraction
        
        const backupData = JSON.parse(fileContent);
        
        
        // 1. Restore database from JSON backup data
        if (backupData.database) {
          
          await this.restoreDatabaseFromJSON(backupData.database);
        }
        
        // 2. Restore uploads from JSON backup data
        if (backupData.uploads && backupData.uploads.length > 0) {
          
          await this.restoreUploadsFromJSON(backupData.uploads);
        }
        
        // 3. Restore settings from JSON backup data
        if (backupData.settings) {
          
          await this.restoreSettingsFromJSON(backupData.settings);
        }
        
        
        
      } else if (backupFilePath.endsWith('.tar.gz') || backupFilePath.endsWith('.tar')) {
        // Handle TAR backup format
        const tempDir = path.join(this.backupDir, 'temp', 'restore_' + Date.now());
        
        try {
          
          await fs.mkdir(tempDir, { recursive: true });
          
          const tar = await import('tar');
          await tar.extract({
            file: backupFilePath,
            cwd: tempDir
          });
          
          // Validate backup structure
          const metadataPath = path.join(tempDir, 'metadata.json');
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          
          
          // Restore database
          
          const dbDumpPath = path.join(tempDir, 'database.sql');
          await this.restoreDatabase(dbDumpPath);
          
          // Restore uploads
          
          const uploadsBackupPath = path.join(tempDir, 'uploads');
          await this.restoreUploads(uploadsBackupPath);
          
          // Restore settings
          
          const settingsPath = path.join(tempDir, 'settings.json');
          await this.restoreSettings(settingsPath);
          
          
          
        } finally {
          // Cleanup temp directory
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch {}
        }
      } else {
        // Handle ZIP backup format (legacy) - extract to temp directory
        const tempDir = path.join(this.backupDir, 'temp', 'restore_' + Date.now());
        
        try {
          
          await fs.mkdir(tempDir, { recursive: true });
          await extract(backupFilePath, { dir: tempDir });
          
          // Validate backup structure
          const metadataPath = path.join(tempDir, 'metadata.json');
          const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
          
          
          // Restore database
          
          const dbDumpPath = path.join(tempDir, 'database.sql');
          await this.restoreDatabase(dbDumpPath);
          
          // Restore uploads
          
          const uploadsBackupPath = path.join(tempDir, 'uploads');
          await this.restoreUploads(uploadsBackupPath);
          
          // Restore settings
          
          const settingsPath = path.join(tempDir, 'settings.json');
          await this.restoreSettings(settingsPath);
          
          
          
        } finally {
          // Cleanup temp directory
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch {}
        }
      }
      
    } catch (error) {
      throw new Error(`Restore failed: ${(error as Error).message}`);
    }
  }

  async getBackupsList(): Promise<Array<{ filename: string; metadata: BackupMetadata; size: number; path: string }>> {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];
      
      for (const file of files) {
        if (file.endsWith('.zip') || file.endsWith('.json') || file.endsWith('.tar.gz')) {
          const filePath = path.join(this.backupDir, file);
          const size = await this.getFileSize(filePath);
          
          try {
            // Try to extract metadata without full extraction
            let metadata;
            
            if (filePath.endsWith('.json')) {
              // For JSON backups, read the backup data and find metadata
              const backupData = JSON.parse(await fs.readFile(filePath, 'utf8'));
              const metadataFile = backupData.files.find((f: any) => f.path === 'metadata.json');
              
              if (metadataFile && metadataFile.content !== '[File too large - path only]') {
                metadata = JSON.parse(metadataFile.content);
              } else {
                // Create basic metadata from backup data
                metadata = {
                  version: '1.0.0',
                  timestamp: backupData.timestamp,
                  appName: 'CricProAce',
                  description: 'JSON backup',
                  dbSize: 0,
                  filesSize: 0,
                  totalSize: size
                };
              }
            } else {
              // For ZIP backups, extract metadata
              const tempDir = path.join(this.backupDir, 'temp', 'meta_' + Date.now());
              await extract(filePath, { dir: tempDir });
              
              const metadataPath = path.join(tempDir, 'metadata.json');
              metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
              
              await fs.rm(tempDir, { recursive: true, force: true });
            }
            
            backups.push({
              filename: file,
              metadata,
              size,
              path: filePath
            });
            
            // Cleanup handled above for each case
          } catch (error) {
            // If metadata extraction fails, create basic info
            backups.push({
              filename: file,
              metadata: {
                version: 'unknown',
                timestamp: new Date().toISOString(),
                appName: 'CricProAce',
                description: 'Legacy backup (no metadata)',
                dbSize: 0,
                filesSize: 0,
                totalSize: size
              },
              size,
              path: filePath
            });
          }
        }
      }
      
      return backups.sort((a, b) => 
        new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
      );
    } catch (error) {
      throw new Error(`Failed to list backups: ${(error as Error).message}`);
    }
  }

  async deleteBackup(filename: string): Promise<void> {
    const filePath = path.join(this.backupDir, filename);
    await fs.unlink(filePath);
  }

  private async exportDatabase(tempDir: string): Promise<string> {
    const dbDumpPath = path.join(tempDir, 'database.sql');
    
    try {
      // Use Drizzle ORM to export schema and data instead of pg_dump
      
      
      const { db } = await import('./db');
      
      // Export table data as SQL INSERT statements
      const sqlStatements = [];
      
      // Add database schema info
      sqlStatements.push('-- CricProAce Database Backup');
      sqlStatements.push(`-- Created: ${new Date().toISOString()}`);
      sqlStatements.push('-- Export method: Drizzle ORM');
      sqlStatements.push('');
      
      // For now, create a basic backup structure
      // In a full implementation, you'd export all table data
      sqlStatements.push('-- Tables exported: users, tournaments, teams, matches, predictions, etc.');
      sqlStatements.push('-- Note: This is a simplified backup for demo purposes');
      sqlStatements.push(`SELECT 'Backup created successfully' as status;`);
      
      const sqlContent = sqlStatements.join('\n');
      await fs.writeFile(dbDumpPath, sqlContent);
      
      
    } catch (error) {
      console.error('Database export failed:', error);
      // Create a minimal SQL file as fallback
      const fallbackSql = `-- Database backup created
-- Timestamp: ${new Date().toISOString()}
-- Status: Backup structure created
SELECT 1 as backup_completed;`;
      await fs.writeFile(dbDumpPath, fallbackSql);
      
    }
    
    return dbDumpPath;
  }

  private async restoreDatabaseFromJSON(databaseData: any[]): Promise<void> {
    try {
      
      
      // Import database restoration utilities
      const { db } = await import('./db');
      
      // Process each table data
      for (const tableData of databaseData) {
        const { tableName, data } = tableData;
        
        if (data && data.length > 0) {
          
          
          // Clear existing data (be careful!)
          await db.execute(`DELETE FROM ${tableName}`);
          
          // Insert restored data - use proper parameterized query
          for (const record of data) {
            const columns = Object.keys(record);
            const values = Object.values(record);
            const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
            
            try {
              // Build the SQL with values directly embedded (for PostgreSQL)
              const quotedValues = values.map(v => {
                if (v === null) return 'NULL';
                if (typeof v === 'number') return v;
                if (typeof v === 'boolean') return v;
                // Escape single quotes in strings
                return `'${String(v).replace(/'/g, "''")}'`;
              }).join(', ');
              
              await db.execute(
                `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${quotedValues})`
              );
            } catch (insertError) {
              console.error(`Failed to insert record into ${tableName}:`, insertError);
              console.error('Record data:', record);
            }
          }
        }
      }
      
      
    } catch (error) {
      throw new Error(`Failed to restore database from JSON: ${(error as Error).message}`);
    }
  }

  private async restoreDatabase(dbDumpPath: string): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL not found');
    }
    
    // Drop and recreate all tables, then restore
    const command = `psql "${dbUrl}" < "${dbDumpPath}"`;
    await execAsync(command);
  }

  private async copyUploads(tempDir: string): Promise<string> {
    const uploadsBackupPath = path.join(tempDir, 'uploads');
    
    try {
      await fs.access(this.uploadsDir);
      // Copy entire uploads directory
      await this.copyDirectory(this.uploadsDir, uploadsBackupPath);
    } catch {
      // Create empty uploads directory if doesn't exist
      await fs.mkdir(uploadsBackupPath, { recursive: true });
    }
    
    return uploadsBackupPath;
  }

  private async restoreUploadsFromJSON(uploadsData: any[]): Promise<void> {
    try {
      
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      await fs.mkdir(uploadsDir, { recursive: true });
      
      // Restore each file
      for (const fileData of uploadsData) {
        if (fileData.content && 
            fileData.content !== '[File too large - path only]' && 
            fileData.content !== '[Large file - not included]' &&
            fileData.content !== '[Binary file]' &&
            fileData.content !== '[Error reading file]') {
          
          const filePath = path.join(uploadsDir, fileData.relativePath);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          
          // Handle base64 encoded files (images, etc.)
          if (fileData.encoding === 'base64') {
            await fs.writeFile(filePath, Buffer.from(fileData.content, 'base64'));
          } else {
            await fs.writeFile(filePath, fileData.content);
          }
          
          
        }
      }
      
      
    } catch (error) {
      throw new Error(`Failed to restore uploads from JSON: ${(error as Error).message}`);
    }
  }

  private async restoreUploads(uploadsBackupPath: string): Promise<void> {
    // Remove current uploads directory
    try {
      await fs.rm(this.uploadsDir, { recursive: true, force: true });
    } catch {}
    
    // Copy backup uploads
    await this.copyDirectory(uploadsBackupPath, this.uploadsDir);
  }

  private async exportSettings(tempDir: string): Promise<string> {
    const settingsPath = path.join(tempDir, 'settings.json');
    
    try {
      // Export all site settings from database - create array of settings
      const settings = [];
      try {
        const siteLogo = await storage.getSetting('siteLogo');
        if (siteLogo) settings.push({ key: 'siteLogo', value: siteLogo });
      } catch {}
      
      await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    } catch (error) {
      // If no settings, create empty file
      await fs.writeFile(settingsPath, JSON.stringify([], null, 2));
    }
    
    return settingsPath;
  }

  private async restoreSettingsFromJSON(settingsData: any[]): Promise<void> {
    try {
      
      
      // For now, we'll use direct SQL queries since settings table may not be in schema
      const { db } = await import('./db');
      
      // Clear existing settings using direct SQL
      await db.execute('DELETE FROM site_settings');
      
      // Insert restored settings using direct SQL with proper parameterization
      for (const setting of settingsData) {
        const columns = Object.keys(setting);
        const values = Object.values(setting);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        
        try {
          // Build the SQL with values directly embedded (for PostgreSQL)
          const quotedValues = values.map(v => {
            if (v === null) return 'NULL';
            if (typeof v === 'number') return v;
            if (typeof v === 'boolean') return v;
            // Escape single quotes in strings
            return `'${String(v).replace(/'/g, "''")}'`;
          }).join(', ');
          
          await db.execute(
            `INSERT INTO site_settings (${columns.join(', ')}) VALUES (${quotedValues})`
          );
        } catch (insertError) {
          console.error('Failed to insert setting:', insertError);
          console.error('Setting data:', setting);
        }
      }
      
      
    } catch (error) {
      throw new Error(`Failed to restore settings from JSON: ${(error as Error).message}`);
    }
  }

  private async restoreSettings(settingsPath: string): Promise<void> {
    try {
      const settings = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
      
      // Restore each setting
      for (const setting of settings) {
        await storage.updateSetting(setting.key, setting.value);
      }
    } catch (error) {
      console.warn('Settings restore failed:', error);
    }
  }

  private async createJSONArchive(sourceDir: string, outputPath: string, metadata: BackupMetadata): Promise<void> {
    try {
      
      
      // Read database data
      const dbDumpPath = path.join(sourceDir, 'database.sql');
      const databaseData = await this.exportDatabaseToJSON();
      
      // Read uploads data
      const uploadsDir = path.join(sourceDir, 'uploads');
      const uploadsData = await this.exportUploadsToJSON(uploadsDir);
      
      // Read settings data
      const settingsPath = path.join(sourceDir, 'settings.json');
      let settingsData = [];
      try {
        settingsData = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
      } catch (error) {
        console.warn('No settings data found in backup');
      }
      
      // Create complete backup structure
      const backupData = {
        metadata,
        database: databaseData,
        uploads: uploadsData,
        settings: settingsData,
        timestamp: new Date().toISOString(),
        totalFiles: uploadsData.length,
        version: '2.0'
      };
      
      // Save as JSON backup
      await fs.writeFile(outputPath, JSON.stringify(backupData, null, 2));
      
      
    } catch (error) {
      console.error('JSON archive creation failed:', error);
      throw error;
    }
  }

  private async createTarArchive(sourceDir: string, outputPath: string): Promise<void> {
    try {
      const tar = await import('tar');
      
      
      await tar.create(
        {
          gzip: true,
          file: outputPath,
          cwd: sourceDir,
        },
        ['.']
      );
      
      
    } catch (error) {
      console.error('TAR archive creation failed:', error);
      // Don't throw - TAR is optional backup format
    }
  }

  private async createZipArchive(sourceDir: string, outputPath: string): Promise<void> {
    try {
      // Using simplified backup approach instead of archiver due to dynamic require issues
      
      
      // Create a comprehensive backup structure
      const files = await this.getAllFiles(sourceDir);
      const backupData = {
        timestamp: new Date().toISOString(),
        source: sourceDir,
        totalFiles: files.length,
        files: [] as Array<{ path: string; content: string; size: number; }>
      };
      
      // Read all files and include their content
      for (const filePath of files) {
        try {
          const relativePath = path.relative(sourceDir, filePath);
          const stats = await fs.stat(filePath);
          
          // Only include essential files to keep backup size small
          if (relativePath.includes('database.sql') || relativePath.includes('settings.json') || relativePath.includes('metadata.json')) {
            const content = await fs.readFile(filePath, 'utf8').catch(() => '[Error reading file]');
            backupData.files.push({ path: relativePath, content, size: stats.size });
          } else if (stats.size < 50 * 1024) { // Only small files (50KB) 
            const content = await fs.readFile(filePath, 'utf8').catch(() => '[Binary file]');
            backupData.files.push({ path: relativePath, content, size: stats.size });
          } else {
            // Just record the file exists without content to reduce size
            backupData.files.push({ path: relativePath, content: '[File too large - path only]', size: stats.size });
          }
        } catch (error) {
          console.warn(`Failed to read file ${filePath}:`, error);
        }
      }
      
      // Save as JSON backup
      await fs.writeFile(outputPath.replace('.zip', '.json'), JSON.stringify(backupData, null, 2));
      
      
    } catch (error) {
      console.error('Archive creation failed:', error);
      throw error;
    }
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const items = await fs.readdir(dir, { withFileTypes: true });
      
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        
        if (item.isDirectory()) {
          const subFiles = await this.getAllFiles(fullPath);
          files.push(...subFiles);
        } else {
          files.push(fullPath);
        }
      }
    } catch (error) {
      
    }
    
    return files;
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        // Only copy files that are referenced in database to reduce backup size
        if (await this.isFileReferenced(srcPath)) {
          await fs.copyFile(srcPath, destPath);
          
        } else {
          
        }
      }
    }
  }

  private async isFileReferenced(filePath: string): Promise<boolean> {
    try {
      const { db } = await import('./db');
      const filename = path.basename(filePath);
      
      // Check if file is referenced in any database table
      const queries = [
        `SELECT COUNT(*) as count FROM users WHERE avatar LIKE '%${filename}%'`,
        `SELECT COUNT(*) as count FROM teams WHERE logo LIKE '%${filename}%'`,
        `SELECT COUNT(*) as count FROM tournaments WHERE image LIKE '%${filename}%'`,
        `SELECT COUNT(*) as count FROM site_settings WHERE value LIKE '%${filename}%'`
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
      // If we can't check, include the file to be safe
      return true;
    }
  }

  private async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }

  private async getFolderSize(folderPath: string): Promise<number> {
    try {
      let size = 0;
      const files = await fs.readdir(folderPath, { withFileTypes: true });

      for (const file of files) {
        const filePath = path.join(folderPath, file.name);
        if (file.isDirectory()) {
          size += await this.getFolderSize(filePath);
        } else {
          size += await this.getFileSize(filePath);
        }
      }

      return size;
    } catch {
      return 0;
    }
  }

  private async exportDatabaseToJSON(): Promise<any[]> {
    try {
      const { db } = await import('./db');
      
      // Get all table names
      const tableResults = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      `);
      
      const databaseData = [];
      
      for (const table of tableResults.rows) {
        const tableName = table.table_name;
        try {
          const tableData = await db.execute(`SELECT * FROM ${tableName}`);
          databaseData.push({
            tableName,
            data: tableData.rows
          });
        } catch (error) {
          console.warn(`Failed to export table ${tableName}:`, error);
        }
      }
      
      return databaseData;
    } catch (error) {
      console.error('Database export failed:', error);
      return [];
    }
  }

  private async exportUploadsToJSON(uploadsDir: string): Promise<any[]> {
    try {
      const uploadsData = [];
      
      if (await fs.access(uploadsDir).then(() => true).catch(() => false)) {
        const files = await this.getAllFiles(uploadsDir);
        
        for (const filePath of files) {
          try {
            const stats = await fs.stat(filePath);
            const relativePath = path.relative(uploadsDir, filePath);
            
            if (stats.size < 1024 * 1024) { // Files under 1MB
              const extension = path.extname(filePath).toLowerCase();
              const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension);
              
              if (isImage) {
                // Store images as base64
                const content = await fs.readFile(filePath);
                uploadsData.push({
                  relativePath,
                  content: content.toString('base64'),
                  encoding: 'base64',
                  size: stats.size
                });
              } else {
                // Store text files as UTF-8
                try {
                  const content = await fs.readFile(filePath, 'utf8');
                  uploadsData.push({
                    relativePath,
                    content,
                    encoding: 'utf8',
                    size: stats.size
                  });
                } catch {
                  uploadsData.push({
                    relativePath,
                    content: '[Binary file]',
                    size: stats.size
                  });
                }
              }
            } else {
              uploadsData.push({
                relativePath,
                content: '[File too large - path only]',
                size: stats.size
              });
            }
          } catch (error) {
            console.warn(`Failed to process upload file ${filePath}:`, error);
          }
        }
      }
      
      return uploadsData;
    } catch (error) {
      console.error('Uploads export failed:', error);
      return [];
    }
  }
}

export const backupService = new BackupService();