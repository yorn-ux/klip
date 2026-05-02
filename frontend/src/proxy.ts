import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Get token from cookies OR headers (for API responses)
  let token = request.cookies.get('access_token')?.value;
  
  // Also check Authorization header (for API calls)
  const authHeader = request.headers.get('authorization');
  if (!token && authHeader?.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }
  
  const userRole = request.cookies.get('user_role')?.value?.toLowerCase();

  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Proxy - Path:', pathname);
    console.log('Proxy - Token:', token ? 'Present' : 'Missing');
    console.log('Proxy - User Role:', userRole);
  }

  // Route Classification
  const isAdminRoute = pathname.startsWith('/admin');
  const isBusinessRoute = pathname.startsWith('/business');
  const isClientRoute = pathname.startsWith('/client');
  
  // Shared routes that multiple roles can access
  const isVaultsRoute = pathname === '/vaults' || pathname.startsWith('/vaults/');
  const isWalletRoute = pathname === '/wallet' || pathname.startsWith('/wallet/');
  const isSupportRoute = pathname === '/support' || pathname.startsWith('/support/');
  const isSettingsRoute = pathname === '/settings' || pathname.startsWith('/settings/');
  
  const isAuthRoute = pathname.startsWith('/auth');
  
  // Public routes that don't require authentication
  const isPublicRoute = [
    '/', 
    '/privacy', 
    '/terms', 
    '/about', 
    '/pricing', 
    '/features'
  ].includes(pathname);

  // Dashboard Mapping based on role
  const homeDashboards: Record<string, string> = {
    admin: '/admin/dashboard',
    business: '/business/dashboard',
    influencer: '/client/dashboard',
    client: '/client/dashboard',
    brand: '/business/dashboard',
    enterprise: '/business/dashboard',
    operator: '/business/dashboard'
  };

  const userHome = homeDashboards[userRole as string] || '/client/dashboard';

  // --- AUTHENTICATION LOGIC ---

  // A. PUBLIC ROUTES - Always accessible
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // B. AUTH ROUTES - If logged in, redirect to dashboard
  if (isAuthRoute) {
    if (token && userRole) {
      // User is logged in - redirect to their dashboard
      const dashboardUrl = new URL(userHome, request.url);
      return NextResponse.redirect(dashboardUrl);
    }
    // User is logged out - allow access to auth pages
    return NextResponse.next();
  }

  // C. PROTECTED ROUTES - Require authentication
  if (!token) {
    // No token - redirect to login
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // D. If token exists but no role, let root layout handle it
  if (!userRole) {
    // Allow access, root layout will fetch user data
    return NextResponse.next();
  }

  // E. SHARED ROUTES - Accessible by multiple roles
  if (isVaultsRoute || isWalletRoute || isSupportRoute || isSettingsRoute) {
    return NextResponse.next();
  }

  // F. ROLE-BASED ACCESS CONTROL
  // Admin routes - only admin can access
  if (isAdminRoute && userRole !== 'admin') {
    return NextResponse.redirect(new URL(userHome, request.url));
  }
  
  // Business routes - only business can access
  if (isBusinessRoute && !['business', 'brand', 'enterprise', 'operator'].includes(userRole)) {
    return NextResponse.redirect(new URL(userHome, request.url));
  }

  // Client routes - only influencers/clients can access
  if (isClientRoute && !['influencer', 'client'].includes(userRole)) {
    return NextResponse.redirect(new URL(userHome, request.url));
  }

  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (.png, .jpg, .jpeg, .gif, .webp, .svg)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};