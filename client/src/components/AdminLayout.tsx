import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Moon, Sun, ShieldCheck, LayoutDashboard, Users, LogOut } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Admin Sidebar */}
      <aside className="w-64 bg-card border-r border-border flex flex-col">
        {/* Branding */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-destructive to-orange-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">管理後台</h1>
              <p className="text-xs text-muted-foreground">GKC Admin Console</p>
            </div>
          </div>
          {user && (
            <div className="mt-4 px-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-destructive/20 flex items-center justify-center text-xs font-bold text-destructive">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <NavLink href="/admin" exact icon={<LayoutDashboard className="w-5 h-5" />} label="概覽" />
          <NavLink href="/admin/users" icon={<Users className="w-5 h-5" />} label="用戶審核" />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? (
              <><Sun className="w-4 h-4 mr-2" />淺色模式</>
            ) : (
              <><Moon className="w-4 h-4 mr-2" />深色模式</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            登出
          </Button>
        </div>
      </aside>

      {/* Main content */}
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
  exact?: boolean;
}

function NavLink({ href, icon, label, exact = false }: NavLinkProps) {
  const [location] = useLocation();
  const isActive = exact ? location === href : location.startsWith(href);

  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-destructive/15 text-destructive'
          : 'hover:bg-destructive/10 hover:text-destructive text-muted-foreground'
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
