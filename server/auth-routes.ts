import { Router, Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from './db';
import { users, User as SiteNestUser, UserRole } from '@shared/schema';
import {
  signupValidation,
  loginValidation,
  profileUpdateValidation,
  passwordChangeValidation,
  verificationValidation,
  type SignupData,
  type LoginData,
  type ProfileUpdateData,
  type PasswordChangeData,
  type VerificationData
} from '@shared/schema';
import { getUserRoleByEmail } from './role-utils';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  generateOTP,
  sendVerificationEmail,
  sendVerificationSMS,
  generateUserId,
  sanitizeUser
} from './auth-utils';
import { emitUserRegistered } from './dashboard-events';
import { storage as storageEngine } from './storage';
import { log } from './utils/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Note: Request interface extension is handled in role-utils.ts

const router = Router();

// Configure multer for profile picture uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/profiles';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
  }
});

// Middleware to verify JWT token
const authenticateToken = async (req: Request, res: Response, next: any) => {

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  // Development mode: Allow access without token for testing
  if (!token && process.env.NODE_ENV === 'development') {
    log.info('Development mode: Creating mock admin user');

    const mockUserId = 'dev-admin-123';
    const mockUserEmail = 'mahmadafzal880@gmail.com';

    // Check if using database storage and ensure mock user exists
    if (process.env.USE_DATABASE === 'true') {
      try {
        // Check if mock user exists in database
        const existingUser = await db.select().from(users).where(eq(users.id, mockUserId));

        if (existingUser.length === 0) {
          // Also check by email in case user exists with different ID
          const existingByEmail = await db.select().from(users).where(eq(users.email, mockUserEmail));

          if (existingByEmail.length === 0) {
            // Create mock user in database
            await db.insert(users).values({
              id: mockUserId,
              email: mockUserEmail,
              firstName: 'Admin',
              lastName: 'User',
              role: 'super_admin',
              isEmailVerified: true,
              isPhoneVerified: true,
              authProvider: 'email',
              country: 'Pakistan'
            });
            log.info('Mock admin user created in database');
          } else {
            log.info('Mock admin user already exists with different ID, using existing user');
            // Update the mock user ID to match the existing user
            req.user = {
              id: existingByEmail[0].id,
              email: mockUserEmail,
              firstName: 'Admin',
              lastName: 'User',
              role: 'super_admin' as const,
              isEmailVerified: true,
              isPhoneVerified: true,
              createdAt: new Date(),
              updatedAt: new Date(),
              phone: null,
              cnic: null,
              profileImageUrl: null,
              passwordHash: null,
              address: null,
              emailVerificationToken: null,
              phoneVerificationToken: null,
              googleId: null,
              authProvider: 'email',
              country: 'Pakistan'
            };
            return next();
          }
        } else {
          log.info('Mock admin user already exists in database');
        }
      } catch (error) {
        log.error('Error ensuring mock user exists:', error);
      }
    }

    // Create a mock admin user for development
    req.user = {
      id: mockUserId,
      email: mockUserEmail,
      firstName: 'Admin',
      lastName: 'User',
      role: 'super_admin' as const,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      phone: null,
      cnic: null,
      profileImageUrl: null,
      passwordHash: null,
      address: null,
      emailVerificationToken: null,
      phoneVerificationToken: null,
      googleId: null,
      authProvider: 'email',
      country: 'Pakistan'
    };
    return next();
  }

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  try {
    const userResult = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
    if (userResult.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = { ...userResult[0], role: userResult[0].role as any };
    next();
  } catch (error) {
    log.error('Database error:', error);
    return res.status(500).json({ error: 'Database error' });
  }
};

// Signup endpoint
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const validatedData = signupValidation.parse(req.body) as SignupData;

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(validatedData.password);

    // Generate verification tokens
    const emailVerificationToken = generateOTP();
    const phoneVerificationToken = generateOTP();

    // Determine user role (super admin for specific email, customer for others)
    const userRole = getUserRoleByEmail(validatedData.email);

    // Create user
    const userId = generateUserId();
    const newUser = await db.insert(users).values({
      id: userId,
      email: validatedData.email,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      passwordHash,
      cnic: validatedData.cnic,
      phone: validatedData.phone,
      country: validatedData.country,
      address: validatedData.address,
      role: userRole,
      emailVerificationToken,
      phoneVerificationToken,
      authProvider: 'email'
    }).returning();

    const user = newUser[0];

    // Track affiliate registration if user came through affiliate link
    const affiliateRef = req.cookies.affiliate_ref;
    if (affiliateRef) {
      try {
        const link = await storageEngine.getAffiliateLinkByCode(affiliateRef);
        if (link && link.isActive) {
          // Create affiliate metric for registration
          await storageEngine.createAffiliateMetric({
            affiliateId: link.affiliateId,
            linkId: link.id,
            customerId: user.id,
            eventType: 'registration',
            eventData: JSON.stringify({
              userEmail: user.email,
              registrationDate: new Date()
            })
          });

          // Update conversion count
          await storageEngine.updateAffiliateLink(link.id, {
            conversionCount: link.conversionCount + 1
          });
        }
      } catch (error) {
        console.error('Failed to track affiliate registration:', error);
      }
    }

    // Emit real-time event for admin dashboard
    emitUserRegistered(user);

    // Send verification emails/SMS
    const emailSent = await sendVerificationEmail(
      validatedData.email,
      emailVerificationToken,
      validatedData.firstName
    );

    const whatsappResult = await sendVerificationSMS(
      validatedData.phone,
      phoneVerificationToken
    );

    // Generate JWT token
    const token = generateToken(userId);

    res.status(201).json({
      message: 'Account created successfully',
      user: sanitizeUser(newUser[0]),
      token,
      verificationStatus: {
        emailSent,
        whatsappSent: whatsappResult.success,
        whatsappError: whatsappResult.error
      }
    });

  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const validatedData = loginValidation.parse(req.body) as LoginData;

    // Find user by email
    const user = await db.select().from(users).where(eq(users.email, validatedData.email)).limit(1);
    if (user.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const foundUser = user[0];

    // Check password
    if (!foundUser.passwordHash) {
      return res.status(401).json({ error: 'Please use Google Sign-In for this account' });
    }

    const isPasswordValid = await comparePassword(validatedData.password, foundUser.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = generateToken(foundUser.id);

    res.json({
      message: 'Login successful',
      user: sanitizeUser(foundUser),
      token,
      requiresVerification: !foundUser.isEmailVerified || !foundUser.isPhoneVerified
    });

  } catch (error: any) {
    console.error('Login error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  res.json({
    user: sanitizeUser(req.user)
  });
});

