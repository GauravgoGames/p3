import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Download, Upload, Trash2, Database, FolderOpen, Settings, AlertTriangle, Clock, HardDrive } from 'lucide-react';

interface BackupItem {
  filename: string;
  metadata: {
    version: string;
    timestamp: string;
    appName: string;
    description: string;
    dbSize: number;
    filesSize: number;
    totalSize: number;
  };
  size: number;
  path: string;
}

export default function BackupRestore() {
  const [backupDescription, setBackupDescription] = useState('');
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch backups list
  const { data: backups = [], isLoading: isLoadingBackups } = useQuery<BackupItem[]>({
    queryKey: ['/api/admin/backups'],
    queryFn: async () => {
      const res = await fetch('/api/admin/backups', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch backups');
      return res.json();
    }
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: async (description: string) => {
      
      
      const response = await fetch('/api/admin/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description }),
      });

      

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Backup creation error:', errorData);
        throw new Error(errorData.message || 'Failed to create backup');
      }

      const result = await response.json();
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
      toast({
        title: "Success",
        description: "Backup created successfully!",
      });
      setBackupDescription('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create backup: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: async (file: File) => {
      
      setUploadProgress(10);
      
      const formData = new FormData();
      formData.append('backup', file);

      setUploadProgress(20);
      
      const response = await fetch('/api/admin/backups/restore', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      setUploadProgress(90);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore backup');
      }

      await response.json();
      setUploadProgress(100);
      // Add a delay to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 500));
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
      toast({
        title: "Success",
        description: "Backup restored successfully! Please refresh the page.",
      });
      setRestoreFile(null);
      setUploadProgress(0);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to restore backup: ${(error as Error).message}`,
        variant: "destructive",
      });
      setUploadProgress(0);
    },
  });

  // Delete backup mutation
  const deleteBackupMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await fetch(`/api/admin/backups/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete backup');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
      toast({
        title: "Success",
        description: "Backup deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete backup: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Cleanup files mutation
  const cleanupFilesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/cleanup/files', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cleanup files');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Cleaned up ${data.deletedCount} orphaned files`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to cleanup files: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  // Cleanup backups mutation
  const cleanupBackupsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/cleanup/backups', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keep: 10 }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cleanup backups');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/backups'] });
      toast({
        title: "Success",
        description: `Cleaned up ${data.deletedCount} old backup files`,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to cleanup backups: ${(error as Error).message}`,
        variant: "destructive",
      });
    },
  });

  const handleDownloadBackup = async (filename: string) => {
    try {
      const response = await fetch(`/api/admin/backups/download/${encodeURIComponent(filename)}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to download backup');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to download backup: ${(error as Error).message}`,
        variant: "destructive",
      });
    }
  };

  const handleRestoreSubmit = () => {
    if (!restoreFile) return;
    
    setUploadProgress(10);
    restoreBackupMutation.mutate(restoreFile);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const isLoading = createBackupMutation.isPending || restoreBackupMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-neutral-800 flex items-center">
          <Database className="h-8 w-8 mr-3 text-primary" />
          Backup & Restore
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Create Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Create Backup
            </CardTitle>
            <CardDescription>
              Create a complete backup of your website including database, uploads, and settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                placeholder="Describe this backup..."
                value={backupDescription}
                onChange={(e) => setBackupDescription(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">Backup includes:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className="flex items-center">
                  <Database className="h-4 w-4 mr-2" />
                  Complete database export
                </li>
                <li className="flex items-center">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  All uploaded files (images, documents)
                </li>
                <li className="flex items-center">
                  <Settings className="h-4 w-4 mr-2" />
                  Site settings and configuration
                </li>
              </ul>
            </div>

            <Button 
              onClick={() => {
                if (!createBackupMutation.isPending) {
                  createBackupMutation.mutate(backupDescription);
                }
              }}
              disabled={isLoading}
              className="w-full"
            >
              {createBackupMutation.isPending ? 'Creating Backup...' : 'Create Backup'}
            </Button>
          </CardContent>
        </Card>

        {/* Restore Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Restore Backup
            </CardTitle>
            <CardDescription>
              Upload and restore from a previous backup file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Select Backup File</label>
              <Input
                type="file"
                accept=".zip,.json,.tar,.tar.gz"
                onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                disabled={isLoading}
              />
            </div>

            {restoreBackupMutation.isPending && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-sm text-gray-600">Restoring backup...</p>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Warning</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Restoring will replace all current data. A safety backup will be created automatically.
                  </p>
                </div>
              </div>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  disabled={!restoreFile || isLoading}
                  className="w-full"
                >
                  {restoreBackupMutation.isPending ? 'Restoring...' : 'Restore Backup'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Restore</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will replace all current data with the backup. A safety backup will be created first. 
                    This action cannot be undone. Are you sure you want to continue?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRestoreSubmit}>
                    Yes, Restore Backup
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>

      {/* Backups List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <HardDrive className="h-5 w-5 mr-2" />
            Available Backups
          </CardTitle>
          <CardDescription>
            Manage your website backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBackups ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No backups found. Create your first backup above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.filename} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-medium">{backup.filename}</h3>
                        <Badge variant="secondary">v{backup.metadata.version}</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {backup.metadata.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(backup.metadata.timestamp)}
                        </div>
                        <div className="flex items-center">
                          <HardDrive className="h-3 w-3 mr-1" />
                          {formatFileSize(backup.size)}
                        </div>
                        <div className="flex items-center">
                          <Database className="h-3 w-3 mr-1" />
                          DB: {formatFileSize(backup.metadata.dbSize)}
                        </div>
                        <div className="flex items-center">
                          <FolderOpen className="h-3 w-3 mr-1" />
                          Files: {formatFileSize(backup.metadata.filesSize)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadBackup(backup.filename)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{backup.filename}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => deleteBackupMutation.mutate(backup.filename)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Section */}
      <Card>
        <CardHeader>
          <CardTitle>System Cleanup</CardTitle>
          <CardDescription>
            Clean up orphaned files and old backups to reduce storage usage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => cleanupFilesMutation.mutate()}
              disabled={cleanupFilesMutation.isPending}
              variant="outline"
            >
              {cleanupFilesMutation.isPending ? "Cleaning..." : "Clean Orphaned Files"}
            </Button>
            
            <Button
              onClick={() => cleanupBackupsMutation.mutate()}
              disabled={cleanupBackupsMutation.isPending}
              variant="outline"
            >
              {cleanupBackupsMutation.isPending ? "Cleaning..." : "Clean Old Backups"}
            </Button>
          </div>
          
          <div className="text-sm text-muted-foreground">
            <p>• <strong>Clean Orphaned Files:</strong> Removes uploaded files no longer referenced in database</p>
            <p>• <strong>Clean Old Backups:</strong> Keeps only the 10 most recent backup files</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}