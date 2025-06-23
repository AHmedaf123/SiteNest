/**
 * Booking Service
 * Handles all booking-related business logic including availability checking, pricing, and booking management
 */

import { BaseService } from './base.service';
import { AvailabilityService } from './availability.service';
import { 
  BookingNotAvailableError, 
  ValidationError, 
  RecordNotFoundError,
  BusinessLogicError 
} from '../errors';
import { 
  bookings, 
  apartments, 
  users, 
  bookingRequests,
  type Booking,
  type BookingRequest,
  type Apartment,
  type User
} from '@shared/schema';
import { eq, and, gte, lte, or, desc, asc, ne } from 'drizzle-orm';
import { InputValidator } from '../utils/validation';

export interface CreateBookingData {
  apartmentId: number;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalAmount?: number; // Optional - will be calculated if not provided
  specialRequests?: string;
  affiliateId?: string;
  affiliateName?: string;
}

export interface BookingAvailabilityQuery {
  apartmentId: number;
  checkIn: string;
  checkOut: string;
  excludeBookingId?: number;
}

export interface BookingSearchFilters {
  userId?: string;
  apartmentId?: number;
  status?: string;
  checkInFrom?: string;
  checkInTo?: string;
  page?: number;
  limit?: number;
  sortBy?: 'checkIn' | 'checkOut' | 'createdAt' | 'totalAmount';
  sortOrder?: 'asc' | 'desc';
}

export class BookingService extends BaseService {
  private availabilityService: AvailabilityService;

  constructor() {
    super('BookingService');
    this.availabilityService = new AvailabilityService();
  }

  /**
   * Check apartment availability for given dates
   * Now uses the centralized AvailabilityService
   */
  async checkAvailability(query: BookingAvailabilityQuery): Promise<{
    isAvailable: boolean;
    reason?: string;
    conflictingBookings?: Booking[];
  }> {
    return this.executeWithRetry(async () => {
      this.logOperation('checkAvailability', query);

      const result = await this.availabilityService.checkAvailability({
        apartmentId: query.apartmentId,
        checkIn: query.checkIn,
        checkOut: query.checkOut,
        excludeBookingId: query.excludeBookingId,
        includePendingReservations: true
      });

      return {
        isAvailable: result.isAvailable,
        reason: result.reason,
        conflictingBookings: result.conflictingBookings
      };
    }, 'checkAvailability', query);
  }

  /**
   * Calculate booking pricing including taxes and fees
   */
  async calculatePricing(
    apartmentId: number,
    checkIn: string,
    checkOut: string,
    guests: number,
    affiliateId?: string
  ): Promise<{
    baseAmount: number;
    taxes: number;
    fees: number;
    discounts: number;
    totalAmount: number;
    breakdown: {
      nightlyRate: number;
      numberOfNights: number;
      subtotal: number;
      taxRate: number;
      serviceFeePct: number;
      affiliateDiscount?: number;
    };
  }> {
    return this.executeWithRetry(async () => {
      this.logOperation('calculatePricing', { apartmentId, checkIn, checkOut, guests, affiliateId });

      // Validate inputs
      const dateValidation = InputValidator.validateDateRange(checkIn, checkOut);
      if (!dateValidation.valid) {
        throw new ValidationError(dateValidation.error || 'Invalid date range');
      }

      // Get apartment details
      const apartment = await this.db
        .select()
        .from(apartments)
        .where(eq(apartments.id, apartmentId))
        .limit(1);

      if (apartment.length === 0) {
        throw new RecordNotFoundError('Apartment', apartmentId.toString());
      }

      const apt = apartment[0];
      const numberOfNights = this.calculateDaysDifference(
        dateValidation.checkInDate!,
        dateValidation.checkOutDate!
      );

      // Base calculations
      const nightlyRate = apt.price;
      const subtotal = nightlyRate * numberOfNights;

      // Tax calculation (17% GST in Pakistan)
      const taxRate = 0.17;
      const taxes = subtotal * taxRate;

      // Service fee (5% of subtotal)
      const serviceFeePct = 0.05;
      const fees = subtotal * serviceFeePct;

      // Calculate affiliate discount if applicable
      let affiliateDiscount = 0;
      if (affiliateId) {
        // Affiliate gets 10% discount for long-term stays (7+ nights)
        if (numberOfNights >= 7) {
          affiliateDiscount = subtotal * 0.10;
        }
      }

      const baseAmount = subtotal;
      const discounts = affiliateDiscount;
      const totalAmount = baseAmount + taxes + fees - discounts;

      return {
        baseAmount,
        taxes,
        fees,
        discounts,
        totalAmount,
        breakdown: {
          nightlyRate,
          numberOfNights,
          subtotal,
          taxRate,
          serviceFeePct,
          affiliateDiscount: affiliateDiscount > 0 ? affiliateDiscount : undefined
        }
      };
    }, 'calculatePricing', { apartmentId, checkIn, checkOut, guests });
  }

