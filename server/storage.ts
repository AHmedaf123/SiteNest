import {
  apartments,
  customers,
  bookings,
  reviews,
  chatSessions,
  users,
  reservations,
  bookingRequests,
  affiliateApplications,
  affiliateLinks,
  affiliateMetrics,
  affiliateEarnings,
  affiliateWithdrawals,
  affiliateWithdrawalRequests,
  type Apartment,
  type Customer,
  type Booking,
  type Review,
  type ChatSession,
  type User,
  type Reservation,
  type BookingRequest,
  type AffiliateApplication,
  type AffiliateLink,
  type AffiliateMetric,
  type AffiliateEarning,
  type AffiliateWithdrawal,
  type InsertApartment,
  type InsertCustomer,
  type InsertBooking,
  type InsertReview,
  type InsertChatSession,
  type InsertReservation,
  type InsertBookingRequest,
  type InsertAffiliateApplication,
  type InsertAffiliateLink,
  type InsertAffiliateMetric,
  type InsertAffiliateEarning,
  type InsertAffiliateWithdrawal,
  type AffiliateWithdrawalRequest,
  type InsertAffiliateWithdrawalRequest,
  type UpsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { ValidationError } from "./errors";
import fs from "fs";
import path from "path";


export interface IStorage {
  // Apartments
  getApartments(): Promise<Apartment[]>;
  getApartment(id: number): Promise<Apartment | undefined>;
  getApartmentByRoomNumber(roomNumber: string): Promise<Apartment | undefined>;
  createApartment(apartment: InsertApartment): Promise<Apartment>;
  updateApartment(id: number, updates: Partial<Apartment>): Promise<Apartment | undefined>;
  deleteApartment(id: number): Promise<boolean>;

  // Customers
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined>;

  // Bookings
  getBookings(): Promise<Booking[]>;
  getBooking(id: number): Promise<Booking | undefined>;
  getBookingsByApartment(apartmentId: number): Promise<Booking[]>;
  getBookingsByCustomer(customerId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: number, updates: Partial<InsertBooking>): Promise<Booking | undefined>;
  deleteBooking(id: number): Promise<boolean>;
  checkAvailability(apartmentId: number, checkIn: string, checkOut: string): Promise<boolean>;
  checkAvailabilityExcluding(apartmentId: number, checkIn: string, checkOut: string, excludeBookingId: number): Promise<boolean>;

  // Reviews
  getReviews(): Promise<Review[]>;
  getReview(id: number): Promise<Review | undefined>;
  getReviewsByApartment(apartmentId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined>;
  deleteReview(id: number): Promise<boolean>;

  // Chat Sessions
  getChatSession(sessionId: string): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;

  // User operations (for auth)
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Reservations (45-minute holds)
  getActiveReservations(): Promise<Reservation[]>;
  getActiveReservationsByApartment(apartmentId: number): Promise<Reservation[]>;
  getReservation(id: number): Promise<Reservation | undefined>;
  getReservationsByUser(userId: string): Promise<Reservation[]>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: number, updates: Partial<Reservation>): Promise<Reservation | undefined>;
  cancelReservation(id: number, userId: string): Promise<boolean>;
  expireReservations(): Promise<void>;

  // Booking Requests
  getBookingRequests(): Promise<BookingRequest[]>;
  getBookingRequest(id: number): Promise<BookingRequest | undefined>;
  getBookingRequestsByUser(userId: string): Promise<BookingRequest[]>;
  createBookingRequest(request: InsertBookingRequest): Promise<BookingRequest>;
  updateBookingRequest(id: number, updates: Partial<BookingRequest>): Promise<BookingRequest | undefined>;
  deleteBookingRequest(id: number): Promise<boolean>;

  // Affiliate Applications
  getAffiliateApplications(): Promise<AffiliateApplication[]>;
  getAffiliateApplication(id: number): Promise<AffiliateApplication | undefined>;
  getAffiliateApplicationByUser(userId: string): Promise<AffiliateApplication | undefined>;
  createAffiliateApplication(application: InsertAffiliateApplication): Promise<AffiliateApplication>;
  updateAffiliateApplication(id: number, updates: Partial<AffiliateApplication>): Promise<AffiliateApplication | undefined>;

  // Affiliate Links
  getAffiliateLinks(): Promise<AffiliateLink[]>;
  getAffiliateLink(id: number): Promise<AffiliateLink | undefined>;
  getAffiliateLinksByUser(userId: string): Promise<AffiliateLink[]>;
  getAffiliateLinkByCode(linkCode: string): Promise<AffiliateLink | undefined>;
  getAllAffiliateLinks(): Promise<AffiliateLink[]>;
  createAffiliateLink(link: InsertAffiliateLink): Promise<AffiliateLink>;
  updateAffiliateLink(id: number, updates: Partial<AffiliateLink>): Promise<AffiliateLink | undefined>;
  deleteAffiliateLink(id: number): Promise<boolean>;

  // Affiliate Metrics
  getAffiliateMetrics(): Promise<AffiliateMetric[]>;
  getAffiliateMetricsByUser(userId: string): Promise<AffiliateMetric[]>;
  createAffiliateMetric(metric: InsertAffiliateMetric): Promise<AffiliateMetric>;

  // Affiliate Earnings
  getAffiliateEarnings(): Promise<AffiliateEarning[]>;
  getAffiliateEarningsByUser(userId: string): Promise<AffiliateEarning[]>;
  getAffiliateEarningsByStatus(status: string): Promise<AffiliateEarning[]>;
  createAffiliateEarning(earning: InsertAffiliateEarning): Promise<AffiliateEarning>;
  updateAffiliateEarning(id: number, updates: Partial<AffiliateEarning>): Promise<AffiliateEarning | undefined>;

  // Affiliate Withdrawals
  getAffiliateWithdrawals(): Promise<AffiliateWithdrawal[]>;
  getAffiliateWithdrawal(id: number): Promise<AffiliateWithdrawal | undefined>;
  createAffiliateWithdrawal(withdrawal: InsertAffiliateWithdrawal): Promise<AffiliateWithdrawal>;
  updateAffiliateWithdrawal(id: number, updates: Partial<AffiliateWithdrawal>): Promise<AffiliateWithdrawal | undefined>;

  // Affiliate Withdrawal Requests
  getAffiliateWithdrawalRequests(): Promise<AffiliateWithdrawalRequest[]>;
  getAffiliateWithdrawalRequestsByUser(userId: string): Promise<AffiliateWithdrawalRequest[]>;
  getAffiliateWithdrawalRequest(id: number): Promise<AffiliateWithdrawalRequest | undefined>;
  createAffiliateWithdrawalRequest(request: InsertAffiliateWithdrawalRequest): Promise<AffiliateWithdrawalRequest>;
  updateAffiliateWithdrawalRequest(id: number, updates: Partial<AffiliateWithdrawalRequest>): Promise<AffiliateWithdrawalRequest | undefined>;
}

export class MemStorage implements IStorage {
  private apartments: Map<number, Apartment>;
  private customers: Map<number, Customer>;
  private bookings: Map<number, Booking>;
  private reviews: Map<number, Review>;
  private chatSessions: Map<string, ChatSession>;
  private users: Map<string, User>;
  private reservations: Map<number, Reservation>;
  private bookingRequests: Map<number, BookingRequest>;
  private affiliateApplications: Map<number, AffiliateApplication>;
  private affiliateLinks: Map<number, AffiliateLink>;
  private affiliateMetrics: Map<number, AffiliateMetric>;
  private affiliateEarnings: Map<number, AffiliateEarning>;
  private affiliateWithdrawals: Map<number, AffiliateWithdrawal>;
  private affiliateWithdrawalRequests: Map<number, AffiliateWithdrawalRequest>;
  private currentId: { [key: string]: number };
  private dataFile: string = '';

  constructor() {
    this.apartments = new Map();
    this.customers = new Map();
    this.bookings = new Map();
    this.reviews = new Map();
    this.chatSessions = new Map();
    this.users = new Map();
    this.reservations = new Map();
    this.bookingRequests = new Map();
    this.affiliateApplications = new Map();
    this.affiliateLinks = new Map();
    this.affiliateMetrics = new Map();
    this.affiliateEarnings = new Map();
    this.affiliateWithdrawals = new Map();
    this.affiliateWithdrawalRequests = new Map();
    this.currentId = {
      apartments: 1,
      customers: 1,
      bookings: 1,
      reviews: 1,
      chatSessions: 1,
      reservations: 1,
      bookingRequests: 1,
      affiliateApplications: 1,
      affiliateLinks: 1,
      affiliateMetrics: 1,
      affiliateEarnings: 1,
      affiliateWithdrawals: 1,
      affiliateWithdrawalRequests: 1
    };

    // Disable auto-seeding to prevent data reset on server restart
    // To add initial data, run: npm run seed-memory
    console.log("📊 Memory storage initialized (no auto-seeding)");
  }

  private seedData() {
    // Seed apartments
    const apartmentData: InsertApartment[] = [
      {
        roomNumber: "714",
        title: "Luxury Studio - Room 714",
        description: "Modern studio with panoramic city views, fully furnished with premium amenities.",
        price: 120,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 650,
        imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        amenities: ["WiFi", "Kitchen", "City View", "AC"]
      }
    ];

    apartmentData.forEach(apt => this.createApartment(apt));

    // No dummy reviews - reviews will be added by users through the review system

    // Seed some sample bookings
    const customer1 = this.createCustomer({
      name: "Josef",
      phone: "+923001234567",
      cnic: "42101-1234567-8"
    });

    const customer2 = this.createCustomer({
      name: "Ahmed",
      phone: "+923009876543",
      cnic: "42201-9876543-2"
    });

    // Commented out conflicting bookings for room 714 to allow testing
    // this.createBooking({
    //   apartmentId: 1,
    //   customerId: 1,
    //   checkIn: "2024-12-10T05:00:00.000Z",
    //   checkOut: "2024-12-12T05:00:00.000Z",
    //   status: "booked",
    //   paymentStatus: "paid",
    //   hostName: "Maria Garcia",
    //   totalAmount: 240
    // });

    // this.createBooking({
    //   apartmentId: 1,
    //   customerId: 2,
    //   checkIn: "2024-12-18T05:00:00.000Z",
    //   checkOut: "2024-12-21T05:00:00.000Z",
    //   status: "booked",
    //   paymentStatus: "pending",
    //   hostName: "David Johnson",
    //   totalAmount: 360
    // });

    // Add bookings for testing
    this.createBooking({
      apartmentId: 1,
      customerId: 1, // Josef
      checkIn: "2025-06-03T05:00:00.000Z",
      checkOut: "2025-06-05T05:00:00.000Z",
      status: "booked",
      paymentStatus: "paid",
      hostName: "web",
      totalAmount: 240,
      affiliateId: null,
      affiliateName: null
    });

    this.createBooking({
      apartmentId: 1,
      customerId: 2, // Ahmed
      checkIn: "2025-06-06T05:00:00.000Z",
      checkOut: "2025-06-06T05:00:00.000Z",
      status: "booked",
      paymentStatus: "paid",
      hostName: "web",
      totalAmount: 120,
      affiliateId: null,
      affiliateName: null
    });
  }

  // Apartment methods
  async getApartments(): Promise<Apartment[]> {
    return Array.from(this.apartments.values());
  }

  async getApartment(id: number): Promise<Apartment | undefined> {
    return this.apartments.get(id);
  }

  async getApartmentByRoomNumber(roomNumber: string): Promise<Apartment | undefined> {
    return Array.from(this.apartments.values()).find(apt => apt.roomNumber === roomNumber);
  }

  async createApartment(insertApartment: InsertApartment): Promise<Apartment> {
    const id = this.currentId.apartments++;
    const apartment: Apartment = {
      ...insertApartment,
      id,
      images: insertApartment.images || null,
      amenities: insertApartment.amenities || null,
      discountPercentage: insertApartment.discountPercentage || null
    };
    this.apartments.set(id, apartment);
    return apartment;
  }

  async updateApartment(id: number, updates: Partial<Apartment>): Promise<Apartment | undefined> {
    const existing = this.apartments.get(id);
    if (!existing) return undefined;

    const updated: Apartment = { ...existing, ...updates };
    this.apartments.set(id, updated);
    return updated;
  }

  async deleteApartment(id: number): Promise<boolean> {
    return this.apartments.delete(id);
  }

  // Customer methods
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.phone === phone);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = this.currentId.customers++;
    const customer: Customer = {
      ...insertCustomer,
      id,
      isVerified: false,
      verificationPin: null
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;

    const updatedCustomer = { ...customer, ...updates };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  // Booking methods
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByApartment(apartmentId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.apartmentId === apartmentId);
  }

  async getBookingsByCustomer(customerId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.customerId === customerId);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    // Check availability before creating booking
    const isAvailable = await this.checkAvailability(
      insertBooking.apartmentId,
      insertBooking.checkIn,
      insertBooking.checkOut
    );

    if (!isAvailable) {
      throw new ValidationError('Room is not available for the selected dates');
    }

    const id = this.currentId.bookings++;
    const booking: Booking = {
      ...insertBooking,
      id,
      createdAt: new Date(),
      affiliateId: insertBooking.affiliateId ?? null,
      affiliateName: insertBooking.affiliateName ?? null
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: number, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    const existingBooking = this.bookings.get(id);
    if (!existingBooking) return undefined;

    const updatedBooking: Booking = {
      ...existingBooking,
      ...updates,
      id, // Ensure ID doesn't change
      createdAt: existingBooking.createdAt, // Preserve creation date
      affiliateId: updates.affiliateId !== undefined ? updates.affiliateId ?? null : existingBooking.affiliateId,
      affiliateName: updates.affiliateName !== undefined ? updates.affiliateName ?? null : existingBooking.affiliateName
    };

    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<boolean> {
    return this.bookings.delete(id);
  }

  async checkAvailability(apartmentId: number, checkIn: string, checkOut: string): Promise<boolean> {
    const existingBookings = await this.getBookingsByApartment(apartmentId);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    console.log(`🔍 Checking availability for apartment ${apartmentId}`);
    console.log(`📅 Requested dates: ${checkIn} to ${checkOut}`);
    console.log(`📅 Parsed dates: ${checkInDate.toISOString()} to ${checkOutDate.toISOString()}`);
    console.log(`📋 Found ${existingBookings.length} existing bookings`);

    const hasConflict = existingBookings.some(booking => {
      if (booking.status === "cancelled") {
        console.log(`  ⏭️  Skipping cancelled booking ${booking.id}`);
        return false;
      }

      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);

      const conflict = (checkInDate < bookingCheckOut && checkOutDate > bookingCheckIn);

      console.log(`  📅 Booking ${booking.id}: ${booking.checkIn} to ${booking.checkOut} (${booking.status})`);
      console.log(`     Parsed: ${bookingCheckIn.toISOString()} to ${bookingCheckOut.toISOString()}`);
      console.log(`     Conflict: ${conflict ? '❌ YES' : '✅ NO'}`);

      return conflict;
    });

    const isAvailable = !hasConflict;
    console.log(`🎯 Final result: ${isAvailable ? '✅ AVAILABLE' : '❌ NOT AVAILABLE'}`);

    return isAvailable;
  }

  async checkAvailabilityExcluding(apartmentId: number, checkIn: string, checkOut: string, excludeBookingId: number): Promise<boolean> {
    const existingBookings = await this.getBookingsByApartment(apartmentId);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    return !existingBookings.some(booking => {
      if (booking.status === "cancelled") return false;
      if (booking.id === excludeBookingId) return false; // Exclude the booking being updated

      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);

      return (checkInDate < bookingCheckOut && checkOutDate > bookingCheckIn);
    });
  }

  // Review methods
  async getReviews(): Promise<Review[]> {
    const reviews = Array.from(this.reviews.values());
    // Sort by timestamp in descending order (newest first)
    return reviews.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getReview(id: number): Promise<Review | undefined> {
    return this.reviews.get(id);
  }

  async getReviewsByApartment(apartmentId: number): Promise<Review[]> {
    const reviews = Array.from(this.reviews.values()).filter(review => review.apartmentId === apartmentId);
    // Sort by timestamp in descending order (newest first)
    return reviews.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.currentId.reviews++;
    const review: Review = {
      ...insertReview,
      id,
      createdAt: new Date(),
      imageUrl: insertReview.imageUrl || null,
      apartmentId: insertReview.apartmentId || null,
      userId: insertReview.userId || null
    };
    this.reviews.set(id, review);
    return review;
  }

  async updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined> {
    const existing = this.reviews.get(id);
    if (!existing) return undefined;

    const updated: Review = { ...existing, ...updates };
    this.reviews.set(id, updated);
    return updated;
  }

  async deleteReview(id: number): Promise<boolean> {
    return this.reviews.delete(id);
  }

  // Chat session methods
  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(sessionId);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = this.currentId.chatSessions++;
    const session: ChatSession = {
      ...insertSession,
      id,
      data: insertSession.data || null,
      customerId: insertSession.customerId || null,
      currentStep: insertSession.currentStep || 0,
      createdAt: new Date()
    };
    this.chatSessions.set(insertSession.sessionId, session);
    return session;
  }

  async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(sessionId);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updates };
    this.chatSessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  // User authentication methods
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);

    if (existingUser) {
      const updatedUser: User = {
        ...existingUser,
        ...userData,
        updatedAt: new Date()
      };
      this.users.set(userData.id, updatedUser);
      return updatedUser;
    } else {
      const newUser: User = {
        ...userData,
        email: userData.email || '',
        firstName: userData.firstName || null,
        lastName: userData.lastName || null,
        profileImageUrl: userData.profileImageUrl || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        // Ensure all required fields have proper defaults
        passwordHash: userData.passwordHash || null,
        cnic: userData.cnic || null,
        phone: userData.phone || null,
        country: userData.country || null,
        address: userData.address || null,
        isEmailVerified: userData.isEmailVerified || false,
        isPhoneVerified: userData.isPhoneVerified || false,
        emailVerificationToken: userData.emailVerificationToken || null,
        phoneVerificationToken: userData.phoneVerificationToken || null,
        googleId: userData.googleId || null,
        authProvider: userData.authProvider || null,
        role: userData.role || 'customer'
      };
      this.users.set(userData.id, newUser);
      return newUser;
    }
  }

  // Reservation methods (45-minute holds)
  async getActiveReservations(): Promise<Reservation[]> {
    const now = new Date();
    return Array.from(this.reservations.values())
      .filter(reservation =>
        reservation.status === 'active' &&
        new Date(reservation.expiresAt) > now
      )
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  }

  async getActiveReservationsByApartment(apartmentId: number): Promise<Reservation[]> {
    const now = new Date();
    return Array.from(this.reservations.values())
      .filter(reservation =>
        reservation.apartmentId === apartmentId &&
        reservation.status === 'active' &&
        new Date(reservation.expiresAt) > now
      )
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  }

  async getReservation(id: number): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async getReservationsByUser(userId: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values())
      .filter(reservation => reservation.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    const id = this.currentId.reservations++;
    const reservation: Reservation = {
      ...insertReservation,
      id,
      status: insertReservation.status || 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.reservations.set(id, reservation);
    return reservation;
  }

  async updateReservation(id: number, updates: Partial<Reservation>): Promise<Reservation | undefined> {
    const existing = this.reservations.get(id);
    if (!existing) return undefined;

    const updated: Reservation = {
      ...existing,
      ...updates,
      updatedAt: new Date()
    };
    this.reservations.set(id, updated);
    return updated;
  }

  async cancelReservation(id: number, userId: string): Promise<boolean> {
    const reservation = this.reservations.get(id);
    if (!reservation || reservation.userId !== userId) {
      return false;
    }

    const updated: Reservation = {
      ...reservation,
      status: 'cancelled',
      updatedAt: new Date()
    };
    this.reservations.set(id, updated);
    return true;
  }

  async expireReservations(): Promise<void> {
    const now = new Date();
    const expiredReservations = Array.from(this.reservations.values())
      .filter(reservation =>
        reservation.status === 'active' &&
        new Date(reservation.expiresAt) <= now
      );

    expiredReservations.forEach(reservation => {
      const updated: Reservation = {
        ...reservation,
        status: 'expired',
        updatedAt: new Date()
      };
      this.reservations.set(reservation.id, updated);
    });

    if (expiredReservations.length > 0) {
      console.log(`⏰ Expired ${expiredReservations.length} reservations`);
    }
  }

  // Booking Request methods
  async getBookingRequests(): Promise<BookingRequest[]> {
    const requests = Array.from(this.bookingRequests.values());
    // Sort by request date in descending order (newest first)
    return requests.sort((a, b) => {
      const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
      const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getBookingRequest(id: number): Promise<BookingRequest | undefined> {
    return this.bookingRequests.get(id);
  }

  async getBookingRequestsByUser(userId: string): Promise<BookingRequest[]> {
    const requests = Array.from(this.bookingRequests.values()).filter(request => request.userId === userId);
    // Sort by request date in descending order (newest first)
    return requests.sort((a, b) => {
      const dateA = a.requestDate ? new Date(a.requestDate).getTime() : 0;
      const dateB = b.requestDate ? new Date(b.requestDate).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createBookingRequest(insertRequest: InsertBookingRequest): Promise<BookingRequest> {
    const id = this.currentId.bookingRequests++;
    const request: BookingRequest = {
      ...insertRequest,
      id,
      requestDate: new Date(),
      createdAt: new Date(),
      confirmedAt: insertRequest.confirmedAt || null,
      guestCount: insertRequest.guestCount || null,
      arrivalTime: insertRequest.arrivalTime || null,
      needsParking: insertRequest.needsParking || false,
      hasPets: insertRequest.hasPets || false,
      mealPreferences: insertRequest.mealPreferences || null,
      confirmationAmount: insertRequest.confirmationAmount || null,
      paymentReceived: insertRequest.paymentReceived || false,
      paymentScreenshot: insertRequest.paymentScreenshot || null,
      whatsappConfirmed: insertRequest.whatsappConfirmed || false,
      status: insertRequest.status || "pending",
      adminNotes: insertRequest.adminNotes || null,
      affiliateId: insertRequest.affiliateId ?? null,
      affiliateName: insertRequest.affiliateName ?? null
    };
    this.bookingRequests.set(id, request);
    return request;
  }

  async updateBookingRequest(id: number, updates: Partial<BookingRequest>): Promise<BookingRequest | undefined> {
    const existing = this.bookingRequests.get(id);
    if (!existing) return undefined;

    const updated: BookingRequest = { ...existing, ...updates };
    this.bookingRequests.set(id, updated);
    return updated;
  }

  async deleteBookingRequest(id: number): Promise<boolean> {
    return this.bookingRequests.delete(id);
  }

  // Affiliate Application methods
  async getAffiliateApplications(): Promise<AffiliateApplication[]> {
    const applications = Array.from(this.affiliateApplications.values());
    return applications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAffiliateApplication(id: number): Promise<AffiliateApplication | undefined> {
    return this.affiliateApplications.get(id);
  }

  async getAffiliateApplicationByUser(userId: string): Promise<AffiliateApplication | undefined> {
    const applications = Array.from(this.affiliateApplications.values())
      .filter(app => app.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return applications[0];
  }

  async createAffiliateApplication(insertApplication: InsertAffiliateApplication): Promise<AffiliateApplication> {
    const id = this.currentId.affiliateApplications++;
    const application: AffiliateApplication = {
      ...insertApplication,
      id,
      status: 'pending',
      reviewedBy: null,
      reviewNotes: null,
      reviewedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      experience: insertApplication.experience || null,
      motivation: insertApplication.motivation || null,
      marketingPlan: insertApplication.marketingPlan || null,
      socialMediaLinks: insertApplication.socialMediaLinks || null
    };
    this.affiliateApplications.set(id, application);
    return application;
  }

  async updateAffiliateApplication(id: number, updates: Partial<AffiliateApplication>): Promise<AffiliateApplication | undefined> {
    const existing = this.affiliateApplications.get(id);
    if (!existing) return undefined;

    const updated: AffiliateApplication = { ...existing, ...updates, updatedAt: new Date() };
    this.affiliateApplications.set(id, updated);
    return updated;
  }

  // Affiliate Link methods
  async getAffiliateLinks(): Promise<AffiliateLink[]> {
    const links = Array.from(this.affiliateLinks.values());
    return links.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAffiliateLink(id: number): Promise<AffiliateLink | undefined> {
    return this.affiliateLinks.get(id);
  }

  async getAffiliateLinksByUser(userId: string): Promise<AffiliateLink[]> {
    const links = Array.from(this.affiliateLinks.values())
      .filter(link => link.affiliateId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return links;
  }

  async getAffiliateLinkByCode(linkCode: string): Promise<AffiliateLink | undefined> {
    return Array.from(this.affiliateLinks.values()).find(link => link.linkCode === linkCode);
  }

  async getAllAffiliateLinks(): Promise<AffiliateLink[]> {
    return Array.from(this.affiliateLinks.values());
  }

  async createAffiliateLink(insertLink: InsertAffiliateLink): Promise<AffiliateLink> {
    const id = this.currentId.affiliateLinks++;
    const link: AffiliateLink = {
      ...insertLink,
      id,
      linkUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?ref=${insertLink.linkCode}`,
      discountPercentage: insertLink.discountPercentage || null,
      priceAdjustment: insertLink.priceAdjustment || null,
      adjustmentType: insertLink.adjustmentType || null,
      additionalAmount: insertLink.additionalAmount || null,
      longStayDiscountEnabled: insertLink.longStayDiscountEnabled || null,
      longStayMinDays: insertLink.longStayMinDays || null,
      longStayDiscountType: insertLink.longStayDiscountType || null,
      longStayDiscountValue: insertLink.longStayDiscountValue || null,
      additionalDiscount: insertLink.additionalDiscount || null,

      expiresAt: insertLink.expiresAt || null,
      isActive: true,
      clickCount: 0,
      conversionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.affiliateLinks.set(id, link);
    return link;
  }

  async updateAffiliateLink(id: number, updates: Partial<AffiliateLink>): Promise<AffiliateLink | undefined> {
    const existing = this.affiliateLinks.get(id);
    if (!existing) return undefined;

    const updated: AffiliateLink = { ...existing, ...updates, updatedAt: new Date() };
    this.affiliateLinks.set(id, updated);
    return updated;
  }

  async deleteAffiliateLink(id: number): Promise<boolean> {
    // First delete associated metrics to maintain consistency
    const metricsToDelete = Array.from(this.affiliateMetrics.values())
      .filter(metric => metric.linkId === id);

    metricsToDelete.forEach(metric => {
      this.affiliateMetrics.delete(metric.id);
    });

    console.log(`Deleted ${metricsToDelete.length} associated metrics for link ${id}`);

    return this.affiliateLinks.delete(id);
  }

  // Affiliate Metric methods
  async getAffiliateMetrics(): Promise<AffiliateMetric[]> {
    const metrics = Array.from(this.affiliateMetrics.values());
    return metrics.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAffiliateMetricsByUser(userId: string): Promise<AffiliateMetric[]> {
    const metrics = Array.from(this.affiliateMetrics.values())
      .filter(metric => metric.affiliateId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return metrics;
  }

  async createAffiliateMetric(insertMetric: InsertAffiliateMetric): Promise<AffiliateMetric> {
    const id = this.currentId.affiliateMetrics++;
    const metric: AffiliateMetric = {
      ...insertMetric,
      id,
      apartmentId: insertMetric.apartmentId || null,
      customerId: insertMetric.customerId || null,
      linkId: insertMetric.linkId || null,
      bookingRequestId: insertMetric.bookingRequestId || null,
      basePrice: insertMetric.basePrice || null,
      finalPrice: insertMetric.finalPrice || null,
      affiliateEarning: insertMetric.affiliateEarning || null,
      commissionRate: insertMetric.commissionRate || null,
      eventData: insertMetric.eventData || null,
      createdAt: new Date()
    };
    this.affiliateMetrics.set(id, metric);
    return metric;
  }

  // Affiliate Earnings methods
  async getAffiliateEarnings(): Promise<AffiliateEarning[]> {
    const earnings = Array.from(this.affiliateEarnings.values());
    return earnings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAffiliateEarningsByUser(userId: string): Promise<AffiliateEarning[]> {
    const earnings = Array.from(this.affiliateEarnings.values())
      .filter(earning => earning.affiliateId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return earnings;
  }

  async getAffiliateEarningsByStatus(status: string): Promise<AffiliateEarning[]> {
    const earnings = Array.from(this.affiliateEarnings.values())
      .filter(earning => earning.status === status)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return earnings;
  }

  async createAffiliateEarning(insertEarning: InsertAffiliateEarning): Promise<AffiliateEarning> {
    const id = this.currentId.affiliateEarnings++;
    const earning: AffiliateEarning = {
      ...insertEarning,
      id,
      status: insertEarning.status || 'pending',
      commissionRate: insertEarning.commissionRate || null,
      bookingId: insertEarning.bookingId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      withdrawalId: insertEarning.withdrawalId || null,
      withdrawalDate: insertEarning.withdrawalDate || null,
      approvedBy: insertEarning.approvedBy || null,
      approvedAt: insertEarning.approvedAt || null,
      notes: insertEarning.notes || null
    };
    this.affiliateEarnings.set(id, earning);
    return earning;
  }

  async updateAffiliateEarning(id: number, updates: Partial<AffiliateEarning>): Promise<AffiliateEarning | undefined> {
    const existing = this.affiliateEarnings.get(id);
    if (!existing) return undefined;

    const updated: AffiliateEarning = { ...existing, ...updates, updatedAt: new Date() };
    this.affiliateEarnings.set(id, updated);
    return updated;
  }

  // Affiliate Withdrawal methods
  async getAffiliateWithdrawals(): Promise<AffiliateWithdrawal[]> {
    const withdrawals = Array.from(this.affiliateWithdrawals.values());
    return withdrawals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAffiliateWithdrawal(id: number): Promise<AffiliateWithdrawal | undefined> {
    return this.affiliateWithdrawals.get(id);
  }

  async createAffiliateWithdrawal(insertWithdrawal: InsertAffiliateWithdrawal): Promise<AffiliateWithdrawal> {
    const id = this.currentId.affiliateWithdrawals++;
    const withdrawal: AffiliateWithdrawal = {
      ...insertWithdrawal,
      id,
      status: insertWithdrawal.status || 'pending',
      withdrawalType: insertWithdrawal.withdrawalType || 'weekly',
      notes: insertWithdrawal.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      processedBy: insertWithdrawal.processedBy || null,
      processedAt: insertWithdrawal.processedAt || null,
      paymentMethod: insertWithdrawal.paymentMethod || null,
      paymentReference: insertWithdrawal.paymentReference || null
    };
    this.affiliateWithdrawals.set(id, withdrawal);
    return withdrawal;
  }

  async updateAffiliateWithdrawal(id: number, updates: Partial<AffiliateWithdrawal>): Promise<AffiliateWithdrawal | undefined> {
    const existing = this.affiliateWithdrawals.get(id);
    if (!existing) return undefined;

    const updated: AffiliateWithdrawal = { ...existing, ...updates, updatedAt: new Date() };
    this.affiliateWithdrawals.set(id, updated);
    return updated;
  }

  // Affiliate Withdrawal Request methods
  async getAffiliateWithdrawalRequests(): Promise<AffiliateWithdrawalRequest[]> {
    const requests = Array.from(this.affiliateWithdrawalRequests.values());
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAffiliateWithdrawalRequestsByUser(userId: string): Promise<AffiliateWithdrawalRequest[]> {
    const requests = Array.from(this.affiliateWithdrawalRequests.values())
      .filter(request => request.affiliateId === userId);
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAffiliateWithdrawalRequest(id: number): Promise<AffiliateWithdrawalRequest | undefined> {
    return this.affiliateWithdrawalRequests.get(id);
  }

  async createAffiliateWithdrawalRequest(insertRequest: InsertAffiliateWithdrawalRequest): Promise<AffiliateWithdrawalRequest> {
    const id = this.currentId.affiliateWithdrawalRequests++;
    const request: AffiliateWithdrawalRequest = {
      ...insertRequest,
      id,
      status: insertRequest.status || 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedBy: insertRequest.reviewedBy || null,
      reviewedAt: insertRequest.reviewedAt || null,
      adminNotes: insertRequest.adminNotes || null,
      paymentMethod: insertRequest.paymentMethod || null,
      paymentReference: insertRequest.paymentReference || null,
      paidAt: insertRequest.paidAt || null
    };
    this.affiliateWithdrawalRequests.set(id, request);
    return request;
  }

  async updateAffiliateWithdrawalRequest(id: number, updates: Partial<AffiliateWithdrawalRequest>): Promise<AffiliateWithdrawalRequest | undefined> {
    const existing = this.affiliateWithdrawalRequests.get(id);
    if (!existing) return undefined;

    const updated: AffiliateWithdrawalRequest = { ...existing, ...updates, updatedAt: new Date() };
    this.affiliateWithdrawalRequests.set(id, updated);
    return updated;
  }
}

// Database Storage Implementation
export class DbStorage implements IStorage {
  // Apartment methods
  async getApartments(): Promise<Apartment[]> {
    const result = await db.select().from(apartments);
    return result;
  }

  async getApartment(id: number): Promise<Apartment | undefined> {
    const result = await db.select().from(apartments).where(eq(apartments.id, id));
    return result[0];
  }

  async getApartmentByRoomNumber(roomNumber: string): Promise<Apartment | undefined> {
    const result = await db.select().from(apartments).where(eq(apartments.roomNumber, roomNumber));
    return result[0];
  }

  async createApartment(insertApartment: InsertApartment): Promise<Apartment> {
    const result = await db.insert(apartments).values(insertApartment).returning();
    return result[0];
  }

  async updateApartment(id: number, updates: Partial<Apartment>): Promise<Apartment | undefined> {
    const result = await db.update(apartments)
      .set(updates)
      .where(eq(apartments.id, id))
      .returning();
    return result[0];
  }

  async deleteApartment(id: number): Promise<boolean> {
    const result = await db.delete(apartments).where(eq(apartments.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Customer methods
  async getCustomers(): Promise<Customer[]> {
    const result = await db.select().from(customers);
    return result;
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.id, id));
    return result[0];
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    const result = await db.select().from(customers).where(eq(customers.phone, phone));
    return result[0];
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const result = await db.insert(customers).values(insertCustomer).returning();
    return result[0];
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined> {
    const result = await db.update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return result[0];
  }

  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Booking methods
  async getBookings(): Promise<Booking[]> {
    const result = await db.select().from(bookings);
    return result;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id));
    return result[0];
  }

  async getBookingsByApartment(apartmentId: number): Promise<Booking[]> {
    const result = await db.select().from(bookings).where(eq(bookings.apartmentId, apartmentId));
    return result;
  }

  async getBookingsByCustomer(customerId: number): Promise<Booking[]> {
    const result = await db.select().from(bookings).where(eq(bookings.customerId, customerId));
    return result;
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    // Check availability before creating booking
    const isAvailable = await this.checkAvailability(
      insertBooking.apartmentId,
      insertBooking.checkIn,
      insertBooking.checkOut
    );

    if (!isAvailable) {
      throw new ValidationError('Room is not available for the selected dates');
    }

    const result = await db.insert(bookings).values(insertBooking).returning();
    return result[0];
  }

  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking | undefined> {
    const result = await db.update(bookings)
      .set(updates)
      .where(eq(bookings.id, id))
      .returning();
    return result[0];
  }

  async deleteBooking(id: number): Promise<boolean> {
    const result = await db.delete(bookings).where(eq(bookings.id, id));
    return (result.rowCount || 0) > 0;
  }

  async checkAvailability(apartmentId: number, checkIn: string, checkOut: string): Promise<boolean> {
    const existingBookings = await this.getBookingsByApartment(apartmentId);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    console.log(`🔍 Checking availability for apartment ${apartmentId}`);
    console.log(`📅 Requested dates: ${checkIn} to ${checkOut}`);
    console.log(`📅 Parsed dates: ${checkInDate.toISOString()} to ${checkOutDate.toISOString()}`);
    console.log(`📋 Found ${existingBookings.length} existing bookings`);

    for (const booking of existingBookings) {
      if (booking.status === 'cancelled') {
        console.log(`  ⏭️  Skipping cancelled booking ${booking.id}`);
        continue;
      }

      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);

      console.log(`  📅 Existing booking ${booking.id}: ${bookingCheckIn.toISOString()} to ${bookingCheckOut.toISOString()}`);

      // Check for overlap
      const hasOverlap = checkInDate < bookingCheckOut && checkOutDate > bookingCheckIn;

      if (hasOverlap) {
        console.log(`  ❌ Overlap detected with booking ${booking.id}`);
        console.log(`🎯 Final result: ❌ NOT AVAILABLE`);
        return false;
      } else {
        console.log(`  ✅ No overlap with booking ${booking.id}`);
      }
    }

    console.log(`🎯 Final result: ✅ AVAILABLE`);
    return true;
  }

  async checkAvailabilityExcluding(apartmentId: number, checkIn: string, checkOut: string, excludeBookingId: number): Promise<boolean> {
    const existingBookings = await this.getBookingsByApartment(apartmentId);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    for (const booking of existingBookings) {
      if (booking.id === excludeBookingId || booking.status === 'cancelled') {
        continue;
      }

      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);

      const hasOverlap = checkInDate < bookingCheckOut && checkOutDate > bookingCheckIn;
      if (hasOverlap) {
        return false;
      }
    }

    return true;
  }

  // Review methods
  async getReviews(): Promise<Review[]> {
    const result = await db.select().from(reviews).orderBy(desc(reviews.createdAt));
    return result;
  }

  async getReview(id: number): Promise<Review | undefined> {
    const result = await db.select().from(reviews).where(eq(reviews.id, id));
    return result[0];
  }

  async getReviewsByApartment(apartmentId: number): Promise<Review[]> {
    const result = await db.select().from(reviews)
      .where(eq(reviews.apartmentId, apartmentId))
      .orderBy(desc(reviews.createdAt));
    return result;
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const result = await db.insert(reviews).values(insertReview).returning();
    return result[0];
  }

  async updateReview(id: number, updates: Partial<Review>): Promise<Review | undefined> {
    const result = await db.update(reviews)
      .set(updates)
      .where(eq(reviews.id, id))
      .returning();
    return result[0];
  }

  async deleteReview(id: number): Promise<boolean> {
    const result = await db.delete(reviews).where(eq(reviews.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Chat session methods
  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    const result = await db.select().from(chatSessions).where(eq(chatSessions.sessionId, sessionId));
    return result[0];
  }

  async createChatSession(insertChatSession: InsertChatSession): Promise<ChatSession> {
    const result = await db.insert(chatSessions).values(insertChatSession).returning();
    return result[0];
  }

  async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const result = await db.update(chatSessions)
      .set(updates)
      .where(eq(chatSessions.sessionId, sessionId))
      .returning();
    return result[0];
  }

  // User methods
  async getUsers(): Promise<User[]> {
    const result = await db.select().from(users);
    return result;
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const result = await db.insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
          updatedAt: new Date()
        }
      })
      .returning();
    return result[0];
  }

  // Reservation methods (45-minute holds)
  async getActiveReservations(): Promise<Reservation[]> {
    const result = await db.select().from(reservations)
      .where(eq(reservations.status, 'active'))
      .orderBy(reservations.expiresAt);

    // Filter out expired reservations
    const now = new Date();
    return result.filter(reservation => new Date(reservation.expiresAt) > now);
  }

  async getActiveReservationsByApartment(apartmentId: number): Promise<Reservation[]> {
    const result = await db.select().from(reservations)
      .where(eq(reservations.apartmentId, apartmentId))
      .orderBy(reservations.expiresAt);

    // Filter out expired reservations and only return active ones
    const now = new Date();
    return result.filter(reservation => 
      reservation.status === 'active' && new Date(reservation.expiresAt) > now
    );
  }

  async getReservation(id: number): Promise<Reservation | undefined> {
    const result = await db.select().from(reservations).where(eq(reservations.id, id));
    return result[0];
  }

  async getReservationsByUser(userId: string): Promise<Reservation[]> {
    const result = await db.select().from(reservations)
      .where(eq(reservations.userId, userId))
      .orderBy(desc(reservations.createdAt));
    return result;
  }

  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    const result = await db.insert(reservations).values(insertReservation).returning();
    return result[0];
  }

  async updateReservation(id: number, updates: Partial<Reservation>): Promise<Reservation | undefined> {
    const result = await db.update(reservations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(reservations.id, id))
      .returning();
    return result[0];
  }

  async cancelReservation(id: number, userId: string): Promise<boolean> {
    const result = await db.update(reservations)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(reservations.id, id))
      .returning();

    const reservation = result[0];
    return reservation && reservation.userId === userId;
  }

  async expireReservations(): Promise<void> {
    const now = new Date();
    const result = await db.update(reservations)
      .set({
        status: 'expired',
        updatedAt: new Date()
      })
      .where(eq(reservations.status, 'active'))
      .returning();

    const expiredCount = result.filter(r => new Date(r.expiresAt) <= now).length;
    if (expiredCount > 0) {
      console.log(`⏰ Expired ${expiredCount} reservations`);
    }
  }

  // Booking Request methods
  async getBookingRequests(): Promise<BookingRequest[]> {
    const result = await db.select().from(bookingRequests).orderBy(desc(bookingRequests.requestDate));
    return result;
  }

  async getBookingRequest(id: number): Promise<BookingRequest | undefined> {
    const result = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    return result[0];
  }

  async getBookingRequestsByUser(userId: string): Promise<BookingRequest[]> {
    const result = await db.select().from(bookingRequests)
      .where(eq(bookingRequests.userId, userId))
      .orderBy(desc(bookingRequests.requestDate));
    return result;
  }

  async createBookingRequest(insertRequest: InsertBookingRequest): Promise<BookingRequest> {
    const result = await db.insert(bookingRequests).values(insertRequest).returning();
    return result[0];
  }

  async updateBookingRequest(id: number, updates: Partial<BookingRequest>): Promise<BookingRequest | undefined> {
    const result = await db.update(bookingRequests)
      .set(updates)
      .where(eq(bookingRequests.id, id))
      .returning();
    return result[0];
  }

  async deleteBookingRequest(id: number): Promise<boolean> {
    const result = await db.delete(bookingRequests).where(eq(bookingRequests.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Affiliate Application methods
  async getAffiliateApplications(): Promise<AffiliateApplication[]> {
    const result = await db.select().from(affiliateApplications).orderBy(desc(affiliateApplications.createdAt));
    return result;
  }

  async getAffiliateApplication(id: number): Promise<AffiliateApplication | undefined> {
    const result = await db.select().from(affiliateApplications).where(eq(affiliateApplications.id, id));
    return result[0];
  }

  async getAffiliateApplicationByUser(userId: string): Promise<AffiliateApplication | undefined> {
    const result = await db.select().from(affiliateApplications)
      .where(eq(affiliateApplications.userId, userId))
      .orderBy(desc(affiliateApplications.createdAt))
      .limit(1);
    return result[0];
  }

  async createAffiliateApplication(insertApplication: InsertAffiliateApplication): Promise<AffiliateApplication> {
    const result = await db.insert(affiliateApplications).values(insertApplication).returning();
    return result[0];
  }

  async updateAffiliateApplication(id: number, updates: Partial<AffiliateApplication>): Promise<AffiliateApplication | undefined> {
    const result = await db.update(affiliateApplications)
      .set(updates)
      .where(eq(affiliateApplications.id, id))
      .returning();
    return result[0];
  }

  // Affiliate Link methods
  async getAffiliateLinks(): Promise<AffiliateLink[]> {
    const result = await db.select().from(affiliateLinks).orderBy(desc(affiliateLinks.createdAt));
    return result;
  }

  async getAffiliateLink(id: number): Promise<AffiliateLink | undefined> {
    const result = await db.select().from(affiliateLinks).where(eq(affiliateLinks.id, id));
    return result[0];
  }

  async getAffiliateLinksByUser(userId: string): Promise<AffiliateLink[]> {
    const result = await db.select().from(affiliateLinks)
      .where(eq(affiliateLinks.affiliateId, userId))
      .orderBy(desc(affiliateLinks.createdAt));
    return result;
  }

  async getAffiliateLinkByCode(linkCode: string): Promise<AffiliateLink | undefined> {
    const result = await db.select().from(affiliateLinks).where(eq(affiliateLinks.linkCode, linkCode));
    return result[0];
  }

  async getAllAffiliateLinks(): Promise<AffiliateLink[]> {
    return await db.select().from(affiliateLinks);
  }

  async createAffiliateLink(insertLink: InsertAffiliateLink): Promise<AffiliateLink> {
    const linkData = {
      ...insertLink,
      linkUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}?ref=${insertLink.linkCode}`
    };
    const result = await db.insert(affiliateLinks).values(linkData).returning();
    return result[0];
  }

  async updateAffiliateLink(id: number, updates: Partial<AffiliateLink>): Promise<AffiliateLink | undefined> {
    const result = await db.update(affiliateLinks)
      .set(updates)
      .where(eq(affiliateLinks.id, id))
      .returning();
    return result[0];
  }

  async deleteAffiliateLink(id: number): Promise<boolean> {
    try {
      // First delete associated metrics to avoid foreign key constraint violation
      await db.delete(affiliateMetrics).where(eq(affiliateMetrics.linkId, id));

      // Then delete the affiliate link
      const result = await db.delete(affiliateLinks).where(eq(affiliateLinks.id, id));
      return (result.rowCount || 0) > 0;
    } catch (error) {
      console.error('Error deleting affiliate link:', error);
      throw error;
    }
  }

  // Affiliate Metric methods
  async getAffiliateMetrics(): Promise<AffiliateMetric[]> {
    const result = await db.select().from(affiliateMetrics).orderBy(desc(affiliateMetrics.createdAt));
    return result;
  }

  async getAffiliateMetricsByUser(userId: string): Promise<AffiliateMetric[]> {
    const result = await db.select().from(affiliateMetrics)
      .where(eq(affiliateMetrics.affiliateId, userId))
      .orderBy(desc(affiliateMetrics.createdAt));
    return result;
  }

  async createAffiliateMetric(insertMetric: InsertAffiliateMetric): Promise<AffiliateMetric> {
    const result = await db.insert(affiliateMetrics).values(insertMetric).returning();
    return result[0];
  }

  // Affiliate Earnings methods
  async getAffiliateEarnings(): Promise<AffiliateEarning[]> {
    const result = await db.select().from(affiliateEarnings).orderBy(desc(affiliateEarnings.createdAt));
    return result;
  }

  async getAffiliateEarningsByUser(userId: string): Promise<AffiliateEarning[]> {
    const result = await db.select().from(affiliateEarnings)
      .where(eq(affiliateEarnings.affiliateId, userId))
      .orderBy(desc(affiliateEarnings.createdAt));
    return result;
  }

  async getAffiliateEarningsByStatus(status: string): Promise<AffiliateEarning[]> {
    const result = await db.select().from(affiliateEarnings)
      .where(eq(affiliateEarnings.status, status))
      .orderBy(desc(affiliateEarnings.createdAt));
    return result;
  }

  async createAffiliateEarning(insertEarning: InsertAffiliateEarning): Promise<AffiliateEarning> {
    const result = await db.insert(affiliateEarnings).values(insertEarning).returning();
    return result[0];
  }

  async updateAffiliateEarning(id: number, updates: Partial<AffiliateEarning>): Promise<AffiliateEarning | undefined> {
    const result = await db.update(affiliateEarnings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(affiliateEarnings.id, id))
      .returning();
    return result[0];
  }

  // Affiliate Withdrawal methods
  async getAffiliateWithdrawals(): Promise<AffiliateWithdrawal[]> {
    const result = await db.select().from(affiliateWithdrawals).orderBy(desc(affiliateWithdrawals.createdAt));
    return result;
  }

  async getAffiliateWithdrawal(id: number): Promise<AffiliateWithdrawal | undefined> {
    const result = await db.select().from(affiliateWithdrawals).where(eq(affiliateWithdrawals.id, id));
    return result[0];
  }

  async createAffiliateWithdrawal(insertWithdrawal: InsertAffiliateWithdrawal): Promise<AffiliateWithdrawal> {
    const result = await db.insert(affiliateWithdrawals).values(insertWithdrawal).returning();
    return result[0];
  }

  async updateAffiliateWithdrawal(id: number, updates: Partial<AffiliateWithdrawal>): Promise<AffiliateWithdrawal | undefined> {
    const result = await db.update(affiliateWithdrawals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(affiliateWithdrawals.id, id))
      .returning();
    return result[0];
  }

  // Affiliate Withdrawal Request methods
  async getAffiliateWithdrawalRequests(): Promise<AffiliateWithdrawalRequest[]> {
    const result = await db.select().from(affiliateWithdrawalRequests).orderBy(desc(affiliateWithdrawalRequests.createdAt));
    return result;
  }

  async getAffiliateWithdrawalRequestsByUser(userId: string): Promise<AffiliateWithdrawalRequest[]> {
    const result = await db.select().from(affiliateWithdrawalRequests)
      .where(eq(affiliateWithdrawalRequests.affiliateId, userId))
      .orderBy(desc(affiliateWithdrawalRequests.createdAt));
    return result;
  }

  async getAffiliateWithdrawalRequest(id: number): Promise<AffiliateWithdrawalRequest | undefined> {
    const result = await db.select().from(affiliateWithdrawalRequests).where(eq(affiliateWithdrawalRequests.id, id));
    return result[0];
  }

  async createAffiliateWithdrawalRequest(insertRequest: InsertAffiliateWithdrawalRequest): Promise<AffiliateWithdrawalRequest> {
    const result = await db.insert(affiliateWithdrawalRequests).values(insertRequest).returning();
    return result[0];
  }

  async updateAffiliateWithdrawalRequest(id: number, updates: Partial<AffiliateWithdrawalRequest>): Promise<AffiliateWithdrawalRequest | undefined> {
    const result = await db.update(affiliateWithdrawalRequests)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(affiliateWithdrawalRequests.id, id))
      .returning();
    return result[0];
  }
}

// Use database storage when enabled, memory storage for development/testing
export const storage = process.env.USE_DATABASE === 'true'
  ? new DbStorage()
  : new MemStorage();