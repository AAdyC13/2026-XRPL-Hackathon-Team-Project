import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/constants';
import { Moon, Sun, Wallet, Zap, LayoutDashboard, Server, History, Settings, LogOut, ShoppingBag } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">高科幣</h1>
              <p className="text-xs text-muted-foreground">AI 算力平台</p>
            </div>
          </div>          {user && (
            <div className="mt-4 px-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink href={ROUTES.DASHBOARD} icon={<LayoutDashboard className="w-5 h-5" />} label="儀表板" />
          <NavLink href={ROUTES.AI_INFERENCE} icon={<Zap className="w-5 h-5" />} label="AI 推論" />
          <NavLink href={ROUTES.WALLET} icon={<Wallet className="w-5 h-5" />} label="錢包" />
          <NavLink href={ROUTES.NODES} icon={<Server className="w-5 h-5" />} label="算力節點" />
          <NavLink href={ROUTES.COMPUTE_RENTAL} icon={<ShoppingBag className="w-5 h-5" />} label="算力出租" />
          <NavLink href={ROUTES.TRANSACTIONS} icon={<History className="w-5 h-5" />} label="交易記錄" />
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 mr-2" />
                淺色模式
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 mr-2" />
                深色模式
              </>
            )}
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start">
            <Settings className="w-4 h-4 mr-2" />
            設定
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start text-destructive hover:text-destructive" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            登出
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
}

function NavLink({ href, icon, label }: NavLinkProps) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary/15 text-primary'
          : 'hover:bg-primary/10 hover:text-primary text-muted-foreground'
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

