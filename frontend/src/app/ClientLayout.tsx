'use client';

import {
  LogOut,
  Menu,
  X,
  Gem,
  BadgeCheck,
  Lock,
  LayoutDashboard,
  Briefcase,
  Wallet,
  HelpCircle,
  LineChart,
  Users,
  Activity,
  FileText,
  Scale,
} from 'lucide-react';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import GlobalToast from '@/components/GlobalToast';
import NotificationBell from '@/components/NotificationBell';
import { useNotificationStore } from '@/store/useNotificationStore';

/* =========================
   TYPES
========================= */

type UserRole = 'influencer' | 'business' | 'admin';

interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  rawRole: string;
}

/* =========================
   PUBLIC PAGES
========================= */

const PUBLIC_PAGES = ['/', '/privacy', '/terms', '/about', '/pricing', '/features'];

/* =========================
   NAV MAP
========================= */

const NAV_MAP: Record<UserRole, { label: string; href: string; icon: any }[]> = {
  influencer: [
    { label: 'Dashboard', href: '/client/dashboard', icon: LayoutDashboard },
    { label: 'Vaults', href: '/vaults', icon: Lock },
    { label: 'Explore', href: '/client/explore', icon: Briefcase },
    { label: 'Wallet', href: '/wallet', icon: Wallet },
    { label: 'Support', href: '/support', icon: HelpCircle },
  ],
  business: [
    { label: 'Overview', href: '/business/dashboard', icon: LayoutDashboard },
    { label: 'Campaigns', href: '/vaults', icon: Briefcase },
    { label: 'Finances', href: '/wallet', icon: Wallet },
    { label: 'Analytics', href: '/business/analytics', icon: LineChart },
    { label: 'Support', href: '/support', icon: HelpCircle },
  ],
  admin: [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Revenue', href: '/wallet', icon: Wallet },
    { label: 'Users', href: '/admin/users', icon: Users },
    { label: 'System', href: '/admin/health', icon: Activity },
    { label: 'Audit', href: '/admin/audit', icon: FileText },
    { label: 'Disputes', href: '/support', icon: Scale },
  ],
};

/* =========================
   LOGO
========================= */

const KlipLogo = () => (
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
      <Gem size={14} className="text-amber-400" />
    </div>
    <span className="font-black text-slate-900">KLIP</span>
    <BadgeCheck size={14} className="text-emerald-500" />
  </div>
);

/* =========================
   COMPONENT
========================= */

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const { unreadCount, fetchUserNotifications } = useNotificationStore();

  /* =========================
     AUTH
  ========================= */

  useEffect(() => {
    const stored = localStorage.getItem('klip_user');

    if (!stored) {
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      const raw = (parsed.role || '').toLowerCase();

      let role: UserRole = 'influencer';
      if (parsed.is_admin || raw === 'admin') role = 'admin';
      else if (['business', 'brand'].includes(raw)) role = 'business';

      const user: CurrentUser = {
        id: parsed.id || '',
        fullName: parsed.full_name || 'User',
        email: parsed.email || '',
        role,
        rawRole: raw,
      };

      setCurrentUser(user);

      if (user.id) fetchUserNotifications(user.id);
    } catch {
      localStorage.removeItem('klip_user');
    } finally {
      setLoading(false);
    }
  }, [fetchUserNotifications]);

  /* =========================
     LOGOUT
  ========================= */

  const handleLogout = useCallback(() => {
    localStorage.clear();
    sessionStorage.clear();
    setCurrentUser(null);
    router.push('/auth/login');
  }, [router]);

  /* =========================
     PUBLIC ROUTES
  ========================= */

  const isPublic = PUBLIC_PAGES.includes(pathname || '');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-slate-500">
        Loading...
      </div>
    );
  }

  if (isPublic || !currentUser) {
    return <>{children}</>;
  }

  const navItems = NAV_MAP[currentUser.role];

  /* =========================
     UI
  ========================= */

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">

      {/* HEADER */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-4">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>

          <KlipLogo />
        </div>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex gap-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 text-sm ${
                  active ? 'text-black' : 'text-gray-500'
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* RIGHT */}
        <div className="flex items-center gap-3">

          {/* ✅ FIXED unreadCount USED HERE */}
          <div className="relative">
            <NotificationBell userId={currentUser.id} />

            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] text-[10px] bg-amber-500 text-white rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>

          <button onClick={handleLogout}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 p-2"
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}

      {/* MAIN */}
      <main className="flex-1 p-6">{children}</main>

      <GlobalToast />
    </div>
  );
}