  /**
   * Create a new booking request
   */
  async createBookingRequest(data: CreateBookingData, userId: string): Promise<BookingRequest> {
    return this.executeWithRetry(async () => {
      this.logOperation('createBookingRequest', { ...data, userId });

      // Validate required fields
      this.validateRequired(data, ['apartmentId', 'checkIn', 'checkOut', 'guests']);

      // Validate field types (only validate fields that are present)
      const typeValidations: Record<string, string> = {
        apartmentId: 'number',
        guests: 'number',
        specialRequests: 'string'
      };
      
      // Only validate totalAmount if it's provided
      if (data.totalAmount !== undefined) {
        typeValidations.totalAmount = 'number';
      }
      
      this.validateTypes(data, typeValidations);

      // Validate business rules
      this.validateBusinessRules(data, [
        {
          condition: (d) => d.guests >= 1 && d.guests <= 10,
          message: 'Number of guests must be between 1 and 10',
          field: 'guests'
        }
      ]);

      // Check availability
      const availability = await this.checkAvailability({
        apartmentId: data.apartmentId,
        checkIn: data.checkIn,
        checkOut: data.checkOut
      });

      if (!availability.isAvailable) {
        throw new BookingNotAvailableError(availability.reason || 'Apartment not available');
      }

      // Calculate pricing
      const pricing = await this.calculatePricing(
        data.apartmentId,
        data.checkIn,
        data.checkOut,
        data.guests,
        data.affiliateId
      );

      // Use calculated pricing if totalAmount is 0 or not provided
      let finalTotalAmount = data.totalAmount;
      if (!data.totalAmount || data.totalAmount === 0) {
        finalTotalAmount = pricing.totalAmount;
      } else {
        // Verify pricing if totalAmount was provided
        // Allow 1% tolerance for pricing differences (due to rounding)
        const pricingTolerance = pricing.totalAmount * 0.01;
        if (Math.abs(data.totalAmount - pricing.totalAmount) > pricingTolerance) {
          throw new ValidationError(
            `Price mismatch. Expected: ${this.formatCurrency(pricing.totalAmount)}, Received: ${this.formatCurrency(data.totalAmount)}`
          );
        }
      }

      // Get apartment details to get room number
      const apartment = await this.db
        .select()
        .from(apartments)
        .where(eq(apartments.id, data.apartmentId))
        .limit(1);

      if (apartment.length === 0) {
        throw new RecordNotFoundError('Apartment', data.apartmentId.toString());
      }

      // Create booking request
      const bookingRequestData: any = {
        apartmentId: data.apartmentId,
        userId,
        roomNumber: apartment[0].roomNumber,
        checkIn: new Date(data.checkIn),
        checkOut: new Date(data.checkOut),
        guestCount: data.guests,
        confirmationAmount: finalTotalAmount,
        status: 'pending' as const,
        requestDate: new Date(),
        createdAt: new Date(),
      };
      // Set affiliate fields if provided
      if (data.affiliateId) {
        bookingRequestData.affiliateId = data.affiliateId;
        // Optionally, fetch affiliate name from users table
        const affiliateUser = data.affiliateName
          ? { firstName: data.affiliateName }
          : (await this.db.select().from(users).where(eq(users.id, data.affiliateId)).limit(1))[0];
        bookingRequestData.affiliateName = affiliateUser
          ? `${affiliateUser.firstName || ''} ${'lastName' in affiliateUser && affiliateUser.lastName ? affiliateUser.lastName : ''}`.trim()
          : '';
      }

      const result = await this.db
        .insert(bookingRequests)
        .values(bookingRequestData)
        .returning();

      const bookingRequest = result[0];

      // Create audit trail
      await this.createAuditTrail(
        'create_booking_request',
        'booking_request',
        bookingRequest.id,
        userId,
        bookingRequestData
      );

      this.logOperation('createBookingRequest completed', { 
        bookingRequestId: bookingRequest.id,
        apartmentId: data.apartmentId,
        userId 
      });

      return bookingRequest;
    }, 'createBookingRequest', { apartmentId: data.apartmentId, userId });
  }

