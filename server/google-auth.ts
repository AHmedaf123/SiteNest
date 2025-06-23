import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { users } from '@shared/schema';
import { generateToken, generateUserId, sanitizeUser } from './auth-utils';
import { getUserRoleByEmail } from './role-utils';
import { authenticateToken } from './auth-routes';

const router = Router();

// Configure Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID || 'your-google-client-id',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-google-client-secret',
  callbackURL: `${process.env.CLIENT_URL || 'http://localhost:5000'}/api/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let existingUser = await db.select().from(users).where(eq(users.googleId, profile.id)).limit(1);

    if (existingUser.length > 0) {
      // User exists, return the user
      return done(null, existingUser[0]);
    }

    // Check if user exists with the same email
    const email = profile.emails?.[0]?.value;
    if (email) {
      existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);

      if (existingUser.length > 0) {
        // Link Google account to existing user
        const updatedUser = await db.update(users)
          .set({
            googleId: profile.id,
            authProvider: 'google',
            isEmailVerified: true, // Google emails are pre-verified
            updatedAt: new Date()
          })
          .where(eq(users.id, existingUser[0].id))
          .returning();

        return done(null, updatedUser[0]);
      }
    }

    // Determine user role (super admin for specific email, customer for others)
    const userRole = getUserRoleByEmail(email || '');

    // Create new user
    const userId = generateUserId();
    const newUser = await db.insert(users).values({
      id: userId,
      email: email || '',
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      profileImageUrl: profile.photos?.[0]?.value || null,
      googleId: profile.id,
      authProvider: 'google',
      role: userRole,
      isEmailVerified: true, // Google emails are pre-verified
      country: 'Pakistan' // Default for SiteNest
    }).returning();

    return done(null, newUser[0]);

  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, false);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (user.length > 0) {
      done(null, user[0]);
    } else {
      done(null, null);
    }
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth routes
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      if (!user) {
        return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}?error=auth_failed`);
      }

      // Generate JWT token
      const token = generateToken(user.id);

      // Check if user needs to complete profile
      const needsProfileCompletion = !user.cnic || !user.phone || !user.address;

      // Track affiliate registration if user came through affiliate link
      const affiliateRef = req.cookies?.affiliate_ref;
      if (affiliateRef) {
        try {
          const link = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
          if (link.length > 0) {
            // User authenticated through affiliate link - track this
            console.log('User authenticated through affiliate link:', affiliateRef);
          }
        } catch (error) {
          console.error('Failed to track affiliate authentication:', error);
        }
      }

      // Set secure cookies for token and user data instead of URL parameters
      // This prevents long URLs and improves security
      // Note: auth_token needs to be accessible by JavaScript for OAuth callback processing
      res.cookie('auth_token', token, {
        httpOnly: false, // Allow client-side access for OAuth callback processing
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000 // 5 minutes - short lived for security
      });

      res.cookie('user_data', JSON.stringify(sanitizeUser(user)), {
        httpOnly: false, // Allow client-side access for user data
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000 // 5 minutes - short lived for security
      });

      // Build redirect URL with minimal parameters
      const redirectUrl = new URL(process.env.CLIENT_URL || 'http://localhost:5000');

      // Only add essential parameters to URL
      if (affiliateRef) {
        redirectUrl.searchParams.set('ref', affiliateRef);
      }

      if (needsProfileCompletion) {
        redirectUrl.searchParams.set('completeProfile', 'true');
      }

      // Add a success flag to indicate successful authentication
      redirectUrl.searchParams.set('auth', 'success');

      res.redirect(redirectUrl.toString());

    } catch (error) {
      console.error('Google callback error:', error);
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5000'}?error=server_error`);
    }
  }
);

// Complete profile for Google users
router.post('/google/complete-profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('Complete profile request received');
    console.log('Request body:', req.body);
    console.log('User from token:', req.user ? 'User found' : 'No user');

    const { cnic, phone, address, country } = req.body;
    const user = req.user;

    if (!user) {
      console.log('No user found in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate required fields
    if (!cnic || !phone || !address) {
      console.log('Missing required fields:', { cnic: !!cnic, phone: !!phone, address: !!address });
      return res.status(400).json({ error: 'CNIC, phone, and address are required' });
    }

    console.log('Updating user profile for user ID:', user.id);

    // Update user profile
    const updatedUser = await db.update(users)
      .set({
        cnic,
        phone,
        address,
        country: country || 'Pakistan',
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('Profile updated successfully');

    res.json({
      message: 'Profile completed successfully',
      user: sanitizeUser(updatedUser[0])
    });

  } catch (error) {
    console.error('Complete profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
