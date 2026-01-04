import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';


export interface FileRecord {
  id: string;
  user_id: string;
  name: string;
  size: number;
  type: string;
  category: string;
  storage_path: string;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
}


const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB per file

// Allowlist of safe file extensions
const ALLOWED_EXTENSIONS = new Set([
  // Documents
  'pdf', 'doc', 'docx', 'txt', 'rtf', 'odt', 'xls', 'xlsx', 'ppt', 'pptx', 'csv',
  // Images
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico',
  // Videos
  'mp4', 'webm', 'mov', 'avi', 'mkv',
  // Audio
  'mp3', 'wav', 'ogg', 'flac', 'm4a',
  // Archives
  'zip', 'rar', '7z', 'tar', 'gz',
  // Other safe types
  'json', 'xml', 'html', 'css', 'js', 'ts', 'md'
]);

// Sanitize filename to prevent path traversal and injection attacks
const sanitizeFilename = (filename: string): string => {
  // Remove path components and null bytes
  let sanitized = filename.replace(/[\\/\0]/g, '');
  // Remove leading/trailing dots and spaces
  sanitized = sanitized.replace(/^[\s.]+|[\s.]+$/g, '');
  // Replace multiple dots with single dot
  sanitized = sanitized.replace(/\.{2,}/g, '.');
  // Only allow alphanumeric, dots, hyphens, underscores, and spaces
  sanitized = sanitized.replace(/[^a-zA-Z0-9.\-_ ]/g, '_');
  // Ensure filename isn't empty
  return sanitized || 'unnamed_file';
};

// Validate file extension against allowlist
const isValidFileExtension = (filename: string): boolean => {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? ALLOWED_EXTENSIONS.has(ext) : false;
};

export function useFiles() {
  const { user } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    if (!user) {
      setFiles([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles((data || []) as FileRecord[]);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [user]);

  const getCategoryFromType = (mimeType: string): string => {
    if (mimeType.startsWith('image/')) return 'photos';
    if (mimeType.startsWith('video/')) return 'videos';
    if (mimeType === 'application/pdf') return 'pdfs';
    if (mimeType.includes('document') || mimeType.includes('word') || mimeType.includes('text')) return 'documents';
    return 'others';
  };

  const uploadFile = async (file: File, folderId: string | null = null) => {
    if (!user) {
      toast.error('Please sign in to upload files');
      return null;
    }

    // Validate individual file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File too large. Maximum size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
      return null;
    }

    // Validate total storage limit
    if (!canUploadFile(file.size)) {
      toast.error('Storage limit exceeded');
      return null;
    }

    // Sanitize and validate filename
    const sanitizedName = sanitizeFilename(file.name);
    if (!isValidFileExtension(sanitizedName)) {
      toast.error('File type not allowed. Please upload a supported file format.');
      return null;
    }

    try {
      // Generate safe storage path with sanitized extension
      const fileExt = sanitizedName.split('.').pop()?.toLowerCase() || 'bin';
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const storagePath = `${user.id}/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('user-files')
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Save file record
      const category = getCategoryFromType(file.type);
      const { data, error: dbError } = await supabase
        .from('files')
        .insert({
          user_id: user.id,
          name: sanitizedName,
          size: file.size,
          type: file.type,
          category,
          storage_path: storagePath,
          folder_id: folderId,
        })
        .select()
        .single();

      if (dbError) throw dbError;

      toast.success('File uploaded successfully!');
      await fetchFiles();
      return data;
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
      return null;
    }
  };

  const renameFile = async (fileId: string, newName: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ name: newName })
        .eq('id', fileId);

      if (error) throw error;

      toast.success('File renamed!');
      await fetchFiles();
      return true;
    } catch (error) {
      console.error('Error renaming file:', error);
      toast.error('Failed to rename file');
      return false;
    }
  };

  const moveFile = async (fileId: string, folderId: string | null): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('files')
        .update({ folder_id: folderId })
        .eq('id', fileId);

      if (error) throw error;

      toast.success('File moved!');
      await fetchFiles();
      return true;
    } catch (error) {
      console.error('Error moving file:', error);
      toast.error('Failed to move file');
      return false;
    }
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('user-files')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete record
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      toast.success('File deleted successfully');
      await fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      toast.error('Failed to delete file');
    }
  };

  const getFileUrl = async (storagePath: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from('user-files')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) throw error;
      return data.signedUrl;
    } catch (error) {
      console.error('Error getting file URL:', error);
      return null;
    }
  };

  const getCategoryCounts = () => {
    return {
      documents: files.filter(f => f.category === 'documents').length,
      pdfs: files.filter(f => f.category === 'pdfs').length,
      photos: files.filter(f => f.category === 'photos').length,
      videos: files.filter(f => f.category === 'videos').length,
      others: files.filter(f => f.category === 'others').length,
    };
  };

  const getFilesInFolder = (folderId: string | null): FileRecord[] => {
    return files.filter(f => f.folder_id === folderId);
  };

  const getTotalStorageUsed = (): number => {
    return files.reduce((total, file) => total + file.size, 0);
  };

  const getStorageLimit = (): number => {
    return STORAGE_LIMIT_BYTES;
  };

  const canUploadFile = (fileSize: number): boolean => {
    return getTotalStorageUsed() + fileSize <= STORAGE_LIMIT_BYTES;
  };

  return {
    files,
    loading,
    uploadFile,
    renameFile,
    moveFile,
    deleteFile,
    getFileUrl,
    getCategoryCounts,
    getFilesInFolder,
    getTotalStorageUsed,
    getStorageLimit,
    canUploadFile,
    refetch: fetchFiles,
  };
}
