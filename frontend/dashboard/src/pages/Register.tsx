import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Zap, Mail, Lock, User, Clock } from 'lucide-react';
import { ROUTES } from '@/lib/constants';
import { ACCOUNT_POLICY_MESSAGES_ZH } from '@/policies/account-policy';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [registered, setRegistered] = useState(false);
  const { register } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('兩次輸入的密碼不一致');
      return;
    }
    setIsLoading(true);
    try {
      await register(username, email, password);
      setRegistered(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '註冊失敗，請稍後再試');
    } finally {
      setIsLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              <Zap className="w-9 h-9 text-white" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-yellow-500" />
                <CardTitle className="text-xl">帳戶已建立</CardTitle>
              </div>
              <CardDescription>等待管理員審核</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 text-sm space-y-2">
                <p className="font-medium">您的帳號目前正在等待管理員審核</p>
                <p className="text-muted-foreground">審核通過後，您將可以連接 Xaman 錢包並使用所有功能。</p>
              </div>
              <Button className="w-full" onClick={() => navigate(ROUTES.DASHBOARD)}>
                前往 Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap className="w-9 h-9 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-3xl">高科幣</h1>
            <p className="text-sm text-muted-foreground mt-1">建立您的 GKC 帳戶</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">建立帳戶</CardTitle>
            <CardDescription>建立帳戶後，等待管理員審核通過即可使用所有功能</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">使用者名稱</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="my_username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                    minLength={3}
                    maxLength={64}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{ACCOUNT_POLICY_MESSAGES_ZH.usernameInvalid}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">電子郵件</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="至少 8 個字元，含大小寫與數字"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{ACCOUNT_POLICY_MESSAGES_ZH.passwordInvalid}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">確認密碼</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="再次輸入密碼"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    建立帳戶中...
                  </span>
                ) : '建立帳戶'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              已有帳戶？{' '}
              <Link href={ROUTES.LOGIN} className="text-primary hover:underline font-medium">
                立即登入
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
