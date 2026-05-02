'use client';

import {
  LogOut,
  Menu,
  Shield,
  X,
  ChevronRight,
  User,
  Settings as SettingsIcon,
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
import { ThemeProvider } from 'next-themes';

import GlobalToast from '@/components/GlobalToast';
import NotificationBell from '@/components/NotificationBell';
import { useNotificationStore } from '@/store/useNotificationStore';
import './globals.css';

/* =========================
   TYPES
========================= */

type UserRole = 'influencer' | 'business' | 'admin';

interface CurrentUser {
  id: string;
  operatorId: string;
  fullName: string;
  email: string;
  role: UserRole;
  rawRole: string;
  isVerified: boolean;
}

/* =========================
   PUBLIC PAGES - No authentication needed
========================= */

const PUBLIC_PAGES = [
  '/',
  '/privacy',
  '/terms',
  '/about',
  '/pricing',
  '/features'
];

/* =========================
   NAVIGATION MAP with Icons - FIXED
   influencer → /client/dashboard
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
  ]
};

// Role-based dashboard redirect helper
const getDashboardRoute = (role: string): string => {
  const roleLower = role.toLowerCase();
  switch (roleLower) {
    case 'admin':
      return '/admin/dashboard';
    case 'business':
      return '/business/dashboard';
    case 'influencer':
      return '/client/dashboard';
    default:
      return '/client/dashboard';
  }
};

// Professional Logo Component
const KlipLogo = () => (
  <div className="relative flex items-center gap-3 group">
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl rotate-6 transform group-hover:rotate-12 transition-all duration-300 shadow-lg" />
      <div className="absolute inset-[2px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg rotate-6 transform" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-0.5 bg-amber-400/60 rounded-full rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        <div className="w-4 h-0.5 bg-amber-400/60 rounded-full -rotate-45 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Gem size={16} className="text-amber-400 group-hover:text-amber-300 transition-colors" strokeWidth={1.5} />
      </div>
      <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse" />
      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-emerald-500 rounded-full ring-2 ring-white animate-pulse delay-150" />
    </div>

    <div className="flex flex-col">
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black tracking-tight text-slate-900 group-hover:text-slate-700 transition-colors">
          KLIP
        </span>
        <BadgeCheck size={14} className="text-emerald-500" />
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400 group-hover:text-slate-500 transition-colors">
          Klip
        </span>
        <span className="text-[8px] font-medium text-amber-500/70 bg-amber-50 px-1.5 py-0.5 rounded-full">
          SECURE
        </span>
      </div>
    </div>
  </div>
);

// Minimal Logo for Mobile
const KlipLogoMini = () => (
  <div className="relative w-9 h-9">
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl rotate-6 shadow-md" />
    <div className="absolute inset-[2px] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg rotate-6" />
    <div className="absolute inset-0 flex items-center justify-center">
      <Gem size={14} className="text-amber-400" />
    </div>
    <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-emerald-500 rounded-full ring-2 ring-white" />
  </div>
);

/* =========================
   ROOT LAYOUT
========================= */

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans bg-slate-50 text-slate-900">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <LayoutContent>{children}</LayoutContent>
          <GlobalToast />
        </ThemeProvider>
      </body>
    </html>
  );
}

