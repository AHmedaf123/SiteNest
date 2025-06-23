import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import { User } from '@shared/schema';
import { log } from './utils/logger';

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = '7d';

// Password utilities
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// JWT utilities
export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded;
  } catch (error) {
    return null;
  }
};

// OTP utilities
export const generateOTP = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

// Email service
const createEmailTransporter = () => {
  // For development, try multiple email service options
  const emailUser = process.env.EMAIL_USER || 'your-email@gmail.com';
  const emailPassword = process.env.EMAIL_PASSWORD || 'your-app-password';

  // Option 1: Gmail with App Password (recommended for production)
  if (emailUser.includes('@gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });
  }

  // Option 2: Generic SMTP (fallback)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: emailUser,
      pass: emailPassword
    }
  });
};

export const sendVerificationEmail = async (email: string, otp: string, firstName?: string): Promise<boolean> => {
  try {
    // Development mode fallback: Log the OTP if email sending fails
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Always try to send email first if configured
    if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your-email@gmail.com') {
      try {
        log.info(`Attempting to send verification email to: ${email}`);
        const transporter = createEmailTransporter();

        const mailOptions = {
          from: process.env.EMAIL_USER || 'noreply@sitenest.com',
          to: email,
          subject: 'SiteNest - Email Verification',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">SiteNest</h1>
                <p style="color: white; margin: 5px 0;">Your Home Away From Home</p>
              </div>
              <div style="padding: 30px; background: #f9fafb;">
                <h2 style="color: #1f2937;">Email Verification Required</h2>
                <p style="color: #4b5563;">Hello ${firstName || 'there'},</p>
                <p style="color: #4b5563;">Please verify your email address by entering this 6-digit code:</p>
                <div style="background: #1e40af; color: white; font-size: 32px; font-weight: bold; text-align: center; padding: 20px; margin: 20px 0; border-radius: 8px; letter-spacing: 4px;">
                  ${otp}
                </div>
                <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
                <p style="color: #6b7280; font-size: 14px;">If you didn't request this verification, please ignore this email.</p>
              </div>
              <div style="background: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
                <p>SiteNest - Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad, Pakistan</p>
              </div>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        log.info(`✅ Verification email sent successfully to: ${email}`);
        return true;
      } catch (emailError: any) {
        log.error('❌ Email sending failed:', emailError);

        // Provide specific error messages for common Gmail issues
        if (emailError.code === 'EAUTH') {
          log.error('Gmail Authentication Failed. Please check:');
          log.error('1. Enable 2-Factor Authentication on Gmail');
          log.error('2. Generate an App Password in Google Account Settings');
          log.error('3. Use the App Password instead of your regular password');
          log.error('4. Make sure EMAIL_USER and EMAIL_PASSWORD are correctly set in .env');
        }

        // In development, fall back to console logging
        if (isDevelopment) {
          log.info('🔧 DEVELOPMENT FALLBACK - Email Verification');
          log.info(`📧 Email: ${email}`);
          log.info(`🔑 Verification Code: ${otp}`);
          log.info('💡 Use this code to verify your email in the app');
          log.info('─'.repeat(50));
          return true;
        }

        return false;
      }
    }

    // If email is not configured, fall back to development mode
    if (isDevelopment) {
      log.info('🔧 DEVELOPMENT MODE - Email not configured');
      log.info(`📧 Email: ${email}`);
      log.info(`🔑 Verification Code: ${otp}`);
      log.info('💡 Use this code to verify your email in the app');
      log.info('─'.repeat(50));
      return true;
    }

    log.info('Email not configured, email verification disabled');
    return false;
  } catch (error: any) {
    log.error('Email sending error:', error);
    return false;
  }
};

// WhatsApp service using Twilio Sandbox
const getTwilioClient = () => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken || accountSid === 'your-twilio-account-sid') {
    return null;
  }

  return twilio(accountSid, authToken);
};

export const sendVerificationWhatsApp = async (phone: string, otp: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const twilioClient = getTwilioClient();

    if (!twilioClient) {
      log.info('Twilio not configured, WhatsApp verification disabled');
      return { success: false, error: 'WhatsApp service not configured' };
    }

    // Format phone number for WhatsApp (ensure it starts with country code)
    let formattedPhone = phone;
    if (phone.startsWith('0')) {
      // Pakistani number starting with 0, convert to +92
      formattedPhone = `+92${phone.substring(1)}`;
    } else if (!phone.startsWith('+')) {
      // Assume Pakistani number without country code
      formattedPhone = `+92${phone}`;
    }

    // WhatsApp format requires whatsapp: prefix
    const whatsappNumber = `whatsapp:${formattedPhone}`;
    const sandboxNumber = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`;

    const messageBody = `Hello from SiteNest! Your verification code is: ${otp}

Please enter this code in the app to verify your phone number. If you didn't request this, please ignore this message.

Thank you!`;

    await twilioClient.messages.create({
      body: messageBody,
      from: sandboxNumber,
      to: whatsappNumber
    });

    return { success: true };
  } catch (error: any) {
    console.error('WhatsApp sending error:', error);

    // Handle specific Twilio errors
    if (error.code === 63016) {
      return {
        success: false,
        error: 'Please send "join sitenest" to +14155238886 on WhatsApp first to enable verification messages.'
      };
    } else if (error.code === 21211) {
      return {
        success: false,
        error: 'Invalid phone number format. Please check your number and try again.'
      };
    } else {
      return {
        success: false,
        error: 'Failed to send WhatsApp message. Please try again or contact support.'
      };
    }
  }
};

// Keep the old function name for backward compatibility but use WhatsApp
export const sendVerificationSMS = sendVerificationWhatsApp;

// User ID generation
export const generateUserId = (): string => {
  return `user_${crypto.randomUUID()}`;
};

// Sanitize user data for client
export const sanitizeUser = (user: User): Omit<User, 'passwordHash' | 'emailVerificationToken' | 'phoneVerificationToken'> => {
  const { passwordHash, emailVerificationToken, phoneVerificationToken, ...sanitizedUser } = user;
  return sanitizedUser;
};

// Validation helpers
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+92|0)?[0-9]{10,11}$/; // Pakistani phone numbers
  return phoneRegex.test(phone);
};

export const isValidCNIC = (cnic: string): boolean => {
  const cnicRegex = /^\d{13}$/;
  return cnicRegex.test(cnic);
};