// Get current user profile (alias for /me)
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  res.json({
    user: sanitizeUser(req.user)
  });
});

// Email verification
router.post('/verify-email', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { token } = verificationValidation.parse(req.body) as VerificationData;

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (user.emailVerificationToken !== token) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Update user verification status
    await db.update(users)
      .set({
        isEmailVerified: true,
        emailVerificationToken: null
      })
      .where(eq(users.id, user.id));

    res.json({ message: 'Email verified successfully' });

  } catch (error: any) {
    console.error('Email verification error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Phone verification
router.post('/verify-phone', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { token } = verificationValidation.parse(req.body) as VerificationData;

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (user.phoneVerificationToken !== token) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Update user verification status
    const updatedUser = await db.update(users)
      .set({
        isPhoneVerified: true,
        phoneVerificationToken: null
      })
      .where(eq(users.id, user.id))
      .returning();

    res.json({
      message: 'Phone verified successfully',
      user: sanitizeUser(updatedUser[0])
    });

  } catch (error: any) {
    console.error('Phone verification error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend verification codes
router.post('/resend-verification', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { type } = req.body; // 'email' or 'phone'
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (type === 'email') {
      if (user.isEmailVerified) {
        return res.status(400).json({ error: 'Email is already verified' });
      }

      const newToken = generateOTP();
      await db.update(users)
        .set({ emailVerificationToken: newToken })
        .where(eq(users.id, user.id));

      const emailSent = await sendVerificationEmail(user.email, newToken, user.firstName || undefined);
      res.json({ message: 'Verification email sent', sent: emailSent });

    } else if (type === 'phone') {
      if (user.isPhoneVerified) {
        return res.status(400).json({ error: 'Phone is already verified' });
      }

      const newToken = generateOTP();
      await db.update(users)
        .set({ phoneVerificationToken: newToken })
        .where(eq(users.id, user.id));

      const whatsappResult = await sendVerificationSMS(user.phone!, newToken);
      res.json({
        message: whatsappResult.success ? 'Verification WhatsApp sent' : 'Failed to send WhatsApp verification',
        sent: whatsappResult.success,
        error: whatsappResult.error
      });

    } else {
      res.status(400).json({ error: 'Invalid verification type' });
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update profile
router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validatedData = profileUpdateValidation.parse(req.body) as ProfileUpdateData;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Update user profile
    const updatedUser = await db.update(users)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    res.json({
      message: 'Profile updated successfully',
      user: sanitizeUser(updatedUser[0])
    });

  } catch (error: any) {
    console.error('Profile update error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password
router.put('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const validatedData = passwordChangeValidation.parse(req.body) as PasswordChangeData;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'Cannot change password for OAuth accounts' });
    }

    // Verify current password
    const isCurrentPasswordValid = await comparePassword(validatedData.currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(validatedData.newPassword);

    // Update password
    await db.update(users)
      .set({
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    res.json({ message: 'Password changed successfully' });

  } catch (error: any) {
    console.error('Password change error:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload profile picture
router.post('/upload-profile-picture', authenticateToken, upload.single('profilePicture'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const profileImageUrl = `/uploads/profiles/${req.file.filename}`;

    // Delete old profile picture if exists
    if (user.profileImageUrl && user.profileImageUrl.startsWith('/uploads/')) {
      const oldPath = path.join(process.cwd(), user.profileImageUrl);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update user profile picture
    const updatedUser = await db.update(users)
      .set({
        profileImageUrl,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    res.json({
      message: 'Profile picture uploaded successfully',
      user: sanitizeUser(updatedUser[0])
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout (client-side token removal, but we can blacklist tokens if needed)
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  // In a more sophisticated setup, you might want to blacklist the token
  res.json({ message: 'Logged out successfully' });
});

// Send WhatsApp verification for profile verification
router.post('/send-whatsapp-verification', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!user.phone) {
      return res.status(400).json({ error: 'No phone number found in profile' });
    }

    if (user.isPhoneVerified) {
      return res.status(400).json({ error: 'Phone number is already verified' });
    }

    // Generate new verification token
    const newToken = generateOTP();
    await db.update(users)
      .set({ phoneVerificationToken: newToken })
      .where(eq(users.id, user.id));

    // Send WhatsApp verification
    const whatsappResult = await sendVerificationSMS(user.phone, newToken);

    res.json({
      message: whatsappResult.success ? 'WhatsApp verification sent successfully' : 'Failed to send WhatsApp verification',
      sent: whatsappResult.success,
      error: whatsappResult.error
    });

  } catch (error) {
    console.error('WhatsApp verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test WhatsApp endpoint (for development/testing)
router.post('/test-whatsapp', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const testOTP = '123456';
    const result = await sendVerificationSMS(phone, testOTP);

    res.json({
      message: 'WhatsApp test completed',
      result
    });

  } catch (error) {
    console.error('WhatsApp test error:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

export default router;
export { authenticateToken };
