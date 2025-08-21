import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Upload, Search, Filter, Eye, FileImage, Folder, HardDrive, Calendar, Download } from "lucide-react";

interface FileInfo {
  filename: string;
  path: string;
  size: number;
  lastModified: Date;
  type: 'image' | 'other';
  category: 'users' | 'teams' | 'tournaments' | 'other';
  isReferenced: boolean;
  referencedBy?: string[];
}

interface FileStats {
  totalFiles: number;
  totalSize: number;
  referencedFiles: number;
  orphanedFiles: number;
  categories: Record<string, number>;
}

export default function FileManager() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("other");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch files
  const { data: files = [], isLoading: filesLoading } = useQuery({
    queryKey: ["admin", "files"],
    queryFn: async () => {
      const response = await fetch("/api/admin/files", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch files");
      return response.json() as Promise<FileInfo[]>;
    },
  });

  // Fetch file statistics
  const { data: stats } = useQuery({
    queryKey: ["admin", "files", "stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/files/stats", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch file stats");
      return response.json() as Promise<FileStats>;
    },
  });

  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await fetch(`/api/admin/files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete file");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "files", "stats"] });
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload file mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, category }: { file: File; category: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const response = await fetch("/api/admin/files/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to upload file");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "files", "stats"] });
      setShowUploadDialog(false);
      toast({
        title: "Success",
        description: "File uploaded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cleanup orphaned files mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/files/cleanup", {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to cleanup files");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "files"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "files", "stats"] });
      toast({
        title: "Success",
        description: `Cleaned up ${data.deletedCount} orphaned files`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter files
  const filteredFiles = files.filter(file => {
    if (searchTerm && !file.filename.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (filterCategory !== "all" && file.category !== filterCategory) {
      return false;
    }
    if (filterType !== "all" && file.type !== filterType) {
      return false;
    }
    if (filterStatus === "referenced" && !file.isReferenced) {
      return false;
    }
    if (filterStatus === "orphaned" && file.isReferenced) {
      return false;
    }
    return true;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadFileMutation.mutate({ file, category: uploadCategory });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'users': return '👤';
      case 'teams': return '🏏';
      case 'tournaments': return '🏆';
      default: return '📁';
    }
  };

  const getTypeIcon = (type: string) => {
    return type === 'image' ? <FileImage className="h-4 w-4" /> : <Folder className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">File Manager</h1>
          <p className="text-muted-foreground">
            Manage uploaded files and media assets
          </p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload New File</DialogTitle>
                <DialogDescription>
                  Select a file to upload to the system
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select value={uploadCategory} onValueChange={setUploadCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="users">User Images</SelectItem>
                      <SelectItem value="teams">Team Images</SelectItem>
                      <SelectItem value="tournaments">Tournament Images</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">File</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploadFileMutation.isPending}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
                  Cancel
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            onClick={() => cleanupMutation.mutate()}
            disabled={cleanupMutation.isPending}
          >
            {cleanupMutation.isPending ? "Cleaning..." : "Cleanup Orphaned"}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                  <p className="text-2xl font-bold">{stats.totalFiles}</p>
                </div>
                <FileImage className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Size</p>
                  <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
                </div>
                <HardDrive className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Referenced</p>
                  <p className="text-2xl font-bold">{stats.referencedFiles}</p>
                </div>
                <Eye className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Orphaned</p>
                  <p className="text-2xl font-bold">{stats.orphanedFiles}</p>
                </div>
                <Trash2 className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="users">User Images</SelectItem>
                <SelectItem value="teams">Team Images</SelectItem>
                <SelectItem value="tournaments">Tournament Images</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="other">Other Files</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Files</SelectItem>
                <SelectItem value="referenced">Referenced</SelectItem>
                <SelectItem value="orphaned">Orphaned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Files Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Files ({filteredFiles.length})</CardTitle>
          <CardDescription>
            Manage your uploaded files and media assets
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading files...</div>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">No files found</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => (
                <Card key={file.filename} className="overflow-hidden">
                  <div className="aspect-square bg-gray-100 relative">
                    {file.type === 'image' ? (
                      <img
                        src={file.path}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/api/placeholder/200/200';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {getTypeIcon(file.type)}
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge variant={file.isReferenced ? "default" : "destructive"}>
                        {file.isReferenced ? "Used" : "Orphaned"}
                      </Badge>
                    </div>
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary">
                        {getCategoryIcon(file.category)} {file.category}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm truncate" title={file.filename}>
                        {file.filename}
                      </h4>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.lastModified)}</span>
                      </div>
                      {file.referencedBy && file.referencedBy.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          Used by: {file.referencedBy.join(", ")}
                        </div>
                      )}
                      <div className="flex space-x-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSelectedFile(file)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(file.path, '_blank')}
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete File</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{file.filename}"? 
                                {file.isReferenced && (
                                  <span className="text-red-600 font-medium">
                                    {" "}This file is currently being used and deleting it may break functionality.
                                  </span>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFileMutation.mutate(file.filename)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Detail Dialog */}
      {selectedFile && (
        <Dialog open={!!selectedFile} onOpenChange={() => setSelectedFile(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedFile.filename}</DialogTitle>
              <DialogDescription>
                File details and information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selectedFile.type === 'image' && (
                <div className="flex justify-center">
                  <img
                    src={selectedFile.path}
                    alt={selectedFile.filename}
                    className="max-w-full max-h-96 object-contain rounded-lg"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Filename:</strong> {selectedFile.filename}
                </div>
                <div>
                  <strong>Size:</strong> {formatFileSize(selectedFile.size)}
                </div>
                <div>
                  <strong>Category:</strong> {selectedFile.category}
                </div>
                <div>
                  <strong>Type:</strong> {selectedFile.type}
                </div>
                <div>
                  <strong>Last Modified:</strong> {formatDate(selectedFile.lastModified)}
                </div>
                <div>
                  <strong>Status:</strong>{" "}
                  <Badge variant={selectedFile.isReferenced ? "default" : "destructive"}>
                    {selectedFile.isReferenced ? "Referenced" : "Orphaned"}
                  </Badge>
                </div>
              </div>
              {selectedFile.referencedBy && selectedFile.referencedBy.length > 0 && (
                <div>
                  <strong>Referenced by:</strong>
                  <ul className="list-disc list-inside mt-1 text-sm text-muted-foreground">
                    {selectedFile.referencedBy.map((ref, index) => (
                      <li key={index}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedFile(null)}>
                Close
              </Button>
              <Button onClick={() => window.open(selectedFile.path, '_blank')}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}