/* =========================
   MAIN LAYOUT CONTENT
========================= */

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [isInitializing, setIsInitializing] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [scrolled, setScrolled] = useState(false);

  const { showToast, fetchUserNotifications, unreadCount } = useNotificationStore();

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if current page is public
  const isPublicPage = PUBLIC_PAGES.includes(pathname || '') || 
                       pathname?.startsWith('/auth/') || 
                       pathname?.startsWith('/_next') ||
                       pathname?.startsWith('/settings') ||
                       pathname?.startsWith('/terms') ||
                       pathname?.startsWith('/privacy');

  const handleLogout = useCallback(() => {
    // Clear localStorage
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_name');
    localStorage.removeItem('klip_user');
    localStorage.removeItem('auth_token');
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    // Clear cookies
    document.cookie = "access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "user_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    document.cookie = "klip_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
    
    setCurrentUser(null);
    showToast('You have been signed out', 'success');
    router.push('/auth/login');
  }, [showToast, router]);

  // Fetch user data from API using token
  const fetchUserData = useCallback(async (token: string) => {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/v1/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        return userData;
      }
      return null;
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for auth pages and public pages
      if (pathname?.startsWith('/auth/')) {
        setIsInitializing(false);
        return;
      }

      if (isPublicPage) {
        setIsInitializing(false);
        return;
      }

      // Get token from localStorage
      const token = localStorage.getItem('access_token');
      
      if (!token) {
        router.push('/auth/login');
        setIsInitializing(false);
        return;
      }

      try {
        // Fetch fresh user data from API
        const userData = await fetchUserData(token);
        
        if (!userData) {
          // Token invalid or expired
          localStorage.removeItem('access_token');
          router.push('/auth/login');
          setIsInitializing(false);
          return;
        }

        // Determine role
        let role: UserRole = 'influencer';
        const rawRole = (userData.role || '').toLowerCase();
        
        if (rawRole === 'admin') {
          role = 'admin';
        } else if (rawRole === 'business') {
          role = 'business';
        } else {
          role = 'influencer';
        }

        const user: CurrentUser = {
          id: userData.id || userData.operator_id || '',
          operatorId: userData.operator_id || '',
          fullName: userData.full_name || 'User',
          email: userData.email || '',
          role,
          rawRole: rawRole,
          isVerified: userData.is_verified || false
        };

        setCurrentUser(user);
        
        // Store role in localStorage for quick access
        localStorage.setItem('user_role', role);
        localStorage.setItem('klip_user', JSON.stringify(user));
        
        // Fetch notifications if user has ID
        if (user.operatorId) {
          fetchUserNotifications(user.operatorId);
        }
        
        // Check if user is on wrong dashboard for their role
        const expectedRoute = getDashboardRoute(role);
        if (pathname === '/client/dashboard' && role !== 'influencer') {
          router.push(expectedRoute);
        } else if (pathname === '/business/dashboard' && role !== 'business') {
          router.push(expectedRoute);
        } else if (pathname === '/admin/dashboard' && role !== 'admin') {
          router.push(expectedRoute);
        }
        
      } catch (error) {
        console.error('Failed to parse user data:', error);
        localStorage.removeItem('access_token');
        router.push('/auth/login');
      } finally {
        setIsInitializing(false);
      }
    };

    checkAuth();
  }, [pathname, isPublicPage, router, fetchUserData, fetchUserNotifications]);

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="relative">
          <div className="relative w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-slate-900 rounded-2xl rotate-12 animate-pulse" />
            <div className="absolute inset-[3px] bg-slate-800 rounded-xl rotate-12" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Gem size={24} className="text-amber-400 animate-pulse" />
            </div>
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <div className="text-center space-y-3">
            <p className="text-sm font-medium text-slate-900">Klip</p>
            <div className="flex items-center justify-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isPublicPage || !currentUser) {
    return <>{children}</>;
  }

  const navItems = NAV_MAP[currentUser.role] || [];
  const currentPage = navItems.find(item => 
    pathname === item.href || pathname?.startsWith(item.href + '/')
  )?.label || 'Dashboard';

  const getRoleColor = (role: UserRole) => {
    switch(role) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'business': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch(role) {
      case 'admin': return Shield;
      case 'business': return Briefcase;
      default: return User;
    }
  };

  const RoleIcon = getRoleIcon(currentUser.role);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shadow-sm' 
          : 'bg-white border-b border-slate-100'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">

          {/* Logo & Mobile Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} className="text-slate-600" /> : <Menu size={20} className="text-slate-600" />}
            </button>

            <Link href="/" className="hidden sm:block">
              <KlipLogo />
            </Link>
            <Link href="/" className="sm:hidden">
              <KlipLogoMini />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname?.startsWith(item.href + '/');
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                    active
                      ? 'text-slate-900 bg-slate-100 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-amber-500' : 'text-slate-400'} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Section */}
          <div className="flex items-center gap-3">

            {/* Notifications */}
            <div className="relative">
              <NotificationBell userId={currentUser.operatorId} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] text-[10px] bg-amber-500 text-white font-bold rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>

            {/* Settings */}
            <Link
              href="/settings"
              className="hidden sm:flex p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              title="Settings"
            >
              <SettingsIcon size={18} />
            </Link>

            {/* User Menu - Desktop */}
            <div className="hidden md:flex items-center gap-3">
              <div className="h-6 w-px bg-slate-200" />
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${getRoleColor(currentUser.role)}`}>
                  <RoleIcon size={12} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider">
                    {currentUser.role === 'influencer' ? 'Creator' : currentUser.role}
                  </span>
                </div>
                
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">{currentUser.fullName}</p>
                  <p className="text-[10px] text-slate-400">{currentUser.email}</p>
                </div>
                
                <button
                  onClick={handleLogout}
                  className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition group relative"
                  title="Sign out"
                >
                  <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition"
                aria-label="Toggle menu"
              >
                <User size={20} className="text-slate-600" />
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white/95 backdrop-blur-lg">
            <div className="px-4 py-3 space-y-1">
              {/* User Profile Card */}
              <div className="mb-4 p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                    <RoleIcon size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{currentUser.fullName}</p>
                    <p className="text-xs text-slate-400">{currentUser.email}</p>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border ${getRoleColor(currentUser.role)}`}>
                    {currentUser.role === 'influencer' ? 'Creator' : currentUser.role}
                  </div>
                </div>
              </div>

              {/* Navigation Items */}
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} className="text-slate-400 group-hover:text-amber-500" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-500" />
                  </Link>
                );
              })}

              {/* Settings Link */}
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition group"
              >
                <div className="flex items-center gap-3">
                  <SettingsIcon size={18} className="text-slate-400 group-hover:text-amber-500" />
                  <span>Settings</span>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-amber-500" />
              </Link>

              {/* Logout Button */}
              <div className="border-t border-slate-100 mt-3 pt-3">
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition group"
                >
                  <LogOut size={18} className="group-hover:scale-110 transition-transform" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Page Header - Mobile Only */}
          <div className="lg:hidden mb-4">
            <h1 className="text-xl font-bold text-slate-900">{currentPage}</h1>
            <p className="text-xs text-slate-400 mt-1">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Home
              </Link>
              <span className="text-slate-300">•</span>
              <Link href="/terms" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Terms
              </Link>
              <span className="text-slate-300">•</span>
              <Link href="/privacy" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
                Privacy
              </Link>
            </div>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} Klip. All rights reserved. 
              <span className="hidden sm:inline"> Secure payment vaults for creators and brands.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}