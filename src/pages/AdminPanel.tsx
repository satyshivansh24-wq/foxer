import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface User {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  created_at: string;
}

const AdminPanel = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [stats, setStats] = useState({
    total: 0,
    admins: 0,
    users: 0
  });

  // 🔐 Access guard
  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate('/');
      return;
    }

    if (!isAdmin) {
      toast.error('Access denied. Admin only.');
      navigate('/');
      return;
    }

    fetchUsers();
  }, [authLoading, roleLoading, isAdmin, user]);

  // 📥 Fetch users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, email, display_name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = data || [];
      setUsers(list);

      const adminCount = list.filter(u => u.role === 'admin').length;

      setStats({
        total: list.length,
        admins: adminCount,
        users: list.length - adminCount
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Admin Panel</h1>

          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={fetchUsers}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Users</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {stats.total}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Admins</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold text-primary">
              {stats.admins}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regular Users</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold">
              {stats.users}
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <div className="flex justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.display_name || '-'}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            u.role === 'admin' ? 'default' : 'secondary'
                          }
                        >
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(u.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminPanel;
