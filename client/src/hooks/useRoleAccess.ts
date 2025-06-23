import { useRealAuth } from './useRealAuth';

export type UserRole = 'customer' | 'affiliate' | 'admin' | 'super_admin';

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'customer': 1,
  'affiliate': 2,
  'admin': 3,
  'super_admin': 4
};

// Permission definitions
const PERMISSIONS: Record<UserRole, string[]> = {
  'customer': [
    'view_home',
    'book_apartment',
    'view_profile',
    'add_review',
    'view_apartments',
    'apply_affiliate'
  ],
  'affiliate': [
    'view_home',
    'view_calendar',
    'view_profile',
    'manage_affiliate_links',
    'view_affiliate_metrics',
    'view_apartments'
  ],
  'admin': [
    'view_home',
    'view_calendar',
    'view_profile',
    'manage_apartments',
    'manage_bookings',
    'view_admin_dashboard',
    'manage_users',
    'review_affiliate_applications',
    'view_database_admin',
    'manage_affiliate_links',
    'view_affiliate_metrics'
  ],
  'super_admin': ['*'] // Super admin has all permissions
};

export function useRoleAccess() {
  const { user } = useRealAuth();
  const userRole = (user?.role as UserRole) || 'customer';

  // Check if user has required role or higher
  const hasRole = (requiredRole: UserRole): boolean => {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    const userPermissions = PERMISSIONS[userRole] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  };

  // Check if user is admin (admin or super_admin)
  const isAdmin = (): boolean => {
    return hasRole('admin');
  };

  // Check if user is super admin
  const isSuperAdmin = (): boolean => {
    return userRole === 'super_admin';
  };

  // Check if user is affiliate
  const isAffiliate = (): boolean => {
    return hasRole('affiliate');
  };

  // Check if user is customer
  const isCustomer = (): boolean => {
    return userRole === 'customer';
  };

  // Get role display name
  const getRoleDisplayName = (): string => {
    const displayNames: Record<UserRole, string> = {
      'customer': 'Customer',
      'affiliate': 'Affiliate',
      'admin': 'Admin',
      'super_admin': 'Super Admin'
    };
    return displayNames[userRole] || 'Unknown';
  };

  // Get available pages based on role
  const getAvailablePages = (): string[] => {
    const pages: string[] = ['/'];

    if (hasPermission('view_apartments')) {
      pages.push('/apartments');
    }

    if (hasPermission('view_profile')) {
      pages.push('/profile');
    }

    if (hasPermission('view_calendar')) {
      pages.push('/calendar');
    }

    if (hasPermission('manage_apartments')) {
      pages.push('/admin');
    }

    if (hasPermission('view_database_admin')) {
      pages.push('/database-admin');
    }

    if (hasPermission('manage_bookings')) {
      pages.push('/new-booking');
    }

    if (hasPermission('manage_affiliate_links')) {
      pages.push('/affiliate-dashboard');
    }

    if (hasPermission('manage_users')) {
      pages.push('/admin-management');
    }

    return pages;
  };

  // Check if user can access a specific page
  const canAccessPage = (page: string): boolean => {
    const availablePages = getAvailablePages();
    return availablePages.includes(page);
  };

  return {
    userRole,
    hasRole,
    hasPermission,
    isAdmin,
    isSuperAdmin,
    isAffiliate,
    isCustomer,
    getRoleDisplayName,
    getAvailablePages,
    canAccessPage
  };
}
