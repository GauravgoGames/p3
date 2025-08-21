#!/usr/bin/env tsx
/**
 * Production Optimization Script
 * Performs comprehensive checks and optimizations for production deployment
 */

import { promises as fs } from 'fs';
import path from 'path';

interface SecurityIssue {
  file: string;
  line: number;
  issue: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class ProductionOptimizer {
  private issues: SecurityIssue[] = [];
  
  async optimize() {
    console.log('🚀 Starting production optimization...\n');
    
    // Security checks
    await this.checkSecurityIssues();
    
    // Performance optimizations
    await this.optimizePerformance();
    
    // Code quality checks
    await this.checkCodeQuality();
    
    // Environment validation
    await this.validateEnvironment();
    
    // Generate report
    this.generateReport();
  }
  
  private async checkSecurityIssues() {
    console.log('🔒 Checking security issues...');
    
    // Check for hardcoded secrets
    await this.checkHardcodedSecrets();
    
    // Check for unsafe SQL queries
    await this.checkSQLSecurity();
    
    // Check for missing rate limiting
    await this.checkRateLimiting();
    
    // Check for proper authentication
    await this.checkAuthentication();
  }
  
  private async checkHardcodedSecrets() {
    const files = await this.getAllSourceFiles();
    const secretPatterns = [
      /password\s*[=:]\s*['"][^'"]{8,}['"]/gi,
      /secret\s*[=:]\s*['"][^'"]{16,}['"]/gi,
      /key\s*[=:]\s*['"][^'"]{16,}['"]/gi,
      /token\s*[=:]\s*['"][^'"]{16,}['"]/gi,
    ];
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        secretPatterns.forEach(pattern => {
          if (pattern.test(line)) {
            this.issues.push({
              file,
              line: index + 1,
              issue: 'Potential hardcoded secret detected',
              severity: 'critical'
            });
          }
        });
      });
    }
  }
  
  private async checkSQLSecurity() {
    const files = await this.getAllSourceFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for string concatenation in SQL queries
        if (line.includes('SELECT') || line.includes('INSERT') || line.includes('UPDATE') || line.includes('DELETE')) {
          if (line.includes('+') && line.includes('"') || line.includes("'")) {
            this.issues.push({
              file,
              line: index + 1,
              issue: 'Potential SQL injection vulnerability - use parameterized queries',
              severity: 'high'
            });
          }
        }
      });
    }
  }
  
  private async checkRateLimiting() {
    const routesFile = path.join(process.cwd(), 'server/routes.ts');
    const content = await fs.readFile(routesFile, 'utf8');
    
    if (!content.includes('rateLimit') && !content.includes('express-rate-limit')) {
      this.issues.push({
        file: routesFile,
        line: 1,
        issue: 'Missing rate limiting middleware',
        severity: 'medium'
      });
    }
  }
  
  private async checkAuthentication() {
    const routesFile = path.join(process.cwd(), 'server/routes.ts');
    const content = await fs.readFile(routesFile, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      if (line.includes('app.post') || line.includes('app.put') || line.includes('app.delete')) {
        if (!line.includes('isAuthenticated') && !line.includes('isAdmin')) {
          this.issues.push({
            file: routesFile,
            line: index + 1,
            issue: 'Endpoint may be missing authentication',
            severity: 'medium'
          });
        }
      }
    });
  }
  
  private async optimizePerformance() {
    console.log('⚡ Optimizing performance...');
    
    // Check for missing compression
    await this.checkCompression();
    
    // Check for missing caching headers
    await this.checkCaching();
    
    // Check for large dependencies
    await this.checkDependencies();
  }
  
  private async checkCompression() {
    const indexFile = path.join(process.cwd(), 'server/index.ts');
    const content = await fs.readFile(indexFile, 'utf8');
    
    if (!content.includes('compression')) {
      this.issues.push({
        file: indexFile,
        line: 1,
        issue: 'Missing compression middleware for better performance',
        severity: 'low'
      });
    }
  }
  
  private async checkCaching() {
    const routesFile = path.join(process.cwd(), 'server/routes.ts');
    const content = await fs.readFile(routesFile, 'utf8');
    
    if (!content.includes('Cache-Control')) {
      this.issues.push({
        file: routesFile,
        line: 1,
        issue: 'Missing caching headers for static assets',
        severity: 'low'
      });
    }
  }
  
  private async checkDependencies() {
    const packagePath = path.join(process.cwd(), 'package.json');
    const pkg = JSON.parse(await fs.readFile(packagePath, 'utf8'));
    
    const largeDeps = [
      'lodash', // Use individual lodash functions instead
      'moment', // Use date-fns instead
    ];
    
    Object.keys(pkg.dependencies || {}).forEach(dep => {
      if (largeDeps.includes(dep)) {
        this.issues.push({
          file: packagePath,
          line: 1,
          issue: `Large dependency detected: ${dep} - consider lighter alternatives`,
          severity: 'low'
        });
      }
    });
  }
  
  private async checkCodeQuality() {
    console.log('📋 Checking code quality...');
    
    // Check for unused imports
    await this.checkUnusedImports();
    
    // Check for TODO/FIXME comments
    await this.checkTodoComments();
    
    // Check for proper error handling
    await this.checkErrorHandling();
  }
  
  private async checkUnusedImports() {
    const files = await this.getAllSourceFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.startsWith('import') && line.includes('from')) {
          // Basic check for unused imports (simplified)
          const importMatch = line.match(/import\s+{([^}]+)}/);
          if (importMatch) {
            const imports = importMatch[1].split(',').map(imp => imp.trim());
            imports.forEach(imp => {
              if (!content.includes(imp.replace(/\s+as\s+\w+$/, ''))) {
                this.issues.push({
                  file,
                  line: index + 1,
                  issue: `Potentially unused import: ${imp}`,
                  severity: 'low'
                });
              }
            });
          }
        }
      });
    }
  }
  
  private async checkTodoComments() {
    const files = await this.getAllSourceFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK')) {
          this.issues.push({
            file,
            line: index + 1,
            issue: 'TODO/FIXME comment found - resolve before production',
            severity: 'medium'
          });
        }
      });
    }
  }
  
  private async checkErrorHandling() {
    const files = await this.getAllSourceFiles();
    
    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes('try {') || line.includes('catch')) {
          const nextLines = lines.slice(index, index + 10).join(' ');
          if (!nextLines.includes('catch') && line.includes('try {')) {
            this.issues.push({
              file,
              line: index + 1,
              issue: 'Try block without catch - add proper error handling',
              severity: 'medium'
            });
          }
        }
      });
    }
  }
  
  private async validateEnvironment() {
    console.log('🌍 Validating environment...');
    
    const requiredEnvVars = [
      'DATABASE_URL',
      'SESSION_SECRET',
      'NODE_ENV'
    ];
    
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        this.issues.push({
          file: '.env',
          line: 1,
          issue: `Missing required environment variable: ${envVar}`,
          severity: 'critical'
        });
      }
    });
    
    if (process.env.NODE_ENV !== 'production') {
      this.issues.push({
        file: '.env',
        line: 1,
        issue: 'NODE_ENV should be set to "production" for production deployment',
        severity: 'medium'
      });
    }
  }
  
  private async getAllSourceFiles(): Promise<string[]> {
    const files: string[] = [];
    
    const scanDir = async (dir: string) => {
      const items = await fs.readdir(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules' && item !== 'dist') {
          await scanDir(fullPath);
        } else if (stat.isFile() && (item.endsWith('.ts') || item.endsWith('.tsx'))) {
          files.push(fullPath);
        }
      }
    };
    
    await scanDir(process.cwd());
    return files;
  }
  
  private generateReport() {
    console.log('\n📊 Production Readiness Report');
    console.log('================================\n');
    
    const severityCounts = {
      critical: this.issues.filter(i => i.severity === 'critical').length,
      high: this.issues.filter(i => i.severity === 'high').length,
      medium: this.issues.filter(i => i.severity === 'medium').length,
      low: this.issues.filter(i => i.severity === 'low').length,
    };
    
    console.log(`🔴 Critical issues: ${severityCounts.critical}`);
    console.log(`🟠 High severity: ${severityCounts.high}`);
    console.log(`🟡 Medium severity: ${severityCounts.medium}`);
    console.log(`🟢 Low severity: ${severityCounts.low}\n`);
    
    if (this.issues.length === 0) {
      console.log('✅ No issues found! Your application is production-ready.\n');
    } else {
      console.log('Issues found:\n');
      
      this.issues.forEach(issue => {
        const emoji = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢'
        }[issue.severity];
        
        console.log(`${emoji} ${issue.file}:${issue.line} - ${issue.issue}`);
      });
    }
    
    console.log('\n🚀 Production deployment recommendations:');
    console.log('1. Set NODE_ENV=production');
    console.log('2. Use environment variables for all secrets');
    console.log('3. Enable SSL/HTTPS in production');
    console.log('4. Set up monitoring and logging');
    console.log('5. Configure backup strategy');
    console.log('6. Test with production-like data volume');
    console.log('7. Set up health checks');
    console.log('8. Configure error reporting');
  }
}

// Run the optimizer
if (import.meta.url === `file://${process.argv[1]}`) {
  new ProductionOptimizer().optimize().catch(console.error);
}