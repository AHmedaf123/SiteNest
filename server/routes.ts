import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import multer from "multer";
import path from "path";
import fs from "fs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { AvailabilityService } from "./services/availability.service";
import { insertCustomerSchema, insertBookingSchema, insertApartmentSchema, insertReviewSchema, insertBookingRequestSchema } from "@shared/schema";
import authRoutes, { authenticateToken } from "./auth-routes";
import googleAuthRoutes from "./google-auth";
import affiliateRoutes from "./affiliate-routes";
import { initializeSuperAdmin, requireRole, requirePermission, isAdmin } from "./role-utils";
import { setSocketIO, emitBookingRequestCreated, emitBookingRequestUpdated, emitDashboardStatsUpdate } from "./dashboard-events";
import passport from "passport";
import { z } from "zod";
import { ZodError } from "zod";
import { ValidationError, BookingNotAvailableError } from "./errors";
import { db } from "./db";
import { affiliateApplications, users } from "@shared/schema";
import { desc, eq } from "drizzle-orm";
import { log } from "./utils/logger";

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration
  app.use(cors({
    origin: ['http://localhost:5000', 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:", "http:", "https://maps.googleapis.com", "https://maps.gstatic.com", "https://streetviewpixels-pa.googleapis.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://replit.com", "https://maps.googleapis.com", "https://www.googletagmanager.com", "https://www.google-analytics.com"],
        connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com", "https://maps.googleapis.com", "https://replit.com", "https://www.google-analytics.com", "https://analytics.google.com", "https://firebase.googleapis.com"],
        frameSrc: ["'self'", "https://www.google.com", "https://maps.google.com", "https://www.google.com/maps/embed"]
      }
    }
  }));

  // Session configuration for Google OAuth
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  app.use(session({
    secret: process.env.SESSION_SECRET || 'sitenest-default-secret-change-in-production',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: sessionTtl,
    },
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Create HTTP server and Socket.IO instance
  const httpServer = createServer(app);
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Initialize Socket.IO for dashboard events
  setSocketIO(io);

  // Socket.IO connection handling
  io.on('connection', (socket) => {
    log.debug('Socket.IO client connected', { socketId: socket.id });

    socket.on('join-apartment', (apartmentId) => {
      socket.join(`apartment-${apartmentId}`);
      log.debug('Client joined apartment room', { socketId: socket.id, apartmentId });
    });

    socket.on('join-admin-dashboard', () => {
      socket.join('admin-dashboard');
      log.debug('Client joined admin dashboard', { socketId: socket.id });
    });

    socket.on('join-affiliate-dashboard', (affiliateId) => {
      socket.join(`affiliate-${affiliateId}`);
      log.debug('Client joined affiliate dashboard', { socketId: socket.id, affiliateId });
    });

    socket.on('disconnect', () => {
      log.debug('Socket.IO client disconnected', { socketId: socket.id });
    });
  });

  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Configure multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage_multer,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      // Allow images and videos
      if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image and video files are allowed!'));
      }
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(uploadsDir));

  // New SiteNest Authentication Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/auth', googleAuthRoutes);

  // Affiliate routes
  app.use('/api/affiliate', affiliateRoutes);

  // Initialize super admin role
  await initializeSuperAdmin();

  // Affiliate link tracking
  app.get("/api/track/affiliate/:linkCode", async (req, res) => {
    try {
      const { linkCode } = req.params;

      // Find the affiliate link
      const link = await storage.getAffiliateLinkByCode(linkCode);
      if (!link || !link.isActive) {
        return res.status(404).json({ error: 'Invalid or inactive affiliate link' });
      }

      // Check if link has expired
      if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
        return res.status(410).json({ error: 'Affiliate link has expired' });
      }

      // Update click count
      await storage.updateAffiliateLink(link.id, {
        clickCount: link.clickCount + 1
      });

      // Create affiliate metric for click tracking
      await storage.createAffiliateMetric({
        affiliateId: link.affiliateId,
        linkId: link.id,
        eventType: 'click',
        eventData: JSON.stringify({
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          timestamp: new Date()
        })
      });

      // Store affiliate info in session/cookie for later use
      res.cookie('affiliate_ref', linkCode, {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
      });

      // Redirect to home page with affiliate tracking
      res.redirect(`/?ref=${linkCode}`);

    } catch (error) {
      log.error('Affiliate link tracking error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Fallback route for old-style affiliate links (/?ref=code)
  app.get("/", async (req, res, next) => {
    try {
      const affiliateRef = req.query.ref as string;

      // If there's an affiliate reference, always track the click
      if (affiliateRef) {
        // Find the affiliate link
        const link = await storage.getAffiliateLinkByCode(affiliateRef);
        if (link && link.isActive) {
          // Check if link has expired
          if (!link.expiresAt || new Date() <= new Date(link.expiresAt)) {
            // Update click count
            await storage.updateAffiliateLink(link.id, {
              clickCount: link.clickCount + 1
            });

            // Create affiliate metric for click tracking
            await storage.createAffiliateMetric({
              affiliateId: link.affiliateId,
              linkId: link.id,
              eventType: 'click',
              eventData: JSON.stringify({
                userAgent: req.headers['user-agent'],
                ip: req.ip,
                timestamp: new Date(),
                source: 'fallback_route'
              })
            });

            // Store affiliate info in session/cookie for later use (only if not already set)
            if (!req.cookies?.affiliate_ref) {
              res.cookie('affiliate_ref', affiliateRef, {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production'
              });
            }

            log.info('Affiliate click tracked via fallback route', { affiliateRef });
          }
        }
      }

      // Continue to next middleware (Vite dev server or static files)
      next();
    } catch (error) {
      log.error('Fallback affiliate tracking error', error);
      // Continue to next middleware even if tracking fails
      next();
    }
  });

  // Get affiliate pricing for a customer (authenticated)
  app.get("/api/pricing/affiliate", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check for affiliate reference - prioritize URL parameter (from localStorage) over cookie
      const affiliateRef = req.query.ref || req.cookies?.affiliate_ref;

      if (!affiliateRef) {
        return res.json({ hasAffiliatePricing: false });
      }

      // Get the affiliate link
      const link = await storage.getAffiliateLinkByCode(affiliateRef as string);

      if (!link || !link.isActive) {
        return res.json({ hasAffiliatePricing: false });
      }

      // Check if link has expired
      if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
        return res.json({ hasAffiliatePricing: false });
      }

      // Get stay duration from query parameters for long-stay discount calculation
      const checkIn = req.query.checkIn as string;
      const checkOut = req.query.checkOut as string;
      let stayDuration = 0;

      if (checkIn && checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        stayDuration = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate if long-stay discount applies
      let longStayDiscountApplies = false;
      if (link.longStayDiscountEnabled && stayDuration >= (link.longStayMinDays || 5)) {
        longStayDiscountApplies = true;
      }

      res.json({
        hasAffiliatePricing: true,
        // Legacy fields (for backward compatibility)
        priceAdjustment: link.priceAdjustment,
        adjustmentType: link.adjustmentType,
        discountPercentage: link.discountPercentage,
        additionalAmount: link.additionalAmount,
        additionalDiscount: link.additionalDiscount,
        // New long-stay discount fields
        longStayDiscountEnabled: link.longStayDiscountEnabled,
        longStayMinDays: link.longStayMinDays,
        longStayDiscountType: link.longStayDiscountType,
        longStayDiscountValue: link.longStayDiscountValue,
        longStayDiscountApplies,
        stayDuration,
        affiliateId: link.affiliateId
      });

    } catch (error) {
      log.error('Get affiliate pricing error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Public affiliate pricing endpoint (no authentication required)
  app.get("/api/pricing/affiliate/public", async (req, res) => {
    try {
      // Check for affiliate reference in cookie or URL parameter
      const affiliateRef = req.cookies?.affiliate_ref || req.query.ref;

      if (!affiliateRef) {
        return res.json({ hasAffiliatePricing: false });
      }

      // Get the affiliate link
      const link = await storage.getAffiliateLinkByCode(affiliateRef as string);

      if (!link || !link.isActive) {
        return res.json({ hasAffiliatePricing: false });
      }

      // Check if link has expired
      if (link.expiresAt && new Date() > new Date(link.expiresAt)) {
        return res.json({ hasAffiliatePricing: false });
      }

      // Get stay duration from query parameters for long-stay discount calculation
      const checkIn = req.query.checkIn as string;
      const checkOut = req.query.checkOut as string;
      let stayDuration = 0;

      if (checkIn && checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        stayDuration = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      // Calculate if long-stay discount applies
      let longStayDiscountApplies = false;
      if (link.longStayDiscountEnabled && stayDuration >= (link.longStayMinDays || 5)) {
        longStayDiscountApplies = true;
      }

      res.json({
        hasAffiliatePricing: true,
        // Legacy fields (for backward compatibility)
        priceAdjustment: link.priceAdjustment,
        adjustmentType: link.adjustmentType,
        discountPercentage: link.discountPercentage,
        additionalAmount: link.additionalAmount,
        additionalDiscount: link.additionalDiscount,
        // New long-stay discount fields
        longStayDiscountEnabled: link.longStayDiscountEnabled,
        longStayMinDays: link.longStayMinDays,
        longStayDiscountType: link.longStayDiscountType,
        longStayDiscountValue: link.longStayDiscountValue,
        longStayDiscountApplies,
        stayDuration,
        affiliateId: link.affiliateId
      });

    } catch (error) {
      log.error('Get public affiliate pricing error', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Legacy Auth routes removed - using new SiteNest auth system
  // Apartments endpoints
  app.get("/api/apartments", async (req, res) => {
    try {
      const apartments = await storage.getApartments();
      res.json(apartments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch apartments" });
    }
  });

  app.get("/api/apartments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const apartment = await storage.getApartment(id);

      if (!apartment) {
        return res.status(404).json({ message: "Apartment not found" });
      }

      res.json(apartment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch apartment" });
    }
  });

  // File upload endpoint for apartments
  app.post("/api/apartments/upload", upload.array('files', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const fileUrls = files.map(file => `/uploads/${file.filename}`);
      res.json({ fileUrls });
    } catch (error) {
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Create apartment
  app.post("/api/apartments", async (req, res) => {
    try {
      const apartmentData = insertApartmentSchema.parse(req.body);
      const apartment = await storage.createApartment(apartmentData);

      // Trigger chatbot training update
      try {
        await fetch('http://localhost:5060/webhook/apartment/created', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apartment),
        });
        log.info('Chatbot notified of new apartment', { roomNumber: apartment.roomNumber });
      } catch (webhookError) {
        log.warn('Failed to notify chatbot of new apartment', { error: webhookError });
        // Don't fail the apartment creation if webhook fails
      }

      res.json(apartment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid apartment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create apartment" });
    }
  });

  // Update apartment
  app.put("/api/apartments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const apartmentData = insertApartmentSchema.parse(req.body);
      const apartment = await storage.updateApartment(id, apartmentData);

      if (!apartment) {
        return res.status(404).json({ message: "Apartment not found" });
      }

      // Trigger chatbot training update
      try {
        await fetch('http://localhost:5060/webhook/apartment/updated', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apartment),
        });
        log.info('Chatbot notified of apartment update', { roomNumber: apartment.roomNumber });
      } catch (webhookError) {
        log.warn('Failed to notify chatbot of apartment update', { error: webhookError });
        // Don't fail the apartment update if webhook fails
      }

      res.json(apartment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid apartment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update apartment" });
    }
  });

  // Delete apartment
  app.delete("/api/apartments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      // Get apartment details before deletion for webhook
      const apartmentToDelete = await storage.getApartment(id);

      const deleted = await storage.deleteApartment(id);

      if (!deleted) {
        return res.status(404).json({ message: "Apartment not found" });
      }

      // Trigger chatbot training update
      if (apartmentToDelete) {
        try {
          await fetch('http://localhost:5060/webhook/apartment/deleted', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ roomNumber: apartmentToDelete.roomNumber }),
          });
          log.info('Chatbot notified of apartment deletion', { roomNumber: apartmentToDelete.roomNumber });
        } catch (webhookError) {
          log.warn('Failed to notify chatbot of apartment deletion', { error: webhookError });
          // Don't fail the apartment deletion if webhook fails
        }
      }

      res.json({ message: "Apartment deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete apartment" });
    }
  });



  // Bookings endpoints
  app.get("/api/bookings", async (req, res) => {
    try {
      const apartmentId = req.query.apartmentId ? parseInt(req.query.apartmentId as string) : undefined;

      if (apartmentId) {
        const bookings = await storage.getBookingsByApartment(apartmentId);
        res.json(bookings);
      } else {
        const bookings = await storage.getBookings();
        res.json(bookings);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);

      // Check availability
      const isAvailable = await storage.checkAvailability(
        bookingData.apartmentId,
        bookingData.checkIn,
        bookingData.checkOut
      );

      if (!isAvailable) {
        return res.status(400).json({ message: "Room is not available for the selected dates" });
      }

      const booking = await storage.createBooking(bookingData);
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const bookingData = insertBookingSchema.parse(req.body);

      // Get the existing booking to check if dates are changing
      const existingBooking = await storage.getBooking(id);
      if (!existingBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      // Check availability only if dates are changing
      const datesChanged = existingBooking.checkIn !== bookingData.checkIn ||
                          existingBooking.checkOut !== bookingData.checkOut ||
                          existingBooking.apartmentId !== bookingData.apartmentId;

      if (datesChanged) {
        const isAvailable = await storage.checkAvailabilityExcluding(
          bookingData.apartmentId,
          bookingData.checkIn,
          bookingData.checkOut,
          id
        );

        if (!isAvailable) {
          return res.status(400).json({ message: "Room is not available for the selected dates" });
        }
      }

      const updatedBooking = await storage.updateBooking(id, bookingData);
      if (!updatedBooking) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json(updatedBooking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteBooking(id);

      if (!deleted) {
        return res.status(404).json({ message: "Booking not found" });
      }

      res.json({ message: "Booking deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete booking" });
    }
  });

  app.get("/api/availability/:apartmentId", async (req, res) => {
    try {
      const apartmentId = parseInt(req.params.apartmentId);
      const { checkIn, checkOut } = req.query;

      if (!checkIn || !checkOut) {
        return res.status(400).json({ message: "Check-in and check-out dates are required" });
      }

      const isAvailable = await storage.checkAvailability(
        apartmentId,
        checkIn as string,
        checkOut as string
      );

      res.json({ available: isAvailable });
    } catch (error) {
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // New endpoint for comprehensive availability check with alternatives
  app.post("/api/availability-check", async (req, res) => {
    try {
      const { roomNumber, checkIn, checkOut } = req.body;

      console.log("🔍 Availability Check Request:", { roomNumber, checkIn, checkOut });

      if (!roomNumber || !checkIn || !checkOut) {
        return res.status(400).json({ message: "Room number, check-in and check-out dates are required" });
      }

      // Get the requested apartment by room number
      const requestedRoom = await storage.getApartmentByRoomNumber(roomNumber);
      console.log("🏠 Found room:", requestedRoom ? `Room ${requestedRoom.roomNumber} (ID: ${requestedRoom.id})` : "NOT FOUND");

      if (!requestedRoom) {
        return res.status(404).json({ message: "Room not found" });
      }

      // Get existing bookings for debugging
      const existingBookings = await storage.getBookingsByApartment(requestedRoom.id);
      console.log("📅 Existing bookings for room:", existingBookings.length);
      existingBookings.forEach(booking => {
        console.log(`  - Booking ${booking.id}: ${booking.checkIn} to ${booking.checkOut} (Status: ${booking.status})`);
      });

      // Check availability for the requested room
      const isAvailable = await storage.checkAvailability(
        requestedRoom.id,
        checkIn,
        checkOut
      );

      console.log("✅ Availability result:", isAvailable);

      // WhatsApp and Easypaisa number
      const whatsappNumber = "03115197087";
      const easypaisaNumber = "03115197087";

      if (isAvailable) {
        // Room is available
        console.log("🎉 Room is available - sending success response");
        res.json({
          available: true,
          requestedRoom,
          whatsappNumber,
          easypaisaNumber
        });
      } else {
        // Room not available, find alternatives
        console.log("❌ Room not available - finding alternatives");
        const allApartments = await storage.getApartments();
        const alternatives = [];

        for (const apartment of allApartments) {
          if (apartment.id !== requestedRoom.id) {
            const altAvailable = await storage.checkAvailability(
              apartment.id,
              checkIn,
              checkOut
            );
            if (altAvailable) {
              alternatives.push(apartment);
              console.log(`  ✅ Alternative found: Room ${apartment.roomNumber}`);
            }
          }
        }

        console.log(`🔄 Found ${alternatives.length} alternatives`);
        res.json({
          available: false,
          requestedRoom,
          alternatives: alternatives.slice(0, 5), // Limit to 5 alternatives
          whatsappNumber,
          easypaisaNumber
        });
      }
    } catch (error) {
      console.error("❌ Error checking availability:", error);
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // New endpoint for date-based room availability search (Admin and Affiliate access)
  app.get("/api/rooms-availability-by-date", async (req, res) => {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ message: "Date parameter is required (YYYY-MM-DD format)" });
      }

      // Validate date format
      const searchDate = new Date(date as string);
      if (isNaN(searchDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
      }

      // Get all apartments
      const allApartments = await storage.getApartments();

      // Check availability for each apartment on the specified date
      const roomsAvailability = [];

      // Define dateString outside the loop so it's available for the response
      const dateString = date as string;

      for (const apartment of allApartments) {
        // For a single date, we check if there's any booking that includes this date
        // We'll use the date as both check-in and check-out for the availability check
        const nextDay = new Date(searchDate);
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayString = nextDay.toISOString().split('T')[0];

        const isAvailable = await storage.checkAvailability(
          apartment.id,
          dateString,
          nextDayString
        );

        // Get any booking for this date to show details
        const bookings = await storage.getBookingsByApartment(apartment.id);
        const bookingForDate = bookings.find(booking => {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          return searchDate >= checkIn && searchDate < checkOut;
        });

        roomsAvailability.push({
          id: apartment.id,
          roomNumber: apartment.roomNumber,
          title: apartment.title,
          description: apartment.description,
          pricePerNight: apartment.price, // Fixed: use 'price' field from schema
          maxGuests: apartment.bedrooms * 2, // Estimate: 2 guests per bedroom
          amenities: apartment.amenities || [], // Handle null/undefined
          images: apartment.images || [apartment.imageUrl], // Handle null/undefined, fallback to main image
          isAvailable,
          booking: bookingForDate ? {
            id: bookingForDate.id,
            hostName: bookingForDate.hostName,
            checkIn: bookingForDate.checkIn,
            checkOut: bookingForDate.checkOut,
            status: bookingForDate.status,
            paymentStatus: bookingForDate.paymentStatus
          } : null
        });
      }

      // Sort by room number for consistent ordering
      roomsAvailability.sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));

      res.json({
        date: dateString,
        rooms: roomsAvailability,
        summary: {
          total: roomsAvailability.length,
          available: roomsAvailability.filter(room => room.isAvailable).length,
          booked: roomsAvailability.filter(room => !room.isAvailable).length
        }
      });
    } catch (error) {
      console.error("❌ Error fetching rooms availability by date:", error);
      res.status(500).json({ message: "Failed to fetch rooms availability" });
    }
  });

  // Initialize availability service
  const availabilityService = new AvailabilityService();

  // Enhanced Availability Routes

  // Enhanced calendar availability with check-in/check-out date range
  app.get("/api/enhanced-availability/calendar/:apartmentId", async (req, res) => {
    try {
      const apartmentId = parseInt(req.params.apartmentId);
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({ 
          message: "Start date and end date are required (YYYY-MM-DD format)" 
        });
      }

      const calendarData = await availabilityService.getCalendarAvailability(
        apartmentId,
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: calendarData,
        apartmentId,
        dateRange: {
          startDate: startDate as string,
          endDate: endDate as string
        }
      });
    } catch (error) {
      log.error("Enhanced calendar availability error", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch calendar availability" 
      });
    }
  });

  // Bulk availability check for multiple apartments
  app.post("/api/enhanced-availability/bulk", async (req, res) => {
    try {
      const { apartmentIds, checkIn, checkOut, includePendingReservations = true } = req.body;

      if (!apartmentIds || !Array.isArray(apartmentIds) || !checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: "apartmentIds (array), checkIn, and checkOut are required"
        });
      }

      const results = await availabilityService.checkBulkAvailability({
        apartmentIds,
        checkIn,
        checkOut,
        includePendingReservations
      });

      res.json({
        success: true,
        data: results,
        query: { apartmentIds, checkIn, checkOut }
      });
    } catch (error) {
      log.error("Bulk availability check error", error);
      res.status(500).json({
        success: false,
        message: "Failed to check bulk availability"
      });
    }
  });

  // Date range availability with available periods
  app.get("/api/enhanced-availability/date-range/:apartmentId", async (req, res) => {
    try {
      const apartmentId = parseInt(req.params.apartmentId);
      const { startDate, endDate, minStayDays } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "startDate and endDate are required (YYYY-MM-DD format)"
        });
      }

      const results = await availabilityService.getDateRangeAvailability({
        apartmentId,
        startDate: startDate as string,
        endDate: endDate as string,
        minStayDays: minStayDays ? parseInt(minStayDays as string) : undefined
      });

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      log.error("Date range availability error", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch date range availability"
      });
    }
  });

  // Create temporary reservation (hold)
  app.post("/api/enhanced-availability/reserve", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { apartmentId, checkIn, checkOut, holdMinutes = 45 } = req.body;

      if (!apartmentId || !checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: "apartmentId, checkIn, and checkOut are required"
        });
      }

      const reservation = await availabilityService.createReservation(
        user.id,
        apartmentId,
        checkIn,
        checkOut,
        holdMinutes
      );

      res.json({
        success: true,
        data: reservation,
        message: `Room reserved for ${holdMinutes} minutes`
      });
    } catch (error) {
      log.error("Create reservation error", error);
      if (error instanceof BookingNotAvailableError) {
        res.status(409).json({
          success: false,
          message: error.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to create reservation"
        });
      }
    }
  });

  // Release expired reservations (admin endpoint)
  app.post("/api/enhanced-availability/release-expired", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const releasedCount = await availabilityService.releaseExpiredReservations();

      res.json({
        success: true,
        data: {
          releasedCount,
          message: `Released ${releasedCount} expired reservations`
        }
      });
    } catch (error) {
      log.error("Release expired reservations error", error);
      res.status(500).json({
        success: false,
        message: "Failed to release expired reservations"
      });
    }
  });

  // Enhanced availability check with detailed information
  app.post("/api/enhanced-availability/check", async (req, res) => {
    try {
      const { apartmentId, checkIn, checkOut, excludeBookingId, includePendingReservations = true } = req.body;

      if (!apartmentId || !checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: "apartmentId, checkIn, and checkOut are required"
        });
      }

      const result = await availabilityService.checkAvailability({
        apartmentId,
        checkIn,
        checkOut,
        excludeBookingId,
        includePendingReservations
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      log.error("Enhanced availability check error", error);
      res.status(500).json({
        success: false,
        message: "Failed to check availability"
      });
    }
  });

  // Test route to verify API is working
  app.get("/api/test-room-search", (req, res) => {
    res.json({ message: "Room search API is working!", timestamp: new Date().toISOString() });
  });

  // Search available rooms by check-in and check-out dates
  app.get("/api/rooms/search-availability", async (req, res) => {
    try {
      const { checkIn, checkOut, guests } = req.query;

      // Validate required parameters
      if (!checkIn || !checkOut) {
        return res.status(400).json({
          success: false,
          message: "Check-in and check-out dates are required (YYYY-MM-DD format)"
        });
      }

      // Validate date format and logic
      const checkInDate = new Date(checkIn as string);
      const checkOutDate = new Date(checkOut as string);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD"
        });
      }

      if (checkInDate >= checkOutDate) {
        return res.status(400).json({
          success: false,
          message: "Check-out date must be after check-in date"
        });
      }

      // Check if dates are in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (checkInDate < today) {
        return res.status(400).json({
          success: false,
          message: "Check-in date cannot be in the past"
        });
      }

      // Calculate stay duration
      const stayDurationMs = checkOutDate.getTime() - checkInDate.getTime();
      const stayDurationDays = Math.ceil(stayDurationMs / (1000 * 60 * 60 * 24));

      // Get all apartments
      const allApartments = await storage.getApartments();

      if (allApartments.length === 0) {
        return res.json({
          success: true,
          data: {
            checkIn: checkIn as string,
            checkOut: checkOut as string,
            stayDuration: stayDurationDays,
            availableRooms: [],
            summary: {
              totalRooms: 0,
              availableRooms: 0,
              bookedRooms: 0
            }
          }
        });
      }

      // Check availability for all apartments using bulk availability check
      const apartmentIds = allApartments.map(apt => apt.id);
      const bulkAvailabilityResult = await availabilityService.checkBulkAvailability({
        apartmentIds,
        checkIn: checkIn as string,
        checkOut: checkOut as string,
        includePendingReservations: true
      });

      // Build available rooms response
      const availableRooms = [];
      const bookedRooms = [];
      
      // Parse guest count once outside the loop
      const guestCount = guests ? parseInt(guests as string) : 0;

      for (const apartment of allApartments) {
        const availability = bulkAvailabilityResult[apartment.id];
        
        // Calculate pricing
        let basePrice = apartment.price * stayDurationDays;
        let discountedPrice = basePrice;
        
        // Apply discount if available
        if (apartment.discountPercentage && apartment.discountPercentage > 0) {
          const discountAmount = (basePrice * apartment.discountPercentage) / 100;
          discountedPrice = basePrice - discountAmount;
        }

        // Estimate max guests (2 per bedroom is a reasonable assumption)
        const maxGuests = apartment.bedrooms * 2;

        // Filter by guest count if specified
        if (guestCount > 0 && guestCount > maxGuests) {
          continue; // Skip this room if it can't accommodate the requested guests
        }

        const roomData = {
          id: apartment.id,
          roomNumber: apartment.roomNumber,
          title: apartment.title,
          description: apartment.description,
          bedrooms: apartment.bedrooms,
          bathrooms: apartment.bathrooms,
          squareFeet: apartment.squareFeet,
          maxGuests,
          pricePerNight: apartment.price,
          totalPrice: discountedPrice,
          originalPrice: basePrice,
          discountPercentage: apartment.discountPercentage || 0,
          savings: basePrice - discountedPrice,
          amenities: apartment.amenities || [],
          images: apartment.images || [apartment.imageUrl],
          mainImage: apartment.imageUrl,
          isAvailable: availability.isAvailable,
          stayDuration: stayDurationDays
        };

        if (availability.isAvailable) {
          availableRooms.push(roomData);
        } else {
          bookedRooms.push({
            ...roomData,
            unavailableReason: availability.reason,
            availableFrom: availability.availableFrom,
            availableUntil: availability.availableUntil,
            conflictingBookings: availability.conflictingBookings?.length || 0,
            conflictingReservations: availability.conflictingReservations?.length || 0
          });
        }
      }

      // Sort available rooms by price (lowest first)
      availableRooms.sort((a, b) => a.totalPrice - b.totalPrice);

      // Sort booked rooms by room number
      bookedRooms.sort((a, b) => Number(a.roomNumber) - Number(b.roomNumber));

      res.json({
        success: true,
        data: {
          checkIn: checkIn as string,
          checkOut: checkOut as string,
          stayDuration: stayDurationDays,
          requestedGuests: guestCount || null,
          availableRooms,
          bookedRooms,
          summary: {
            totalRooms: allApartments.length,
            availableRooms: availableRooms.length,
            bookedRooms: bookedRooms.length,
            averagePricePerNight: availableRooms.length > 0 
              ? Math.round(availableRooms.reduce((sum, room) => sum + room.pricePerNight, 0) / availableRooms.length)
              : 0,
            priceRange: availableRooms.length > 0 
              ? {
                  min: Math.min(...availableRooms.map(room => room.totalPrice)),
                  max: Math.max(...availableRooms.map(room => room.totalPrice))
                }
              : null
          }
        }
      });

    } catch (error) {
      log.error("Room availability search error", error);
      res.status(500).json({
        success: false,
        message: "Failed to search room availability"
      });
    }
  });

  // Booking Request endpoints
  app.get("/api/booking-requests", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Admin can see all requests, users can only see their own
      const userIsAdmin = isAdmin(user.role as any);

      let requests;
      if (userIsAdmin) {
        requests = await storage.getBookingRequests();
      } else {
        requests = await storage.getBookingRequestsByUser(user.id);
      }

      // Enrich with apartment and user details
      const apartments = await storage.getApartments();
      const users = await storage.getUsers();

      // Get affiliate metrics and earnings for attribution
      const allMetrics = await storage.getAffiliateMetrics();
      const allEarnings = await storage.getAffiliateEarnings();

      const enrichedRequests = await Promise.all(requests.map(async request => {
        const apartment = apartments.find(apt => apt.id === request.apartmentId);
        const requestUser = users.find(u => u.id === request.userId);

        // Calculate total amount based on room price and duration
        let totalAmount = null;
        if (apartment && request.checkIn && request.checkOut) {
          const checkInDate = new Date(request.checkIn);
          const checkOutDate = new Date(request.checkOut);
          const durationMs = checkOutDate.getTime() - checkInDate.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);
          const durationDays = durationHours / 24;

          if (durationHours <= 12) {
            // For 12 hours or less, charge 50% of nightly rate
            totalAmount = Math.round(apartment.price * 0.5);
          } else {
            // For more than 12 hours, charge proportionally
            totalAmount = Math.round(apartment.price * durationDays);
          }
        }

        // Check for affiliate attribution
        let affiliateInfo = undefined;

        // First, check if this user came through an affiliate link by looking for registration metrics
        const registrationMetric = allMetrics.find(m =>
          m.eventType === 'registration' &&
          m.customerId === request.userId
        );

        if (registrationMetric && registrationMetric.affiliateId) {
          const affiliate = users.find(u => u.id === registrationMetric.affiliateId);
          if (affiliate) {
            // Calculate potential commission using affiliate's individual commission rate
            const commissionRate = (affiliate.commissionRate || 10) / 100; // Convert percentage to decimal
            const potentialCommission = totalAmount ? Math.round(totalAmount * commissionRate) : 0;

            // Check if commission has already been created for this booking
            const existingEarning = allEarnings.find(e => e.bookingId === request.id);
            const commissionAmount = existingEarning ? existingEarning.commissionAmount : potentialCommission;
            const commissionStatus = existingEarning ? existingEarning.status : 'pending';

            // Get the affiliate link information
            const affiliateLink = await storage.getAffiliateLink(registrationMetric.linkId || 0);
            const linkCode = affiliateLink ? affiliateLink.linkCode : 'Unknown';

            affiliateInfo = {
              affiliateId: registrationMetric.affiliateId,
              affiliateName: `${affiliate.firstName} ${affiliate.lastName}`,
              affiliateEmail: affiliate.email,
              commissionAmount,
              commissionStatus,
              linkCode: `${linkCode}`,
              linkId: registrationMetric.linkId,
              attributionSource: 'registration'
            };
          }
        } else {
          // Check for booking-specific affiliate metrics (for session-based attribution)
          const bookingMetric = allMetrics.find(m =>
            m.eventType === 'booking' &&
            m.bookingRequestId === request.id
          );

          if (bookingMetric && bookingMetric.affiliateId) {
            const affiliate = users.find(u => u.id === bookingMetric.affiliateId);
            if (affiliate) {
              // Check if commission has already been created for this booking
              const existingEarning = allEarnings.find(e => e.bookingId === request.id);
              const commissionAmount = existingEarning ? existingEarning.commissionAmount : 0;
              const commissionStatus = existingEarning ? existingEarning.status : 'pending';

              // Get the affiliate link information
              const affiliateLink = await storage.getAffiliateLink(bookingMetric.linkId || 0);
              const linkCode = affiliateLink ? affiliateLink.linkCode : 'Unknown';

              affiliateInfo = {
                affiliateId: bookingMetric.affiliateId,
                affiliateName: `${affiliate.firstName} ${affiliate.lastName}`,
                affiliateEmail: affiliate.email,
                commissionAmount,
                commissionStatus,
                linkCode: `${linkCode}`,
                linkId: bookingMetric.linkId,
                attributionSource: 'session'
              };
            }
          }
        }

        return {
          ...request,
          totalAmount,
          apartment: apartment ? {
            id: apartment.id,
            roomNumber: apartment.roomNumber,
            title: apartment.title,
            price: apartment.price
          } : null,
          user: requestUser ? {
            id: requestUser.id,
            firstName: requestUser.firstName,
            lastName: requestUser.lastName,
            email: requestUser.email,
            phone: requestUser.phone || 'N/A',
            cnic: requestUser.cnic || 'N/A',
            address: requestUser.address || 'N/A'
          } : {
            id: 'unknown',
            firstName: 'Unknown',
            lastName: 'User',
            email: 'N/A',
            phone: 'N/A',
            cnic: 'N/A',
            address: 'N/A'
          },
          affiliateInfo
        };
      }));

      res.json(enrichedRequests);
    } catch (error) {
      console.error('Error fetching booking requests:', error);
      res.status(500).json({ message: "Failed to fetch booking requests" });
    }
  });

  app.post("/api/booking-requests", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      // Check if user has completed two-step verification
      if (!user.isEmailVerified || !user.isPhoneVerified) {
        return res.status(400).json({
          message: "Two-step verification required",
          requiresVerification: true
        });
      }

      // Check for affiliate reference - prioritize URL parameter over cookie
      const affiliateRef = req.query.ref || req.cookies?.affiliate_ref;
      let affiliateInfo = null;

      if (affiliateRef) {
        try {
          // Get the affiliate link
          const link = await storage.getAffiliateLinkByCode(affiliateRef as string);
          
          if (link && link.isActive) {
            // Check if link has expired
            if (!link.expiresAt || new Date() <= new Date(link.expiresAt)) {
              // Get affiliate user info
              const affiliateUser = await storage.getUser(link.affiliateId);
              if (affiliateUser) {
                affiliateInfo = {
                  affiliateId: link.affiliateId,
                  affiliateName: `${affiliateUser.firstName} ${affiliateUser.lastName}`,
                  linkId: link.id,
                  linkCode: link.linkCode
                };
                log.info('Affiliate info captured for booking request', { 
                  affiliateRef, 
                  affiliateId: affiliateInfo.affiliateId,
                  affiliateName: affiliateInfo.affiliateName 
                });
              }
            }
          }
        } catch (error) {
          log.error('Error processing affiliate reference during booking request', error);
          // Continue without affiliate info if there's an error
        }
      }

      const requestData = {
        ...req.body,
        userId: user.id,
        // Add affiliate information if available
        ...(affiliateInfo && {
          affiliateId: affiliateInfo.affiliateId,
          affiliateName: affiliateInfo.affiliateName
        })
      };

      console.log('📝 Creating booking request for user:', requestData.userId);
      console.log('📝 Request data:', JSON.stringify(requestData, null, 2));
      if (affiliateInfo) {
        console.log('🔗 Affiliate info captured:', affiliateInfo);
      }

      // Use BookingService instead of direct storage call to ensure availability checking
      const { BookingService } = await import('./services/booking.service.js');
      const bookingService = new BookingService();
      
      const bookingRequest = await bookingService.createBookingRequest(requestData, user.id);

      // Create affiliate metric for booking request tracking if affiliate info exists
      if (affiliateInfo) {
        try {
          await storage.createAffiliateMetric({
            affiliateId: affiliateInfo.affiliateId,
            linkId: affiliateInfo.linkId,
            customerId: user.id,
            bookingRequestId: bookingRequest.id,
            apartmentId: bookingRequest.apartmentId,
            eventType: 'booking_request',
            eventData: JSON.stringify({
              bookingRequestId: bookingRequest.id,
              apartmentId: bookingRequest.apartmentId,
              checkIn: bookingRequest.checkIn,
              checkOut: bookingRequest.checkOut,
              timestamp: new Date()
            })
          });
          log.info('Affiliate metric created for booking request', { 
            bookingRequestId: bookingRequest.id,
            affiliateId: affiliateInfo.affiliateId 
          });
        } catch (error) {
          log.error('Error creating affiliate metric for booking request', error);
          // Continue even if metric creation fails
        }
      }

      // Emit real-time update to admin dashboard
      emitBookingRequestCreated(bookingRequest);

      res.json(bookingRequest);
    } catch (error) {
      // Handle BookingNotAvailableError specifically
      if (error instanceof BookingNotAvailableError) {
        return res.status(409).json({ 
          message: error.message,
          error: "ROOM_NOT_AVAILABLE",
          details: "The selected room is not available for the requested dates. Please choose different dates or contact us for alternatives."
        });
      }
      
      if (error instanceof z.ZodError) {
        console.error('❌ Validation errors:', error.errors);
        console.error('❌ Request data that failed validation:', JSON.stringify(req.body, null, 2));

        // Create a more user-friendly error message
        const errorMessages = error.errors.map(err => {
          if (err.path.length > 0) {
            return `${err.path.join('.')}: ${err.message}`;
          }
          return err.message;
        });

        return res.status(400).json({
          message: "Invalid booking request data",
          errors: error.errors,
          details: errorMessages
        });
      }
      console.error('Error creating booking request:', error);
      res.status(500).json({ message: "Failed to create booking request" });
    }
  });

  app.put("/api/booking-requests/:id", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const id = parseInt(req.params.id);
      const existingRequest = await storage.getBookingRequest(id);

      if (!existingRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      // Check if user owns this request or is admin
      const userIsAdmin = isAdmin(user.role as any);
      if (!userIsAdmin && existingRequest.userId !== user.id) {
        return res.status(403).json({ message: "You can only update your own booking requests" });
      }

      const updatedRequest = await storage.updateBookingRequest(id, req.body);
      if (!updatedRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error('Error updating booking request:', error);
      res.status(500).json({ message: "Failed to update booking request" });
    }
  });

  app.delete("/api/booking-requests/:id", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const id = parseInt(req.params.id);
      const existingRequest = await storage.getBookingRequest(id);

      if (!existingRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      // Check if user owns this request or is admin
      const userIsAdmin = isAdmin(user.role as any);
      if (!userIsAdmin && existingRequest.userId !== user.id) {
        return res.status(403).json({ message: "You can only delete your own booking requests" });
      }

      const deleted = await storage.deleteBookingRequest(id);
      if (!deleted) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      res.json({ message: "Booking request deleted successfully" });
    } catch (error) {
      console.error('Error deleting booking request:', error);
      res.status(500).json({ message: "Failed to delete booking request" });
    }
  });

  // Update booking request status (Admin only)
  app.put("/api/booking-requests/:id/status", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, adminNotes } = req.body;

      if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const existingRequest = await storage.getBookingRequest(id);
      if (!existingRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      const updatedRequest = await storage.updateBookingRequest(id, {
        status,
        adminNotes: adminNotes || existingRequest.adminNotes
      });

      if (!updatedRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      // Emit real-time update
      emitBookingRequestUpdated(updatedRequest);

      res.json({ message: "Booking request status updated successfully", bookingRequest: updatedRequest });
    } catch (error) {
      console.error('Error updating booking request status:', error);
      res.status(500).json({ message: "Failed to update booking request status" });
    }
  });

  // Confirm payment for booking request (Admin only)
  app.put("/api/booking-requests/:id/confirm-payment", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      const existingRequest = await storage.getBookingRequest(id);
      if (!existingRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      const updatedRequest = await storage.updateBookingRequest(id, {
        paymentReceived: true,
        status: 'confirmed',
        confirmedAt: new Date()
      });

      if (!updatedRequest) {
        return res.status(404).json({ message: "Booking request not found" });
      }

      // Send booking confirmation email
      try {
        const { emailNotificationService } = await import('./services/email-notification.service.js');

        // Fetch the user object using userId
        const requestUser = await storage.getUser(updatedRequest.userId);
        const customerName = requestUser ? `${requestUser.firstName} ${requestUser.lastName}` : 'Valued Customer';

        // Calculate totalAmount based on room price and duration
        const apartments = await storage.getApartments();
        const apartment = apartments.find(apt => apt.id === updatedRequest.apartmentId);
        let totalAmount = 0;
        if (apartment && updatedRequest.checkIn && updatedRequest.checkOut) {
          const checkInDate = new Date(updatedRequest.checkIn);
          const checkOutDate = new Date(updatedRequest.checkOut);
          const durationMs = checkOutDate.getTime() - checkInDate.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);

          if (durationHours <= 12) {
            totalAmount = Math.round(apartment.price * 0.5);
          } else {
            const durationDays = durationHours / 24;
            totalAmount = Math.round(apartment.price * durationDays);
          }
        }

        const emailSuccess = await emailNotificationService.sendBookingConfirmation({
          customerName,
          customerEmail: requestUser?.email || '',
          roomNumber: updatedRequest.roomNumber,
          checkIn: updatedRequest.checkIn.toISOString(),
          checkOut: updatedRequest.checkOut.toISOString(),
          guests: updatedRequest.guestCount || 1,
          totalAmount,
          bookingId: `BR-${updatedRequest.id}`,
          specialRequests: (updatedRequest as any).specialRequests || ''
        });

        if (emailSuccess) {
          console.log(`✅ Booking confirmation email sent to: ${requestUser?.email}`);
        } else {
          console.warn(`⚠️ Failed to send booking confirmation email to: ${requestUser?.email}`);
        }
      } catch (emailError) {
        console.error('❌ Error sending booking confirmation email:', emailError);
        // Don't fail the payment confirmation if email fails
      }

      // Create a booking in the calendar when payment is confirmed
      try {
        // Get the user who made the booking request
        const requestUser = await storage.getUser(updatedRequest.userId);

        // Calculate total amount based on room price and duration
        const apartments = await storage.getApartments();
        const apartment = apartments.find(apt => apt.id === updatedRequest.apartmentId);
        let totalAmount = 0;

        if (apartment && updatedRequest.checkIn && updatedRequest.checkOut) {
          const checkInDate = new Date(updatedRequest.checkIn);
          const checkOutDate = new Date(updatedRequest.checkOut);
          const durationMs = checkOutDate.getTime() - checkInDate.getTime();
          const durationHours = durationMs / (1000 * 60 * 60);

          if (durationHours <= 12) {
            totalAmount = Math.round(apartment.price * 0.5);
          } else {
            const durationDays = durationHours / 24;
            totalAmount = Math.round(apartment.price * durationDays);
          }
        }

        // Create or find customer record for the user
        let customer;
        if (requestUser) {
          // Try to find existing customer by phone
          customer = await storage.getCustomerByPhone(requestUser.phone || '');
          if (!customer) {
            // Create new customer from user data
            customer = await storage.createCustomer({
              name: `${requestUser.firstName || ''} ${requestUser.lastName || ''}`.trim() || 'Unknown User',
              phone: requestUser.phone || 'N/A',
              cnic: requestUser.cnic || 'N/A'
            });
            console.log(`✅ Created customer record for user ${requestUser.id}`);
          }
        } else {
          // Fallback to default customer if user not found
          customer = { id: 1 };
        }

        const bookingData = {
          apartmentId: updatedRequest.apartmentId,
          customerId: customer.id, // Use the actual customer ID
          checkIn: updatedRequest.checkIn.toISOString().split('T')[0],
          checkOut: updatedRequest.checkOut.toISOString().split('T')[0],
          status: 'booked',
          paymentStatus: 'paid',
          hostName: 'web', // Always show "web" as host
          totalAmount,
          affiliateId: updatedRequest.affiliateId || null, // Use affiliate info from booking request
          affiliateName: updatedRequest.affiliateName || null, // Use affiliate info from booking request
          notes: `Booking confirmed from request #${id}. Guest count: ${updatedRequest.guestCount || 1}. User: ${requestUser?.firstName || ''} ${requestUser?.lastName || ''}${updatedRequest.affiliateId ? ` (Affiliate: ${updatedRequest.affiliateName})` : ''}`
        };

        await storage.createBooking(bookingData);
        console.log(`✅ Booking created in calendar for request #${id}`);

        // NEW: Track affiliate commission if booking came through affiliate link
        try {
          let affiliateInfo = null;

          // First priority: Check if affiliate info was captured during booking request creation
          if (updatedRequest.affiliateId) {
            // Find the affiliate link to get linkId
            const allAffiliateMetrics = await storage.getAffiliateMetrics();
            const bookingRequestMetric = allAffiliateMetrics.find(m => 
              m.eventType === 'booking_request' && 
              m.bookingRequestId === updatedRequest.id &&
              m.affiliateId === updatedRequest.affiliateId
            );

            affiliateInfo = {
              affiliateId: updatedRequest.affiliateId,
              linkId: bookingRequestMetric?.linkId || null,
              source: 'booking_request'
            };
            
            log.info('Affiliate info found from booking request', { 
              affiliateId: affiliateInfo.affiliateId,
              bookingRequestId: updatedRequest.id 
            });
          } else {
            // Fallback: Check if this user came through an affiliate link by looking for registration metrics
            const allAffiliateMetrics = await storage.getAffiliateMetrics();
            const registrationMetric = allAffiliateMetrics.find(m => m.eventType === 'registration' && m.customerId === updatedRequest.userId);

            if (registrationMetric && registrationMetric.affiliateId) {
              affiliateInfo = {
                affiliateId: registrationMetric.affiliateId,
                linkId: registrationMetric.linkId,
                source: 'registration'
              };
            } else {
              // If no registration metric found, check if there's an active affiliate session
              // This handles cases where existing users book through affiliate links
              const affiliateRef = req.cookies?.affiliate_ref;
              if (affiliateRef) {
                const link = await storage.getAffiliateLinkByCode(affiliateRef);
                if (link && link.isActive && (!link.expiresAt || new Date() <= new Date(link.expiresAt))) {
                  affiliateInfo = {
                    affiliateId: link.affiliateId,
                    linkId: link.id,
                    source: 'session'
                  };

                  // Create a click metric for this booking attribution
                  await storage.createAffiliateMetric({
                    affiliateId: link.affiliateId,
                    linkId: link.id,
                    customerId: updatedRequest.userId,
                    eventType: 'click',
                    eventData: JSON.stringify({
                      source: 'booking_attribution',
                      timestamp: new Date()
                    })
                  });
                }
              }
            }
          }

          if (affiliateInfo) {
            // Get affiliate user data to fetch their individual commission rate
            const affiliateUser = await db.select().from(users).where(eq(users.id, affiliateInfo.affiliateId)).limit(1);
            const affiliate = affiliateUser[0];
            const individualCommissionRate = affiliate?.commissionRate || 10;
            
            // Calculate commission using affiliate's individual commission rate
            const commissionAmount = Math.round(totalAmount * (individualCommissionRate / 100));

            // Create affiliate earning record
            await storage.createAffiliateEarning({
              affiliateId: affiliateInfo.affiliateId,
              bookingId: updatedRequest.id,
              userId: updatedRequest.userId,
              commissionAmount,
              commissionRate: individualCommissionRate,
              baseAmount: totalAmount,
              status: 'pending'
            });

            // Create affiliate metric for booking tracking
            await storage.createAffiliateMetric({
              affiliateId: affiliateInfo.affiliateId,
              linkId: affiliateInfo.linkId,
              customerId: updatedRequest.userId,
              bookingRequestId: updatedRequest.id,
              apartmentId: updatedRequest.apartmentId,
              basePrice: totalAmount,
              finalPrice: totalAmount, // No price adjustment in new system
              affiliateEarning: commissionAmount,
              commissionRate: 10,
              eventType: 'booking',
              eventData: JSON.stringify({
                bookingId: updatedRequest.id,
                commissionAmount,
                bookingDate: new Date(),
                attributionSource: affiliateInfo.source
              })
            });

            console.log(`✅ Affiliate commission tracked: ${commissionAmount} PKR for affiliate ${affiliateInfo.affiliateId} (source: ${affiliateInfo.source})`);
          }
        } catch (affiliateError) {
          console.error('Error tracking affiliate commission:', affiliateError);
          // Don't fail the booking confirmation if affiliate tracking fails
        }
      } catch (calendarError) {
        console.error('Error creating calendar booking:', calendarError);
        // Don't fail the payment confirmation if calendar creation fails
      }

      // Emit real-time update
      emitBookingRequestUpdated(updatedRequest);

      res.json({ message: "Payment confirmed successfully and booking added to calendar", bookingRequest: updatedRequest });
    } catch (error) {
      console.error('Error confirming payment:', error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  // Reviews endpoints
  app.get("/api/reviews", async (req, res) => {
    try {
      const apartmentId = req.query.apartmentId ? parseInt(req.query.apartmentId as string) : undefined;

      if (apartmentId) {
        const reviews = await storage.getReviewsByApartment(apartmentId);
        res.json(reviews);
      } else {
        const reviews = await storage.getReviews();
        res.json(reviews);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Create review (requires authentication)
  app.post("/api/reviews", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const reviewData = insertReviewSchema.parse(req.body);

      // Associate review with authenticated user
      const reviewWithUser = {
        ...reviewData,
        userId: user.id,
        customerName: reviewData.customerName || `${user.firstName} ${user.lastName}`.trim(),
        imageUrl: reviewData.imageUrl || user.profileImageUrl
      };

      const review = await storage.createReview(reviewWithUser);

      // Emit real-time update to all clients viewing this apartment
      if (review.apartmentId) {
        io.to(`apartment-${review.apartmentId}`).emit('new-review', review);
      }

      // Emit global review update for home page testimonials
      io.emit('global-review-update', review);

      res.json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Update review
  app.put("/api/reviews/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const reviewData = insertReviewSchema.parse(req.body);
      const review = await storage.updateReview(id, reviewData);

      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      res.json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // Delete review (requires authentication and ownership)
  app.delete("/api/reviews/:id", authenticateToken, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const id = parseInt(req.params.id);

      // Get the review to check ownership
      const review = await storage.getReview(id);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Check if user owns this review or is admin
      const userIsAdmin = isAdmin(user.role as any);
      if (!userIsAdmin && review.userId !== user.id) {
        return res.status(403).json({ message: "You can only delete your own reviews" });
      }

      const deleted = await storage.deleteReview(id);

      if (!deleted) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Emit real-time update for review deletion
      if (review.apartmentId) {
        io.to(`apartment-${review.apartmentId}`).emit('review-deleted', { reviewId: id });
      }
      io.emit('global-review-deleted', { reviewId: id });

      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Customer endpoints
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.post("/api/customers/:id/verify", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { pin } = req.body;

      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (customer.verificationPin === pin) {
        const updatedCustomer = await storage.updateCustomer(id, { isVerified: true });
        res.json({ verified: true, customer: updatedCustomer });
      } else {
        res.json({ verified: false, message: "Invalid PIN" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to verify customer" });
    }
  });

  app.post("/api/customers/:id/send-pin", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      const updatedCustomer = await storage.updateCustomer(id, { verificationPin: pin });

      if (!updatedCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // In a real app, you would send the PIN via SMS
      console.log(`Sending PIN ${pin} to customer ${id}`);

      res.json({ message: "PIN sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send PIN" });
    }
  });

  // Database Admin endpoints (Admin only)
  app.get("/api/admin/database/stats", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      // Get counts for all tables
      const apartments = await storage.getApartments();
      const users = await storage.getUsers();
      const bookingRequests = await storage.getBookingRequests();
      const reviews = await storage.getReviews();

      // Get affiliate applications count
      const affiliateApplicationsResult = await db.select().from(affiliateApplications);

      const stats = {
        apartments: apartments.length,
        users: users.length,
        bookingRequests: bookingRequests.length,
        reviews: reviews.length,
        affiliateApplications: affiliateApplicationsResult.length
      };

      res.json(stats);
    } catch (error) {
      console.error("Failed to fetch database stats:", error);
      res.status(500).json({ message: "Failed to fetch database stats" });
    }
  });

  app.get("/api/admin/database/:table", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { table } = req.params;
      let data;

      switch (table) {
        case 'apartments':
          data = await storage.getApartments();
          break;
        case 'users':
          const rawUsers = await storage.getUsers();
          // Map users to include computed isVerified field for frontend compatibility
          data = rawUsers.map(user => ({
            ...user,
            isVerified: user.isEmailVerified && user.isPhoneVerified
          }));
          break;
        case 'bookingRequests':
          data = await storage.getBookingRequests();
          break;
        case 'reviews':
          data = await storage.getReviews();
          break;
        case 'affiliateApplications':
          data = await db.select().from(affiliateApplications).orderBy(desc(affiliateApplications.createdAt));
          break;
        default:
          return res.status(400).json({ message: "Invalid table name" });
      }

      res.json({ [table]: data });
    } catch (error) {
      console.error(`Failed to fetch ${req.params.table} data:`, error);
      res.status(500).json({ message: `Failed to fetch ${req.params.table} data` });
    }
  });

  // Chatbot Analytics API
  app.get("/api/admin/chatbot-analytics", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { range = '24h' } = req.query;

      // Calculate time range
      const now = new Date();
      let startDate: Date;

      switch (range) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default: // 24h
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Mock analytics data - in production, this would query the database
      const mockMetrics = {
        totalConversations: Math.floor(Math.random() * 1000) + 500,
        activeConversations: Math.floor(Math.random() * 50) + 10,
        averageResponseTime: Math.random() * 2 + 0.5,
        userSatisfactionScore: Math.random() * 1.5 + 3.5,
        bookingConversionRate: Math.random() * 10 + 15,
        topIntents: [
          { intent: 'booking_inquiry', count: 150, percentage: 35 },
          { intent: 'pricing_inquiry', count: 100, percentage: 25 },
          { intent: 'room_selection', count: 80, percentage: 20 },
          { intent: 'contact_inquiry', count: 50, percentage: 12 },
          { intent: 'greeting', count: 30, percentage: 8 }
        ],
        sentimentAnalysis: {
          positive: Math.floor(Math.random() * 200) + 300,
          negative: Math.floor(Math.random() * 50) + 20,
          neutral: Math.floor(Math.random() * 150) + 100,
          urgent: Math.floor(Math.random() * 30) + 10
        },
        hourlyActivity: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          conversations: Math.floor(Math.random() * 50) + 5
        })),
        recentConversations: [
          {
            id: '1',
            sessionId: 'sess_123',
            userMessage: 'I want to book room 714 for this weekend',
            botResponse: 'Great choice! Room 714 is our luxury suite. Let me check availability for this weekend.',
            intent: 'booking_inquiry',
            sentiment: 'positive',
            timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            satisfaction: 5
          },
          {
            id: '2',
            sessionId: 'sess_124',
            userMessage: 'What are your prices?',
            botResponse: 'Our rooms range from PKR 100-200 per night. Would you like to see specific pricing for each room?',
            intent: 'pricing_inquiry',
            sentiment: 'neutral',
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            sessionId: 'sess_125',
            userMessage: 'URGENT! Need a room tonight!',
            botResponse: 'I understand this is urgent! Let me check immediate availability and connect you with our team.',
            intent: 'booking_inquiry',
            sentiment: 'urgent',
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            satisfaction: 4
          }
        ]
      };

      res.json(mockMetrics);
    } catch (error) {
      log.error('Chatbot analytics error:', error);
      res.status(500).json({ message: "Failed to fetch chatbot analytics" });
    }
  });

  // Admin Users endpoints
  app.get("/api/admin/users", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Map users to include computed isVerified field for frontend compatibility
      const usersWithVerificationStatus = users.map(user => ({
        ...user,
        isVerified: user.isEmailVerified && user.isPhoneVerified
      }));
      res.json(usersWithVerificationStatus);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get users with optional role filtering (Admin only)
  app.get("/api/users", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { role } = req.query;
      const users = await storage.getUsers();
      
      // Map users to include computed isVerified field for frontend compatibility
      let usersWithVerificationStatus = users.map(user => ({
        ...user,
        isVerified: user.isEmailVerified && user.isPhoneVerified
      }));

      // Filter by role if specified
      if (role) {
        usersWithVerificationStatus = usersWithVerificationStatus.filter(user => user.role === role);
      }

      res.json(usersWithVerificationStatus);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put("/api/admin/users/:userId/role", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['customer', 'affiliate', 'admin', 'super_admin'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Update user role in database
      const updatedUser = await db.update(users)
        .set({ role, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (updatedUser.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User role updated successfully", user: updatedUser[0] });
    } catch (error) {
      console.error("Failed to update user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.delete("/api/admin/users/:userId", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { userId } = req.params;

      // Prevent deletion of super admin users
      const userToDelete = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (userToDelete.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      if (userToDelete[0].role === 'super_admin') {
        return res.status(403).json({ message: "Cannot delete super admin users" });
      }

      // Delete user from database
      const deletedUser = await db.delete(users)
        .where(eq(users.id, userId))
        .returning();

      if (deletedUser.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Failed to delete user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/database/users", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const users = await storage.getUsers();
      // Map users to include computed isVerified field for frontend compatibility
      const usersWithVerificationStatus = users.map(user => ({
        ...user,
        isVerified: user.isEmailVerified && user.isPhoneVerified
      }));
      res.json(usersWithVerificationStatus);
    } catch (error) {
      console.error("Failed to fetch users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Chat session endpoints
  app.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = Math.random().toString(36).substring(7);
      const session = await storage.createChatSession({
        sessionId,
        currentStep: 0,
        data: JSON.stringify({}),
        customerId: null
      });

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/session/:sessionId", async (req, res) => {
    try {
      const session = await storage.getChatSession(req.params.sessionId);

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  app.put("/api/chat/session/:sessionId", async (req, res) => {
    try {
      const { currentStep, data, customerId } = req.body;
      const session = await storage.updateChatSession(req.params.sessionId, {
        currentStep,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        customerId
      });

      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chat session" });
    }
  });

  // Chatbot availability check endpoint
  app.post("/api/chat/availability", async (req, res) => {
    try {
      const { checkIn, checkOut, roomNumber, guestCount } = req.body;

      const { ChatbotAvailabilityService } = await import('./chatbot-availability-service.js');

      const result = await ChatbotAvailabilityService.checkAvailability({
        checkIn,
        checkOut,
        roomNumber,
        guestCount
      });

      res.json(result);
    } catch (error) {
      log.error('Chatbot availability check failed', { error: (error instanceof Error ? error.message : String(error)) });
      res.status(500).json({
        available: false,
        message: "I'm having trouble checking availability right now. Please contact us directly at 0311-5197087 for immediate assistance.",
        quickActions: ['open_whatsapp', 'contact_support']
      });
    }
  });

  // Email notification endpoints
  app.post("/api/email/availability-confirmation", authenticateToken, async (req, res) => {
    try {
      const { customerName, customerEmail, roomNumber, checkIn, checkOut, guests, availableRooms } = req.body;

      if (!customerName || !customerEmail || !checkIn || !checkOut || !guests) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const { emailNotificationService } = await import('./services/email-notification.service.js');

      const success = await emailNotificationService.sendAvailabilityConfirmation({
        customerName,
        customerEmail,
        roomNumber,
        checkIn,
        checkOut,
        guests,
        availableRooms
      });

      if (success) {
        res.json({ message: "Availability confirmation email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send availability confirmation email" });
      }
    } catch (error) {
      log.error('Failed to send availability confirmation email', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ message: "Failed to send availability confirmation email" });
    }
  });

  app.post("/api/email/booking-confirmation", authenticateToken, requireRole('admin'), async (req, res) => {
    try {
      const { customerName, customerEmail, roomNumber, checkIn, checkOut, guests, totalAmount, bookingId, specialRequests } = req.body;

      if (!customerName || !customerEmail || !roomNumber || !checkIn || !checkOut || !guests || !totalAmount) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const { emailNotificationService } = await import('./services/email-notification.service.js');

      const success = await emailNotificationService.sendBookingConfirmation({
        customerName,
        customerEmail,
        roomNumber,
        checkIn,
        checkOut,
        guests,
        totalAmount,
        bookingId,
        specialRequests
      });

      if (success) {
        res.json({ message: "Booking confirmation email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send booking confirmation email" });
      }
    } catch (error) {
      log.error('Failed to send booking confirmation email', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ message: "Failed to send booking confirmation email" });
    }
  });

  // Reservation management endpoints
  app.get("/api/reservations/active", async (req, res) => {
    try {
      const apartmentId = req.query.apartmentId ? parseInt(req.query.apartmentId as string) : null;
      
      if (apartmentId) {
        // Get active reservations for specific apartment
        const activeReservations = await storage.getActiveReservationsByApartment(apartmentId);
        res.json(activeReservations);
      } else {
        // Get all active reservations
        const activeReservations = await storage.getActiveReservations();
        res.json(activeReservations);
      }
    } catch (error) {
      log.error('Failed to get active reservations', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ message: "Failed to get active reservations" });
    }
  });

  app.post("/api/reservations/create", authenticateToken, async (req, res) => {
    try {
      const { apartmentId, checkIn, checkOut } = req.body;
      const userId = req.user?.id;

      if (!apartmentId || !checkIn || !checkOut || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create 45-minute reservation
      const expiresAt = new Date(Date.now() + 45 * 60 * 1000); // 45 minutes from now

      const reservation = await storage.createReservation({
        apartmentId,
        userId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        expiresAt,
        status: 'active'
      });

      res.json(reservation);
    } catch (error) {
      log.error('Failed to create reservation', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ message: "Failed to create reservation" });
    }
  });

  app.delete("/api/reservations/:id", authenticateToken, async (req, res) => {
    try {
      const reservationId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const success = await storage.cancelReservation(reservationId, userId);

      if (success) {
        res.json({ message: "Reservation cancelled successfully" });
      } else {
        res.status(404).json({ message: "Reservation not found or not authorized" });
      }
    } catch (error) {
      log.error('Failed to cancel reservation', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ message: "Failed to cancel reservation" });
    }
  });

  // Enhanced AI Chat endpoint with advanced features
  app.post("/api/chat/ai", async (req, res) => {
    try {
      const {
        sessionId,
        message,
        availabilityData,
        bookingData,
        affiliateCode,
        conversationContext,
        userPreferences,
        userInfo
      } = req.body;

      if (!sessionId || !message) {
        return res.status(400).json({ message: "Session ID and message are required" });
      }

      // Try Enhanced AI Service first
      try {
        const { EnhancedAIService } = await import('./services/enhanced-ai.service');

        const result = await EnhancedAIService.processMessage(
          sessionId,
          message,
          userInfo?.id,
          {
            availabilityData,
            bookingData,
            affiliateCode,
            conversationContext,
            userPreferences,
            userInfo
          }
        );

        // Enhanced response format
        const enhancedResult = {
          response: result.response,
          type: result.bookingData?.type || (result.bookingData ? 'booking_summary' : 'text'),
          data: result.bookingData,
          quickActions: result.quickActions || ['open_whatsapp', 'check_availability', 'pricing'],
          intent: 'processed',
          sentiment: 'neutral',
          confidence: 0.9,
          context: {
            sessionId,
            timestamp: new Date().toISOString(),
            messageCount: 1
          },
          userPreferences: userPreferences || {}
        };

        res.json(enhancedResult);
        return;
      } catch (enhancedAIError) {
        if (enhancedAIError instanceof Error) {
          log.error('Enhanced AI service error', { error: enhancedAIError.message, stack: enhancedAIError.stack });
        } else {
          log.error('Enhanced AI service error', { error: String(enhancedAIError) });
        }
        // Return the error details for debugging
        return res.status(400).json({
          error: {
            message: enhancedAIError instanceof Error ? enhancedAIError.message : String(enhancedAIError),
            service: 'Enhanced AI',
            details: enhancedAIError instanceof Error ? enhancedAIError.stack : undefined
          }
        });
      }
    } catch (error) {
      log.error('Both Rasa and OpenAI services failed', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({
        message: "AI service temporarily unavailable",
        response: "I'm sorry, I'm having technical difficulties. Please contact us directly at 0311-5197087 for immediate assistance.",
        quickActions: ['open_whatsapp', 'contact_support']
      });
    }
  });
  // Rasa-specific endpoints
  app.post("/api/chat/rasa/session", async (req, res) => {
    try {
      const { rasaService } = await import('./rasa-service.js');
      const sessionId = await rasaService.createSession();

      res.json({ sessionId, type: 'rasa' });
    } catch (error) {
      log.error('Failed to create Rasa session', { error: error instanceof Error ? error.message : String(error) });
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/rasa/health", async (req, res) => {
    try {
      const { rasaService } = await import('./rasa-service');
      const isHealthy = await rasaService.healthCheck();

      res.json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  // Development endpoint for training Rasa model
  if (process.env.NODE_ENV === 'development') {
    app.post("/api/chat/rasa/train", async (req, res) => {
      try {
        const { rasaService } = await import('./rasa-service');
        const success = await rasaService.trainModel();

        res.json({
          success,
          message: success ? 'Model training started' : 'Model training failed'
        });
      } catch (error) {
        log.error('Failed to start model training', { error: error instanceof Error ? error.message : String(error) });
        res.status(500).json({ message: "Failed to start model training" });
      }
    });
  }

  // Setup automatic cleanup of expired booking requests (24 hours)
  const cleanupExpiredBookings = async () => {
    try {
      const allBookingRequests = await storage.getBookingRequests();
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      for (const request of allBookingRequests) {
        // Remove booking requests that are pending and older than 24 hours
        if (request.status === 'pending' &&
            !request.paymentReceived &&
            new Date(request.requestDate || request.createdAt) < twentyFourHoursAgo) {

          // Delete the expired booking request
          await storage.deleteBookingRequest(request.id);

          // Emit real-time update to admin dashboard
          io.to('admin-dashboard').emit('booking-request-expired', {
            bookingRequestId: request.id,
            roomNumber: request.roomNumber,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      log.error('Error cleaning up expired bookings', error);
    }
  };

  // Run cleanup every hour
  setInterval(cleanupExpiredBookings, 60 * 60 * 1000);

  // Run initial cleanup on startup
  setTimeout(cleanupExpiredBookings, 5000);

  return httpServer;
}

// Add error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  log.error('Route error handler', err, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: "error",
      message: "Validation failed",
      errors: err.errors
    });
  }

  if (err instanceof ValidationError) {
    return res.status(400).json({
      status: "error",
      message: err.message
    });
  }

  res.status(500).json({
    status: "error",
    message: "Internal server error"
  });
};


