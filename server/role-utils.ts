import { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users, User as SiteNestUser, UserRole } from '@shared/schema';

// Extend Request interface to include user role
declare global {
  namespace Express {
    interface Request {
      user?: SiteNestUser & { role: UserRole };
    }
  }
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<UserRole, number> = {
  'customer': 1,
  'affiliate': 2,
  'admin': 3,
  'super_admin': 4
};

// Check if user has required role or higher
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

// Check if user has permission to access specific features
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const permissions: Record<UserRole, string[]> = {
    'customer': ['view_home', 'book_apartment', 'view_profile', 'add_review'],
    'affiliate': ['view_home', 'view_calendar', 'view_profile', 'manage_affiliate_links', 'view_affiliate_metrics'],
    'admin': ['view_home', 'view_calendar', 'view_profile', 'manage_apartments', 'manage_bookings', 'view_admin_dashboard', 'manage_users'],
    'super_admin': ['*'] // Super admin has all permissions
  };

  const userPermissions = permissions[userRole] || [];
  return userPermissions.includes('*') || userPermissions.includes(permission);
}

// Middleware to require specific role
export function requireRole(requiredRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasRole(req.user.role as UserRole, requiredRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredRole,
        current: req.user.role
      });
    }

    next();
  };
}

// Middleware to require specific permission
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(req.user.role as UserRole, permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permission,
        current: req.user.role
      });
    }

    next();
  };
}

// Check if user is admin (admin or super_admin)
export function isAdmin(userRole: UserRole): boolean {
  return hasRole(userRole, 'admin');
}

// Check if user is super admin
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === 'super_admin';
}

// Assign super admin role to specific email
export async function assignSuperAdminRole(email: string): Promise<void> {
  try {
    await db.update(users)
      .set({ role: 'super_admin' })
      .where(eq(users.email, email));
    console.log(`Super admin role assigned to ${email}`);
  } catch (error) {
    console.error(`Failed to assign super admin role to ${email}:`, error);
  }
}

// Initialize super admin on startup
export async function initializeSuperAdmin(): Promise<void> {
  const superAdminEmail = 'mahmadafzal880@gmail.com';
  
  try {
    // Check if super admin already exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, superAdminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      // Update existing user to super_admin if not already
      if (existingUser[0].role !== 'super_admin') {
        await assignSuperAdminRole(superAdminEmail);
      }
    } else {
      // User will be assigned super admin role when they register
      // No need to log this as it's expected behavior
    }
  } catch (error) {
    // Note: We can't import log here due to circular dependency
    console.error('Failed to initialize super admin:', error);
  }
}

// Get user role by email (for backward compatibility)
export function getUserRoleByEmail(email: string): UserRole {
  // Legacy admin check for backward compatibility
  if (email === 'admin@sitenest.com' || email === 'mahmadafzal880@gmail.com') {
    return 'super_admin';
  }
  return 'customer'; // Default role
}

// Promote user to affiliate
export async function promoteToAffiliate(userId: string): Promise<boolean> {
  try {
    await db.update(users)
      .set({ role: 'affiliate' })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error('Failed to promote user to affiliate:', error);
    return false;
  }
}

// Promote user to admin
export async function promoteToAdmin(userId: string): Promise<boolean> {
  try {
    await db.update(users)
      .set({ role: 'admin' })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error('Failed to promote user to admin:', error);
    return false;
  }
}

// Demote user to customer
export async function demoteToCustomer(userId: string): Promise<boolean> {
  try {
    await db.update(users)
      .set({ role: 'customer' })
      .where(eq(users.id, userId));
    return true;
  } catch (error) {
    console.error('Failed to demote user to customer:', error);
    return false;
  }
}

// Get role display name
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    'customer': 'Customer',
    'affiliate': 'Affiliate',
    'admin': 'Admin',
    'super_admin': 'Super Admin'
  };
  return displayNames[role] || 'Unknown';
}

// Get available roles for promotion (based on current user's role)
export function getAvailableRoles(currentUserRole: UserRole): UserRole[] {
  if (currentUserRole === 'super_admin') {
    return ['customer', 'affiliate', 'admin'];
  } else if (currentUserRole === 'admin') {
    return ['customer', 'affiliate'];
  }
  return [];
}
