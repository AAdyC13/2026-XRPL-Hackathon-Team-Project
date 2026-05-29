import { useEffect, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/hooks/api';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Users, RefreshCw } from 'lucide-react';

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  verificationStatus: string;
  xrpAddress: string | null;
  createdAt: string;
}

interface ListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: '待審核', variant: 'outline' },
  verified: { label: '已批准', variant: 'default' },
  rejected: { label: '已拒絕', variant: 'destructive' },
};

export default function Admin() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = async (status: string) => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await apiFetch<ListResponse>(
        `/api/v1/admin/users?status=${status}&limit=50`,
        { token }
      );
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '讀取用戶列表失敗');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, token]);

  const handleApprove = async (userId: string) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      await apiFetch(`/api/v1/admin/users/${userId}/approve`, { method: 'PATCH', token });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, verificationStatus: 'verified' } : u));
      toast.success('用戶已批准');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      await apiFetch(`/api/v1/admin/users/${userId}/reject`, { method: 'PATCH', token });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, verificationStatus: 'rejected' } : u));
      toast.success('用戶已拒絕');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (userId: string) => {
    if (!token) return;
    setActionLoading(userId);
    try {
      await apiFetch(`/api/v1/admin/users/${userId}/reset`, { method: 'PATCH', token });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, verificationStatus: 'pending' } : u));
      toast.success('已重設為待審核');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleString('zh-TW', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <AdminLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">管理後台</h1>
            <p className="text-muted-foreground mt-1">審核用戶帳號，批准學生身份驗證</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUsers(activeTab)}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            重新整理
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v)}>
          <TabsList>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              待審核
            </TabsTrigger>
            <TabsTrigger value="verified" className="gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              已批准
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1.5">
              <XCircle className="w-3.5 h-3.5" />
              已拒絕
            </TabsTrigger>
          </TabsList>

          {['pending', 'verified', 'rejected'].map((tab) => (
            <TabsContent key={tab} value={tab}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      {STATUS_LABELS[tab]?.label ?? tab} 用戶
                    </CardTitle>
                    <CardDescription>共 {total} 筆</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-10">
                      <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : users.length === 0 ? (
                    <p className="text-center text-muted-foreground py-10 text-sm">目前沒有{STATUS_LABELS[tab]?.label}的用戶</p>
                  ) : (
                    <div className="space-y-2">
                      {/* Table header */}
                      <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
                        <div className="col-span-3">使用者名稱</div>
                        <div className="col-span-4">電子郵件</div>
                        <div className="col-span-2">XRP 地址</div>
                        <div className="col-span-2">註冊時間</div>
                        <div className="col-span-1 text-right">操作</div>
                      </div>
                      {/* Table rows */}
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="grid grid-cols-12 gap-3 px-3 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors items-center"
                        >
                          <div className="col-span-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{user.username}</span>
                              {user.role === 'admin' && (
                                <Badge variant="secondary" className="text-xs px-1 py-0">Admin</Badge>
                              )}
                            </div>
                          </div>
                          <div className="col-span-4">
                            <span className="text-sm text-muted-foreground font-mono">{user.email}</span>
                          </div>
                          <div className="col-span-2">
                            {user.xrpAddress ? (
                              <Badge variant="outline" className="text-xs font-mono">
                                {user.xrpAddress.slice(0, 8)}…
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">未綁定</span>
                            )}
                          </div>
                          <div className="col-span-2">
                            <span className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</span>
                          </div>
                          <div className="col-span-1 flex justify-end gap-1">
                            {user.verificationStatus === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 px-2 text-xs"
                                  disabled={actionLoading === user.id}
                                  onClick={() => handleApprove(user.id)}
                                >
                                  {actionLoading === user.id ? (
                                    <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                  ) : '批准'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 px-2 text-xs"
                                  disabled={actionLoading === user.id}
                                  onClick={() => handleReject(user.id)}
                                >
                                  拒絕
                                </Button>
                              </>
                            )}
                            {user.verificationStatus === 'rejected' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                disabled={actionLoading === user.id}
                                onClick={() => handleReset(user.id)}
                              >
                                {actionLoading === user.id ? (
                                  <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : '重設待審'}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
