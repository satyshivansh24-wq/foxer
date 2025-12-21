import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FolderRecord {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

export function useFolders() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFolders = async () => {
    if (!user) {
      setFolders([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('folders')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setFolders((data || []) as FolderRecord[]);
    } catch (error) {
      console.error('Error fetching folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [user]);

  const createFolder = async (name: string, parentId: string | null = null): Promise<FolderRecord | null> => {
    if (!user) {
      toast.error('Please sign in to create folders');
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('folders')
        .insert({
          user_id: user.id,
          name,
          parent_id: parentId,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Folder created!');
      await fetchFolders();
      return data as FolderRecord;
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
      return null;
    }
  };

  const renameFolder = async (folderId: string, newName: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('folders')
        .update({ name: newName })
        .eq('id', folderId);

      if (error) throw error;

      toast.success('Folder renamed!');
      await fetchFolders();
      return true;
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Failed to rename folder');
      return false;
    }
  };

  const deleteFolder = async (folderId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      toast.success('Folder deleted!');
      await fetchFolders();
      return true;
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
      return false;
    }
  };

  const getFoldersInFolder = (parentId: string | null): FolderRecord[] => {
    return folders.filter(f => f.parent_id === parentId);
  };

  const moveFolder = async (folderId: string, newParentId: string | null): Promise<boolean> => {
    // Prevent moving folder into itself
    if (folderId === newParentId) {
      toast.error('Cannot move folder into itself');
      return false;
    }

    try {
      const { error } = await supabase
        .from('folders')
        .update({ parent_id: newParentId })
        .eq('id', folderId);

      if (error) throw error;

      toast.success('Folder moved!');
      await fetchFolders();
      return true;
    } catch (error) {
      console.error('Error moving folder:', error);
      toast.error('Failed to move folder');
      return false;
    }
  };

  return {
    folders,
    loading,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    getFoldersInFolder,
    refetch: fetchFolders,
  };
}
