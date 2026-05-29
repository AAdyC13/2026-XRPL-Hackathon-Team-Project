import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ROUTES } from '@/lib/constants';
import { Zap, Mail, Lock } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('demo@gkc.edu.tw');
  const [password, setPassword] = useState('Demo1234');
  const [isLoading, setIsLoading] = useState(false);
  const { login, user } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      toast.success('登入成功，歡迎回來！');
    } catch (err) {
      const message = err instanceof Error && err.message.trim() ? err.message : '登入失敗';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    navigate(user.role === 'admin' ? ROUTES.ADMIN : ROUTES.DASHBOARD);
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
            <Zap className="w-9 h-9 text-white" />
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-3xl">高科幣</h1>
            <p className="text-sm text-muted-foreground mt-1">GKC AI 算力平台</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">登入帳戶</CardTitle>
            <CardDescription>使用您的電子郵件和密碼登入</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    登入中...
                  </span>
                ) : '登入'}
              </Button>
            </form>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              還沒有帳戶？{' '}
              <Link href={ROUTES.REGISTER} className="text-primary hover:underline font-medium">
                立即註冊
              </Link>
            </p>

            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-center space-y-1">
              <p className="font-semibold text-foreground">測試帳號已填入</p>
              <p className="text-muted-foreground">直接點擊「登入」即可體驗所有功能</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