  /**
   * Approve booking request and create confirmed booking
   */
  async approveBookingRequest(
    bookingRequestId: number,
    adminUserId: string,
    notes?: string
  ): Promise<Booking> {
    return this.executeWithRetry(async () => {
      this.logOperation('approveBookingRequest', { bookingRequestId, adminUserId });

      // Get booking request
      const bookingRequest = await this.db
        .select()
        .from(bookingRequests)
        .where(eq(bookingRequests.id, bookingRequestId))
        .limit(1);

      if (bookingRequest.length === 0) {
        throw new RecordNotFoundError('BookingRequest', bookingRequestId.toString());
      }

      const request = bookingRequest[0];

      if (request.status !== 'pending') {
        throw new BusinessLogicError(`Cannot approve booking request with status: ${request.status}`);
      }

      // Get admin user details for host name
      const admin = await this.db
        .select()
        .from(users)
        .where(eq(users.id, adminUserId))
        .limit(1);

      if (admin.length === 0) {
        throw new RecordNotFoundError('Admin User', adminUserId);
      }

      // Double-check availability
      const availability = await this.checkAvailability({
        apartmentId: request.apartmentId,
        checkIn: request.checkIn.toISOString(),
        checkOut: request.checkOut.toISOString()
      });

      if (!availability.isAvailable) {
        throw new BookingNotAvailableError('Apartment is no longer available');
      }

      // Determine hostName logic
      let hostName = `${admin[0].firstName || ''} ${admin[0].lastName || ''}`.trim();
      // If booking is from affiliate and not saved to calendar, use affiliateName as hostName
      // (Assume a flag or logic to determine if not saved to calendar; here, we use a placeholder)
      const notSavedToCalendar = true; // TODO: Replace with actual logic
      if (notSavedToCalendar && request.affiliateName) {
        hostName = request.affiliateName;
      }

      // Create booking with all required fields matching schema
      const bookingData: any = {
        apartmentId: request.apartmentId,
        customerId: Number(request.userId), // Convert string to number
        checkIn: request.checkIn instanceof Date ? request.checkIn.toISOString() : request.checkIn,
        checkOut: request.checkOut instanceof Date ? request.checkOut.toISOString() : request.checkOut,
        status: 'booked',
        paymentStatus: 'pending',
        hostName,
        totalAmount: request.confirmationAmount ?? 0,
        createdAt: new Date(),
      };
      // Copy affiliate fields if present
      if (request.affiliateId) {
        bookingData.affiliateId = request.affiliateId;
        bookingData.affiliateName = request.affiliateName || '';
      }

      const bookingResult = await this.db
        .insert(bookings)
        .values(bookingData)
        .returning();

      const booking = bookingResult[0];

      // Update booking request status
      await this.db
        .update(bookingRequests)
        .set({
          status: 'approved'
        })
        .where(eq(bookingRequests.id, bookingRequestId));

      // Create audit trail
      await this.createAuditTrail(
        'approve_booking_request',
        'booking',
        booking.id,
        adminUserId,
        { bookingRequestId, notes },
        { originalRequestId: bookingRequestId }
      );

      this.logOperation('approveBookingRequest completed', {
        bookingId: booking.id,
        bookingRequestId,
        adminUserId
      });

      return booking;
    }, 'approveBookingRequest', { bookingRequestId, adminUserId });  }

  /**
   * Search bookings with filters and pagination
   */
  async searchBookings(filters: BookingSearchFilters): Promise<{
    bookings: (Booking & { apartment: Apartment; user: User })[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    return this.executeWithRetry(async () => {
      this.logOperation('searchBookings', filters);

      const {
        userId,
        apartmentId,
        status,
        checkInFrom,
        checkInTo,
        page = 1,
        limit = 10,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = filters;

      // Build where conditions
      const conditions = [];

      if (userId) {
        conditions.push(eq(bookings.customerId, Number(userId)));
      }

      if (apartmentId) {
        conditions.push(eq(bookings.apartmentId, apartmentId));
      }

      if (status) {
        conditions.push(eq(bookings.status, status));
      }

      if (checkInFrom) {
        conditions.push(gte(bookings.checkIn, new Date(checkInFrom).toISOString()));
      }

      if (checkInTo) {
        conditions.push(lte(bookings.checkIn, new Date(checkInTo).toISOString()));
      }

      // Build order by
      const validSortColumns = {
        checkIn: bookings.checkIn,
        checkOut: bookings.checkOut,
        createdAt: bookings.createdAt,
        totalAmount: bookings.totalAmount
      };
      const orderByColumn = validSortColumns[sortBy] || bookings.createdAt;
      const orderBy = sortOrder === 'asc' ? asc(orderByColumn) : desc(orderByColumn);

      // Get total count
      const totalResult = await this.db
        .select({ count: bookings.id })
        .from(bookings)
        .where(and(...conditions));

      const total = totalResult.length;

      // Get paginated results with joins
      const offset = (page - 1) * limit;
      const results = await this.db
        .select({
          booking: bookings,
          apartment: apartments,
          user: users
        })
        .from(bookings)
        .leftJoin(apartments, eq(bookings.apartmentId, apartments.id))
        .leftJoin(users, eq(bookings.customerId, users.id))
        .where(and(...conditions))
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      const bookingsWithDetails = results.map(result => ({
        ...result.booking,
        apartment: result.apartment!,
        user: result.user!
      }));

      const totalPages = Math.ceil(total / limit);

      return {
        bookings: bookingsWithDetails,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    }, 'searchBookings', filters);
  }
}
