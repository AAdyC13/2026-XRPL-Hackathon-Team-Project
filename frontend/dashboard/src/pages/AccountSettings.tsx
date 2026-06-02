import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import {
  isValidUsername,
  isValidPassword,
  ACCOUNT_POLICY_MESSAGES_ZH,
  toZhAccountPolicyMessage,
} from '@/policies/account-policy';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, User, KeyRound, ShieldAlert } from 'lucide-react';

export default function AccountSettings() {
  const { user, token, refreshUser, isDemoAccount } = useAuth();

  // ── 修改帳號名稱 ──────────────────────────────────────────────
  const [username, setUsername] = useState(user?.username ?? '');
  const [usernameLoading, setUsernameLoading] = useState(false);

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoAccount) { toast.error('Demo 帳號無法修改帳號名稱'); return; }
    if (!token) return;
    if (username === user?.username) {
      toast.info('帳號名稱未變更');
      return;
    }
    if (!isValidUsername(username)) {
      toast.error(ACCOUNT_POLICY_MESSAGES_ZH.usernameInvalid);
      return;
    }
    setUsernameLoading(true);
    try {
      await authApi.updateProfile(token, username);
      await refreshUser();
      toast.success('帳號名稱已更新');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '更新失敗';
      toast.error(toZhAccountPolicyMessage(msg));
    } finally {
      setUsernameLoading(false);
    }
  };

  // ── 修改密碼 ─────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoAccount) { toast.error('Demo 帳號無法修改密碼'); return; }
    if (!token) return;
    if (!currentPassword) {
      toast.error('請輸入目前密碼');
      return;
    }
    if (!isValidPassword(newPassword)) {
      toast.error(ACCOUNT_POLICY_MESSAGES_ZH.passwordInvalid);
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('新密碼與確認密碼不一致');
      return;
    }
    setPasswordLoading(true);
    try {
      await authApi.changePassword(token, currentPassword, newPassword);
      toast.success('密碼已更新，請重新登入以確認');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '更新失敗';
      const map: Record<string, string> = {
        'Current password is incorrect': '目前密碼不正確',
      };
      toast.error(map[raw] ?? toZhAccountPolicyMessage(raw));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Layout>
      <div className="p-8 max-w-xl space-y-6">
        <h1 className="hidden lg:block text-2xl font-bold">帳號設定</h1>

        {isDemoAccount && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-600">Demo 帳號</p>
              <p className="text-xs text-muted-foreground mt-0.5">修改帳號名稱與密碼已停用，如需完整功能請聯繫管理員</p>
            </div>
          </div>
        )}

        {/* 修改帳號名稱 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="w-4 h-4" /> 帳號名稱
            </CardTitle>
            <CardDescription>修改顯示名稱，僅限英文字母、數字與底線（3–64 字元）</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">帳號名稱</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="輸入新的帳號名稱"
                  autoComplete="username"
                  disabled={isDemoAccount}
                />
              </div>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Email：{user?.email}</p>
              </div>
              <Button type="submit" disabled={usernameLoading || isDemoAccount} className="w-full">
                {usernameLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                儲存名稱
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* 修改密碼 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="w-4 h-4" /> 修改密碼
            </CardTitle>
            <CardDescription>至少 8 碼，需包含大寫、小寫與數字</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">目前密碼</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="輸入目前密碼"
                  autoComplete="current-password"
                  disabled={isDemoAccount}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">新密碼</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="輸入新密碼"
                  autoComplete="new-password"
                  disabled={isDemoAccount}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">確認新密碼</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="再次輸入新密碼"
                  autoComplete="new-password"
                  disabled={isDemoAccount}
                />
              </div>
              <Button type="submit" disabled={passwordLoading || isDemoAccount} className="w-full">
                {passwordLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                更新密碼
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
