import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ROUTES } from '@/lib/constants';
import { Moon, Sun, Wallet, Zap, LayoutDashboard, Server, History, Settings, LogOut, ShoppingBag, QrCode, Loader2, Smartphone, Menu, X, ShieldAlert } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { walletApi, type XummPayload } from '@/lib/api';
import { useWallet } from '@/contexts/WalletContext';
import { cn } from '@/lib/utils';
import { BrandLogo, CacpWordmark } from './Brand';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { theme, setTheme } = useTheme();
  const { user, token, logout, refreshUser, isDemoAccount } = useAuth();
  const { hasTrustLine, fetchTrustLine } = useWallet();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const PAGE_TITLES: Record<string, string> = {
    [ROUTES.DASHBOARD]: '儀表板',
    [ROUTES.AI_INFERENCE]: 'AI 推論',
    [ROUTES.NODES]: '算力節點',
    [ROUTES.COMPUTE_RENTAL]: '算力出租',
    [ROUTES.TRANSACTIONS]: '交易記錄',
    [ROUTES.WALLET]: '我的錢包',
    [ROUTES.ACCOUNT_SETTINGS]: '帳號設定',
  };
  const currentPageTitle = PAGE_TITLES[location] ?? '平台';

  const [bindPayload, setBindPayload] = useState<XummPayload | null>(null);
  const [bindLoading, setBindLoading] = useState(false);
  const [bindSigned, setBindSigned] = useState(false);
  const bindPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopBindPolling = useCallback(() => {
    if (bindPollRef.current) { clearInterval(bindPollRef.current); bindPollRef.current = null; }
  }, []);

  useEffect(() => {
    if (!bindPayload || bindSigned) return;
    let errCount = 0;
    bindPollRef.current = setInterval(async () => {
      try {
        const status = await walletApi.bindStatus(token!, bindPayload.uuid);
        errCount = 0;
        if (status.bound) {
          stopBindPolling();
          setBindSigned(true);
          toast.success('XRPL 錢包綁定成功！');
          setTimeout(async () => { await refreshUser(); }, 3000);
        } else if (status.cancelled || status.expired) {
          stopBindPolling();
          toast.error(status.cancelled ? '您已取消綁定' : '綁定請求已過期');
          setBindPayload(null);
        }
      } catch (err) {
        console.error('[layout/bind poll]', err);
        if (++errCount >= 5) {
          stopBindPolling();
          toast.error('無法取得綁定狀態，請關閉後重新操作');
          setBindPayload(null);
        }
      }
    }, 3000);
    const expiryTimer = setTimeout(() => {
      stopBindPolling();
      setBindPayload(null);
      toast.error('綁定請求已過期，請重新操作');
    }, (bindPayload.expiresInSec ?? 300) * 1000);
    return () => { stopBindPolling(); clearTimeout(expiryTimer); };
  }, [bindPayload, bindSigned, token, stopBindPolling, refreshUser]);

  const handleBindWallet = async () => {
    if (!token) return;
    setBindLoading(true);
    setBindSigned(false);
    try {
      const payload = await walletApi.bindInitiate(token);
      setBindPayload(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '無法建立綁定請求';
      toast.error(msg);
    } finally {
      setBindLoading(false);
    }
  };

  const handleCloseBindModal = () => {
    stopBindPolling();
    setBindPayload(null);
    setBindSigned(false);
  };

  useEffect(() => {
    if (token && user?.xrpAddress && user.verificationStatus === 'verified') {
      fetchTrustLine(token);
    }
  }, [token, user?.xrpAddress, user?.verificationStatus, fetchTrustLine]);

  const handleLogout = () => {
    logout();
    navigate(ROUTES.LOGIN);
  };

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-30 h-14 flex items-center gap-3 px-4 bg-card border-b border-border">
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setSidebarOpen(true)} aria-label="開啟選單">
          <Menu className="w-5 h-5" />
        </Button>
        <CacpWordmark className="text-base shrink-0" />
        <span className="flex-1 text-sm font-medium text-muted-foreground truncate">{currentPageTitle}</span>
        {user && user.xrpAddress && user.verificationStatus === 'verified' && hasTrustLine === false && (
          <Link href={ROUTES.WALLET} className="flex items-center gap-1 text-[11px] text-yellow-600 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-2 py-0.5 shrink-0">
            <ShieldAlert className="w-3 h-3" /> TrustLine
          </Link>
        )}
        {isDemoAccount && (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 shrink-0">
            Demo
          </span>
        )}
        {user && (
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
        )}
      </header>

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'w-64 bg-card border-r border-border flex flex-col sidebar-gkc-gradient',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-300 lg:static lg:translate-x-0 lg:z-auto',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <button
          className="lg:hidden absolute top-4 right-4 p-1 rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          onClick={closeSidebar}
          aria-label="關閉選單"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="p-5 border-b border-border brand-glow">
          <Link href={ROUTES.DASHBOARD} onClick={closeSidebar} className="block mb-4">
            <BrandLogo />
          </Link>
          {user && (
            <div className="px-1 flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {user.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.username}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavLink href={ROUTES.DASHBOARD} icon={<LayoutDashboard className="w-5 h-5" />} label="儀表板" onNavigate={closeSidebar} />
          <NavLink href={ROUTES.AI_INFERENCE} icon={<Zap className="w-5 h-5" />} label="AI 推論" onNavigate={closeSidebar} />
          <NavLink href={ROUTES.NODES} icon={<Server className="w-5 h-5" />} label="算力節點" onNavigate={closeSidebar} />
          <NavLink href={ROUTES.COMPUTE_RENTAL} icon={<ShoppingBag className="w-5 h-5" />} label="算力出租" onNavigate={closeSidebar} />
          <NavLink href={ROUTES.TRANSACTIONS} icon={<History className="w-5 h-5" />} label="交易記錄" onNavigate={closeSidebar} />
        </nav>

        {user && !user.xrpAddress && (
          <div className="px-4 pb-2">
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3">
              <p className="text-xs font-semibold text-red-600">尚未綁定 XRPL 錢包</p>
              <p className="text-[11px] text-muted-foreground mt-1">請用 Xaman 掃碼完成綁定</p>
              <Button size="sm" className="mt-2 w-full gap-2" onClick={handleBindWallet} disabled={bindLoading}>
                {bindLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                掃碼綁定
              </Button>
            </div>
          </div>
        )}
        {user && user.xrpAddress && user.verificationStatus === 'verified' && hasTrustLine === false && (
          <div className="px-4 pb-2">
            <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
              <p className="text-xs font-semibold text-yellow-600">GKC TrustLine 尚未設定</p>
              <p className="text-[11px] text-muted-foreground mt-1">設定後才能接收 GKC 與使用鏈上功能</p>
              <Button size="sm" variant="outline" className="mt-2 w-full gap-2 text-yellow-600 border-yellow-500/50 hover:bg-yellow-500/10" asChild>
                <Link href={ROUTES.WALLET} onClick={closeSidebar}>
                  <ShieldAlert className="w-4 h-4" /> 前往設定
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-border space-y-1">
          {isDemoAccount && (
            <div className="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
              <p className="text-xs font-semibold text-amber-600">Demo 帳號</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">部分功能已被停用</p>
            </div>
          )}
          <NavLink href={ROUTES.WALLET} icon={<Wallet className="w-5 h-5" />} label="我的錢包" onNavigate={closeSidebar} />
          <NavLink href={ROUTES.ACCOUNT_SETTINGS} icon={<Settings className="w-5 h-5" />} label="帳號設定" onNavigate={closeSidebar} />

          <div className="flex items-center justify-between px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            <div className="flex items-center gap-3">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              <span>{theme === 'dark' ? '深色模式' : '淺色模式'}</span>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
              className="scale-75 origin-right pointer-events-none"
            />
          </div>

          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive px-4 py-2.5 h-auto gap-3 text-sm font-medium" onClick={handleLogout}>
            <LogOut className="w-5 h-5" />
            登出
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto pt-14 lg:pt-0 min-w-0">
        {children}
      </main>

      <Dialog open={!!bindPayload} onOpenChange={open => { if (!open) handleCloseBindModal(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" /> 綁定 XRPL 錢包
            </DialogTitle>
            <DialogDescription>
              用 Xaman 掃描下方 QR Code 並簽名，完成後會綁定您的 XRPL 地址。
            </DialogDescription>
          </DialogHeader>
          {bindPayload && !bindSigned && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img src={bindPayload.qrPng} alt="綁定 QR Code" className="w-52 h-52 rounded-xl border" />
              </div>
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                等待簽名中…
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" asChild>
                <a href={bindPayload.deeplink} target="_blank" rel="noopener noreferrer">
                  <Smartphone className="w-4 h-4" /> 在手機上開啟 Xaman
                </a>
              </Button>
            </div>
          )}
          {bindSigned && (
            <div className="py-6 text-center space-y-2">
              <p className="text-3xl">✅</p>
              <p className="font-semibold">綁定成功！</p>
              <p className="text-sm text-muted-foreground">正在更新您的錢包資料…</p>
              <Button size="sm" onClick={handleCloseBindModal}>關閉</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface NavLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  onNavigate?: () => void;
}

function NavLink({ href, icon, label, onNavigate }: NavLinkProps) {
  const [location] = useLocation();
  const isActive = location === href;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
        isActive
          ? 'bg-primary/15 text-primary shadow-sm before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:rounded-full before:bg-primary'
          : 'hover:bg-primary/10 hover:text-primary text-muted-foreground'
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
