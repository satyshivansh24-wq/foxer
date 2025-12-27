import { supabase } from '@/integrations/supabase/client';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Image, Video, File, FolderOpen, Sun, Moon, LogOut, Grid, List, Trash2, Download, X, Folder, ChevronRight, Home, Edit2, FolderPlus, Filter, Calendar, HardDrive, FileType, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useFiles, FileRecord } from '@/hooks/useFiles';
import { useFolders, FolderRecord } from '@/hooks/useFolders';
import { StorageUsage } from '@/components/StorageUsage';
import { RenameDialog } from '@/components/RenameDialog';
import { CreateFolderDialog } from '@/components/CreateFolderDialog';
import foxerLogo from '@/assets/foxer-logo.png';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DashboardProps {
  onLogout: () => void;
}

interface SearchFilters {
  dateFrom: string;
  dateTo: string;
  sizeMin: string;
  sizeMax: string;
  type: string;
}

export function Dashboard({ onLogout }: DashboardProps) {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { signOut } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
    // ⛔ WAIT until role is fetched
  if (roleLoading) {
    return null;
  }

  const { files, loading: filesLoading, uploadFile, deleteFile, getFileUrl, getCategoryCounts, getFilesInFolder, getTotalStorageUsed, getStorageLimit, canUploadFile, renameFile, moveFile } = useFiles();
  const { folders, loading: foldersLoading, createFolder, renameFolder, deleteFolder, moveFolder, getFoldersInFolder } = useFolders();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'file' | 'folder'; item: FileRecord | FolderRecord } | null>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; file: FileRecord } | null>(null);
  const [renameItem, setRenameItem] = useState<{ type: 'file' | 'folder'; item: FileRecord | FolderRecord } | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    dateFrom: '',
    dateTo: '',
    sizeMin: '',
    sizeMax: '',
    type: 'all',
  });
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loading = filesLoading || foldersLoading;
  const counts = getCategoryCounts();

  const categories = [
    { id: 'documents', name: 'Documents', icon: FileText, count: counts.documents, color: 'bg-accent' },
    { id: 'pdfs', name: 'PDFs', icon: File, count: counts.pdfs, color: 'bg-accent' },
    { id: 'photos', name: 'Photos', icon: Image, count: counts.photos, color: 'bg-accent' },
    { id: 'videos', name: 'Videos', icon: Video, count: counts.videos, color: 'bg-accent' },
    { id: 'others', name: 'Other Files', icon: FolderOpen, count: counts.others, color: 'bg-accent' },
  ];

  const filteredCategories = categories.filter(cat =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply advanced filters to files
  const applyFilters = (fileList: FileRecord[]): FileRecord[] => {
    return fileList.filter(file => {
      // Text search
      if (searchQuery && !file.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      // Date from filter
      if (filters.dateFrom) {
        const fileDate = parseISO(file.created_at);
        if (isBefore(fileDate, parseISO(filters.dateFrom))) return false;
      }
      // Date to filter
      if (filters.dateTo) {
        const fileDate = parseISO(file.created_at);
        if (isAfter(fileDate, parseISO(filters.dateTo + 'T23:59:59'))) return false;
      }
      // Size min filter (in MB)
      if (filters.sizeMin) {
        const minBytes = parseFloat(filters.sizeMin) * 1024 * 1024;
        if (file.size < minBytes) return false;
      }
      // Size max filter (in MB)
      if (filters.sizeMax) {
        const maxBytes = parseFloat(filters.sizeMax) * 1024 * 1024;
        if (file.size > maxBytes) return false;
      }
      // Type filter
      if (filters.type !== 'all' && file.category !== filters.type) {
        return false;
      }
      return true;
    });
  };

  // Get folders in current folder
  const currentFolders = getFoldersInFolder(currentFolderId).filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get files - either by category or by current folder, with filters applied
  const currentFiles = selectedCategory 
    ? applyFilters(files.filter(f => f.category === selectedCategory))
    : applyFilters(getFilesInFolder(currentFolderId));

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'file' | 'folder', id: string) => {
    e.dataTransfer.setData('dragType', type);
    e.dataTransfer.setData('dragId', id);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = () => {
    setDragOverFolderId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string | null) => {
    e.preventDefault();
    setDragOverFolderId(null);
    
    const dragType = e.dataTransfer.getData('dragType');
    const dragId = e.dataTransfer.getData('dragId');
    
    if (!dragType || !dragId) return;
    
    if (dragType === 'file') {
      await moveFile(dragId, targetFolderId);
    } else if (dragType === 'folder') {
      await moveFolder(dragId, targetFolderId);
    }
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      sizeMin: '',
      sizeMax: '',
      type: 'all',
    });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.dateFrom || filters.dateTo || filters.sizeMin || filters.sizeMax || filters.type !== 'all';

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const totalSize = Array.from(selectedFiles).reduce((sum, f) => sum + f.size, 0);
    if (!canUploadFile(totalSize)) {
      toast.error('Storage limit reached! Maximum 10GB allowed.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    for (let i = 0; i < selectedFiles.length; i++) {
      await uploadFile(selectedFiles[i], currentFolderId);
    }
    setUploading(false);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenFile = async (file: FileRecord) => {
    const url = await getFileUrl(file.storage_path);
    if (url) {
      setPreviewFile({ url, file });
    }
  };

  const handleDownload = async (file: FileRecord) => {
    const url = await getFileUrl(file.storage_path);
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirm) {
      if (deleteConfirm.type === 'file') {
        const file = deleteConfirm.item as FileRecord;
        await deleteFile(file.id, file.storage_path);
      } else {
        const folder = deleteConfirm.item as FolderRecord;
        await deleteFolder(folder.id);
      }
      setDeleteConfirm(null);
    }
  };

  const handleRename = async (newName: string) => {
    if (renameItem) {
      if (renameItem.type === 'file') {
        await renameFile(renameItem.item.id, newName);
      } else {
        await renameFolder(renameItem.item.id, newName);
      }
      setRenameItem(null);
    }
  };

  const handleCreateFolder = async (name: string) => {
    await createFolder(name, currentFolderId);
  };

  const navigateToFolder = (folder: FolderRecord) => {
    setSelectedCategory(null);
    setCurrentFolderId(folder.id);
    setFolderPath([...folderPath, folder]);
  };

  const navigateBack = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setCurrentFolderId(newPath[newPath.length - 1]?.id || null);
      setFolderPath(newPath);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (category: string) => {
    switch (category) {
      case 'photos': return Image;
      case 'videos': return Video;
      case 'pdfs': return File;
      case 'documents': return FileText;
      default: return FolderOpen;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8">
              <img 
                src={foxerLogo} 
                alt="Foxer" 
                className="w-full h-full object-contain dark:invert"
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Foxer</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[140px]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => navigate('/admin')}
                className="p-2 rounded-lg hover:bg-accent transition-colors text-primary"
                title="Admin Panel"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
         <button
  onClick={async () => {
    const ok = window.confirm("Are you sure you want to logout from Foxer?");
    if (!ok) return;

    await supabase.auth.signOut();
    window.location.reload();
  }}
  className="p-2 rounded-lg hover:bg-accent transition-colors"
>
  <LogOut className="w-5 h-5" />
</button>


          </div>
        </div>

        {/* Search with Advanced Filters */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search files and folders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant={showFilters || hasActiveFilters ? "default" : "outline"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
              className="shrink-0"
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="p-4 rounded-xl bg-card border border-border space-y-4 animate-fade-in">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Advanced Filters</h3>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Date Range */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> From Date
                  </label>
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> To Date
                  </label>
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                
                {/* Size Range */}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <HardDrive className="w-3 h-3" /> Min Size (MB)
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.sizeMin}
                    onChange={(e) => setFilters(f => ({ ...f, sizeMin: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground flex items-center gap-1">
                    <HardDrive className="w-3 h-3" /> Max Size (MB)
                  </label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={filters.sizeMax}
                    onChange={(e) => setFilters(f => ({ ...f, sizeMax: e.target.value }))}
                    className="text-sm"
                  />
                </div>
              </div>
              
              {/* File Type */}
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileType className="w-3 h-3" /> File Type
                </label>
                <Select value={filters.type} onValueChange={(v) => setFilters(f => ({ ...f, type: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="documents">Documents</SelectItem>
                    <SelectItem value="pdfs">PDFs</SelectItem>
                    <SelectItem value="photos">Photos</SelectItem>
                    <SelectItem value="videos">Videos</SelectItem>
                    <SelectItem value="others">Other Files</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {/* Storage Usage */}
        <div className="mb-6">
          <StorageUsage usedBytes={getTotalStorageUsed()} limitBytes={getStorageLimit()} />
        </div>

        {/* Breadcrumb Navigation */}
        {(currentFolderId || selectedCategory) && (
          <div className="flex items-center gap-1 mb-4 text-sm overflow-x-auto">
            <button
              onClick={() => {
                setCurrentFolderId(null);
                setFolderPath([]);
                setSelectedCategory(null);
              }}
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-accent transition-colors"
            >
              <Home className="w-4 h-4" />
              <span>Home</span>
            </button>
            {selectedCategory && (
              <>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <span className="px-2 py-1 text-muted-foreground capitalize">{selectedCategory}</span>
              </>
            )}
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                <button
                  onClick={() => navigateBack(index)}
                  className="px-2 py-1 rounded hover:bg-accent transition-colors truncate max-w-[100px]"
                >
                  {folder.name}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Show categories only at root level */}
        {!currentFolderId && !selectedCategory && (
          <>
            {/* Section Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Categories</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-accent' : 'hover:bg-accent'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-accent' : 'hover:bg-accent'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Categories Grid/List */}
            <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 gap-4' : 'space-y-3'}`}>
              {filteredCategories.map((category, index) => (
                <CategoryCard 
                  key={category.id} 
                  category={category} 
                  viewMode={viewMode}
                  index={index}
                  onClick={() => setSelectedCategory(category.id)}
                  isSelected={false}
                />
              ))}
            </div>
          </>
        )}

        {/* Folders & Files */}
        <div className={currentFolderId || selectedCategory ? '' : 'mt-8'}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              {selectedCategory 
                ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
                : currentFolderId 
                  ? folderPath[folderPath.length - 1]?.name 
                  : 'My Files'}
            </h2>
            {!selectedCategory && (
              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accent hover:bg-accent/80 transition-colors text-sm"
              >
                <FolderPlus className="w-4 h-4" />
                New Folder
              </button>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (currentFolders.length === 0 && currentFiles.length === 0) ? (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent flex items-center justify-center">
                <FolderOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                {selectedCategory ? 'No files in this category' : 'This folder is empty'}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedCategory ? 'Upload files to see them here' : 'Upload files or create a folder'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Drop zone for moving to parent/root */}
              {currentFolderId && (
                <div
                  onDragOver={(e) => handleDragOver(e, folderPath.length > 1 ? folderPath[folderPath.length - 2]?.id : null)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folderPath.length > 1 ? folderPath[folderPath.length - 2]?.id : null)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed transition-colors mb-2 ${
                    dragOverFolderId === (folderPath.length > 1 ? folderPath[folderPath.length - 2]?.id : null) 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border'
                  }`}
                >
                  <ChevronRight className="w-4 h-4 rotate-180 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Drop here to move to parent folder</span>
                </div>
              )}
              
              {/* Folders first */}
              {!selectedCategory && currentFolders.map((folder) => (
                <FolderItem
                  key={folder.id}
                  folder={folder}
                  onOpen={() => navigateToFolder(folder)}
                  onRename={() => setRenameItem({ type: 'folder', item: folder })}
                  onDelete={() => setDeleteConfirm({ type: 'folder', item: folder })}
                  onDragStart={(e) => handleDragStart(e, 'folder', folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  isDragOver={dragOverFolderId === folder.id}
                />
              ))}
              {/* Then files */}
              {currentFiles.map((file) => (
                <FileItem 
                  key={file.id} 
                  file={file} 
                  getFileIcon={getFileIcon}
                  formatFileSize={formatFileSize}
                  onOpen={() => handleOpenFile(file)}
                  onDownload={() => handleDownload(file)}
                  onRename={() => setRenameItem({ type: 'file', item: file })}
                  onDelete={() => setDeleteConfirm({ type: 'file', item: file })}
                  onDragStart={(e) => handleDragStart(e, 'file', file.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
        accept="image/*,video/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
      />

      {/* FAB */}
      <Button
        variant="fab"
        className="fixed bottom-6 right-6 shadow-lg"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <div className="w-6 h-6 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <Plus className="w-6 h-6" />
        )}
      </Button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.type === 'folder' ? 'Folder' : 'File'}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.item.name}"? 
              {deleteConfirm?.type === 'folder' && ' All files inside will also be deleted.'}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setPreviewFile(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full bg-card rounded-xl border border-border overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-medium truncate">{previewFile.file.name}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => handleDownload(previewFile.file)} className="p-2 rounded-lg hover:bg-accent">
                  <Download className="w-5 h-5" />
                </button>
                <button onClick={() => setPreviewFile(null)} className="p-2 rounded-lg hover:bg-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-[calc(90vh-80px)] overflow-auto flex items-center justify-center">
              {previewFile.file.category === 'photos' ? (
                <img src={previewFile.url} alt={previewFile.file.name} className="max-w-full max-h-[70vh] object-contain" />
              ) : previewFile.file.category === 'videos' ? (
                <video src={previewFile.url} controls className="max-w-full max-h-[70vh]" />
              ) : previewFile.file.category === 'pdfs' ? (
                <iframe src={previewFile.url} className="w-full h-[70vh]" title={previewFile.file.name} />
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Preview not available for this file type</p>
                  <Button onClick={() => handleDownload(previewFile.file)}>
                    <Download className="w-4 h-4 mr-2" /> Download File
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rename Dialog */}
      {renameItem && (
        <RenameDialog
          open={!!renameItem}
          onOpenChange={() => setRenameItem(null)}
          currentName={renameItem.item.name}
          onRename={handleRename}
          type={renameItem.type}
        />
      )}

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={showCreateFolder}
        onOpenChange={setShowCreateFolder}
        onCreate={handleCreateFolder}
      />
    </div>
  );
}

function CategoryCard({ 
  category, 
  viewMode, 
  index,
  onClick,
  isSelected,
}: { 
  category: { id: string; name: string; icon: React.ComponentType<{ className?: string }>; count: number; color: string };
  viewMode: 'grid' | 'list';
  index: number;
  onClick: () => void;
  isSelected: boolean;
}) {
  const Icon = category.icon;
  
  if (viewMode === 'list') {
    return (
      <button 
        onClick={onClick}
        className={`w-full flex items-center gap-4 p-4 rounded-xl bg-card border transition-all duration-200 animate-fade-in-up opacity-0 ${isSelected ? 'border-primary' : 'border-border hover:bg-accent'}`}
        style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
      >
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1 text-left">
          <p className="font-medium">{category.name}</p>
          <p className="text-sm text-muted-foreground">{category.count} files</p>
        </div>
      </button>
    );
  }

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-6 rounded-2xl bg-card border transition-all duration-200 aspect-square animate-fade-in-up opacity-0 ${isSelected ? 'border-primary' : 'border-border hover:bg-accent'}`}
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
    >
      <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-3">
        <Icon className="w-7 h-7" />
      </div>
      <p className="font-medium text-sm">{category.name}</p>
      <p className="text-xs text-muted-foreground mt-1">{category.count} files</p>
    </button>
  );
}

function FolderItem({
  folder,
  onOpen,
  onRename,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
}: {
  folder: FolderRecord;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  isDragOver: boolean;
}) {
  return (
    <div 
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex items-center gap-4 p-4 rounded-xl bg-card border-2 cursor-pointer hover:bg-accent/50 transition-colors ${
        isDragOver ? 'border-primary bg-primary/10' : 'border-border'
      }`}
      onClick={onOpen}
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Folder className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{folder.name}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(folder.created_at), 'MMM d, yyyy')}
        </p>
      </div>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onRename}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Edit2 className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
    </div>
  );
}

function FileItem({ 
  file, 
  getFileIcon,
  formatFileSize,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onDragStart,
}: { 
  file: FileRecord;
  getFileIcon: (category: string) => React.ComponentType<{ className?: string }>;
  formatFileSize: (bytes: number) => string;
  onOpen: () => void;
  onDownload: () => void;
  onRename: () => void;
  onDelete: () => void;
  onDragStart: (e: React.DragEvent) => void;
}) {
  const Icon = getFileIcon(file.category);
  
  return (
    <div 
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onOpen}
    >
      <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{file.name}</p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.size)} • {format(new Date(file.created_at), 'MMM d, yyyy')}
        </p>
      </div>
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <button 
          onClick={onRename}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Edit2 className="w-4 h-4 text-muted-foreground" />
        </button>
        <button 
          onClick={onDownload}
          className="p-2 rounded-lg hover:bg-accent transition-colors"
        >
          <Download className="w-4 h-4 text-muted-foreground" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
        >
          <Trash2 className="w-4 h-4 text-destructive" />
        </button>
      </div>
    </div>
  );
}
