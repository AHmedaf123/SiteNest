/**
 * Enhanced Availability Service
 * Centralized service for all room availability operations with advanced features
 */

import { BaseService } from './base.service';
import { cacheService } from './cache.service';
import { 
  BookingNotAvailableError, 
  ValidationError, 
  RecordNotFoundError 
} from '../errors';
import { 
  bookings, 
  apartments, 
  reservations,
  bookingRequests,
  type Booking,
  type Apartment,
  type Reservation
} from '@shared/schema';
import { eq, and, gte, lte, or, desc, asc, ne, inArray } from 'drizzle-orm';
import { InputValidator } from '../utils/validation';

export interface AvailabilityQuery {
  apartmentId: number;
  checkIn: string;
  checkOut: string;
  excludeBookingId?: number;
  excludeReservationId?: number;
  includePendingReservations?: boolean;
}

export interface BulkAvailabilityQuery {
  apartmentIds: number[];
  checkIn: string;
  checkOut: string;
  excludeBookingIds?: number[];
  includePendingReservations?: boolean;
}

export interface DateRangeAvailabilityQuery {
  apartmentId: number;
  startDate: string;
  endDate: string;
  minStayDays?: number;
}

export interface AvailabilityResult {
  isAvailable: boolean;
  reason?: string;
  conflictingBookings?: Booking[];
  conflictingReservations?: Reservation[];
  availableFrom?: string;
  availableUntil?: string;
}

export interface BulkAvailabilityResult {
  [apartmentId: number]: AvailabilityResult;
}

export interface CalendarAvailabilityResult {
  date: string;
  isAvailable: boolean;
  hasCheckIn: boolean;
  hasCheckOut: boolean;
  booking?: {
    id: number;
    hostName: string;
    status: string;
    isCheckInDay: boolean;
    isCheckOutDay: boolean;
  };
  reservation?: {
    id: number;
    userId: string;
    expiresAt: string;
  };
}

export interface DateRangeAvailabilityResult {
  apartmentId: number;
  availablePeriods: Array<{
    startDate: string;
    endDate: string;
    minStayMet: boolean;
  }>;
  totalAvailableDays: number;
  occupancyRate: number;
}

export class AvailabilityService extends BaseService {
  private readonly CACHE_TTL = 300; // 5 minutes cache
  private readonly SAME_DAY_CHECKOUT_CHECKIN_ALLOWED = true;

  constructor() {
    super('AvailabilityService');
  }

  /**
   * Enhanced availability check with reservation system integration
   */
  async checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResult> {
    return this.executeWithRetry(async () => {
      this.logOperation('checkAvailability', query);

      // Generate cache key
      const cacheKey = this.generateCacheKey('availability', query);
      
      // Try to get from cache first
      const cached = await cacheService.get<AvailabilityResult>(cacheKey);
      if (cached) {
        this.logOperation('checkAvailability cache hit', { cacheKey });
        return cached;
      }

      // Validate date range
      const dateValidation = InputValidator.validateDateRange(query.checkIn, query.checkOut);
      if (!dateValidation.valid) {
        return {
          isAvailable: false,
          reason: dateValidation.error
        };
      }

      const { checkInDate, checkOutDate } = dateValidation;

      // Check if apartment exists
      const apartment = await this.db
        .select()
        .from(apartments)
        .where(eq(apartments.id, query.apartmentId))
        .limit(1);

      if (apartment.length === 0) {
        throw new RecordNotFoundError('Apartment', query.apartmentId.toString());
      }

      // Check for conflicting bookings
      const conflictingBookings = await this.getConflictingBookings(
        query.apartmentId,
        checkInDate!,
        checkOutDate!,
        query.excludeBookingId
      );

      // Check for conflicting reservations if enabled
      let conflictingReservations: Reservation[] = [];
      if (query.includePendingReservations !== false) {
        conflictingReservations = await this.getConflictingReservations(
          query.apartmentId,
          checkInDate!,
          checkOutDate!,
          query.excludeReservationId
        );
      }

      const hasBookingConflict = conflictingBookings.length > 0;
      const hasReservationConflict = conflictingReservations.length > 0;
      const isAvailable = !hasBookingConflict && !hasReservationConflict;

      let reason: string | undefined;
      if (!isAvailable) {
        if (hasBookingConflict && hasReservationConflict) {
          reason = 'Apartment has conflicting bookings and reservations for the selected dates';
        } else if (hasBookingConflict) {
          reason = 'Apartment has conflicting bookings for the selected dates';
        } else {
          reason = 'Apartment has conflicting reservations for the selected dates';
        }
      }

      // Find next available period if not available
      let availableFrom: string | undefined;
      let availableUntil: string | undefined;
      if (!isAvailable) {
        const nextAvailable = await this.findNextAvailablePeriod(
          query.apartmentId,
          checkOutDate!
        );
        availableFrom = nextAvailable?.startDate;
        availableUntil = nextAvailable?.endDate;
      }

      const result: AvailabilityResult = {
        isAvailable,
        reason,
        conflictingBookings: hasBookingConflict ? conflictingBookings : undefined,
        conflictingReservations: hasReservationConflict ? conflictingReservations : undefined,
        availableFrom,
        availableUntil
      };

      // Cache the result
      await cacheService.set(cacheKey, result, { ttl: this.CACHE_TTL });

      return result;
    }, 'checkAvailability', query);
  }

  /**
   * Bulk availability checking for multiple apartments
   */
  async checkBulkAvailability(query: BulkAvailabilityQuery): Promise<BulkAvailabilityResult> {
    return this.executeWithRetry(async () => {
      this.logOperation('checkBulkAvailability', query);

      const results: BulkAvailabilityResult = {};

      // Process apartments in parallel for better performance
      const availabilityPromises = query.apartmentIds.map(async (apartmentId) => {
        const availabilityQuery: AvailabilityQuery = {
          apartmentId,
          checkIn: query.checkIn,
          checkOut: query.checkOut,
          excludeBookingId: query.excludeBookingIds?.find(id => id === apartmentId),
          includePendingReservations: query.includePendingReservations
        };

        const result = await this.checkAvailability(availabilityQuery);
        return { apartmentId, result };
      });

      const availabilityResults = await Promise.all(availabilityPromises);

      // Build results object
      availabilityResults.forEach(({ apartmentId, result }) => {
        results[apartmentId] = result;
      });

      return results;
    }, 'checkBulkAvailability', query);
  }

  /**
   * Get calendar availability for a date range
   */
  async getCalendarAvailability(
    apartmentId: number,
    startDate: string,
    endDate: string
  ): Promise<CalendarAvailabilityResult[]> {
    return this.executeWithRetry(async () => {
      this.logOperation('getCalendarAvailability', { apartmentId, startDate, endDate });

      const cacheKey = this.generateCacheKey('calendar', { apartmentId, startDate, endDate });
      const cached = await cacheService.get<CalendarAvailabilityResult[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      const results: CalendarAvailabilityResult[] = [];

      // Get all bookings and reservations for the period
      const [allBookings, allReservations] = await Promise.all([
        this.getBookingsInDateRange(apartmentId, start, end),
        this.getReservationsInDateRange(apartmentId, start, end)
      ]);

      // Generate calendar data for each date
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Check if this date has any bookings
        const dayBooking = allBookings.find(booking => {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          return currentDate >= checkIn && currentDate < checkOut;
        });

        // Check if this date has any reservations
        const dayReservation = allReservations.find(reservation => {
          const checkIn = new Date(reservation.checkIn);
          const checkOut = new Date(reservation.checkOut);
          return currentDate >= checkIn && currentDate < checkOut;
        });

        const isCheckInDay = dayBooking ? 
          new Date(dayBooking.checkIn).toDateString() === currentDate.toDateString() : false;
        const isCheckOutDay = dayBooking ? 
          new Date(dayBooking.checkOut).toDateString() === currentDate.toDateString() : false;

        // Apply same-day checkout/checkin logic
        let isAvailable = !dayBooking && !dayReservation;
        if (this.SAME_DAY_CHECKOUT_CHECKIN_ALLOWED && isCheckOutDay) {
          isAvailable = true; // Allow new checkin on checkout day
        }

        results.push({
          date: dateStr,
          isAvailable,
          hasCheckIn: isCheckInDay,
          hasCheckOut: isCheckOutDay,
          booking: dayBooking ? {
            id: dayBooking.id,
            hostName: dayBooking.hostName,
            status: dayBooking.status,
            isCheckInDay,
            isCheckOutDay
          } : undefined,
          reservation: dayReservation ? {
            id: dayReservation.id,
            userId: dayReservation.userId,
            expiresAt: dayReservation.expiresAt.toISOString()
          } : undefined
        });

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Cache the results
      await cacheService.set(cacheKey, results, { ttl: this.CACHE_TTL });

      return results;
    }, 'getCalendarAvailability', { apartmentId, startDate, endDate });
  }

  /**
   * Get availability for a date range with available periods
   */
  async getDateRangeAvailability(query: DateRangeAvailabilityQuery): Promise<DateRangeAvailabilityResult> {
    return this.executeWithRetry(async () => {
      this.logOperation('getDateRangeAvailability', query);

      const calendarData = await this.getCalendarAvailability(
        query.apartmentId,
        query.startDate,
        query.endDate
      );

      const availablePeriods: Array<{
        startDate: string;
        endDate: string;
        minStayMet: boolean;
      }> = [];

      let currentPeriodStart: string | null = null;
      let currentPeriodDays = 0;

      // Find continuous available periods
      for (const day of calendarData) {
        if (day.isAvailable) {
          if (!currentPeriodStart) {
            currentPeriodStart = day.date;
            currentPeriodDays = 1;
          } else {
            currentPeriodDays++;
          }
        } else {
          if (currentPeriodStart) {
            // End of available period
            const endDate = calendarData[calendarData.indexOf(day) - 1].date;
            availablePeriods.push({
              startDate: currentPeriodStart,
              endDate,
              minStayMet: !query.minStayDays || currentPeriodDays >= query.minStayDays
            });
            currentPeriodStart = null;
            currentPeriodDays = 0;
          }
        }
      }

      // Handle case where period extends to the end
      if (currentPeriodStart) {
        availablePeriods.push({
          startDate: currentPeriodStart,
          endDate: calendarData[calendarData.length - 1].date,
          minStayMet: !query.minStayDays || currentPeriodDays >= query.minStayDays
        });
      }

      const totalDays = calendarData.length;
      const totalAvailableDays = calendarData.filter(day => day.isAvailable).length;
      const occupancyRate = totalDays > 0 ? ((totalDays - totalAvailableDays) / totalDays) * 100 : 0;

      return {
        apartmentId: query.apartmentId,
        availablePeriods,
        totalAvailableDays,
        occupancyRate: Math.round(occupancyRate * 100) / 100
      };
    }, 'getDateRangeAvailability', query);
  }

  /**
   * Create a temporary reservation (hold)
   */
  async createReservation(
    userId: string,
    apartmentId: number,
    checkIn: string,
    checkOut: string,
    holdMinutes: number = 45
  ): Promise<Reservation> {
    return this.executeWithRetry(async () => {
      this.logOperation('createReservation', { userId, apartmentId, checkIn, checkOut, holdMinutes });

      // Check availability first
      const availability = await this.checkAvailability({
        apartmentId,
        checkIn,
        checkOut,
        includePendingReservations: true
      });

      if (!availability.isAvailable) {
        throw new BookingNotAvailableError(availability.reason || 'Apartment not available');
      }

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + holdMinutes);

      const reservationData = {
        userId,
        apartmentId,
        checkIn: new Date(checkIn),
        checkOut: new Date(checkOut),
        status: 'active' as const,
        expiresAt,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.db
        .insert(reservations)
        .values(reservationData)
        .returning();

      const reservation = result[0];

      // Clear related cache
      await this.clearAvailabilityCache(apartmentId);

      return reservation;
    }, 'createReservation', { userId, apartmentId });
  }

  /**
   * Release expired reservations
   */
  async releaseExpiredReservations(): Promise<number> {
    return this.executeWithRetry(async () => {
      const now = new Date();
      
      const expiredReservations = await this.db
        .select()
        .from(reservations)
        .where(
          and(
            eq(reservations.status, 'active'),
            lte(reservations.expiresAt, now)
          )
        );

      if (expiredReservations.length === 0) {
        return 0;
      }

      // Update expired reservations
      await this.db
        .update(reservations)
        .set({ 
          status: 'expired',
          updatedAt: now
        })
        .where(
          and(
            eq(reservations.status, 'active'),
            lte(reservations.expiresAt, now)
          )
        );

      // Clear cache for affected apartments
      const apartmentIds = expiredReservations.map(r => r.apartmentId);
      const affectedApartments = Array.from(new Set(apartmentIds));
      await Promise.all(
        affectedApartments.map(apartmentId => this.clearAvailabilityCache(apartmentId))
      );

      this.logOperation('releaseExpiredReservations', { 
        count: expiredReservations.length,
        apartmentIds: affectedApartments
      });

      return expiredReservations.length;
    }, 'releaseExpiredReservations');
  }

  /**
   * Private helper methods
   */
  private async getConflictingBookings(
    apartmentId: number,
    checkInDate: Date,
    checkOutDate: Date,
    excludeBookingId?: number
  ): Promise<Booking[]> {
    const whereConditions = [
      eq(bookings.apartmentId, apartmentId),
      ne(bookings.status, 'cancelled'),
      // Overlap detection with same-day checkout/checkin logic
      this.SAME_DAY_CHECKOUT_CHECKIN_ALLOWED
        ? and(
            gte(bookings.checkOut, checkInDate.toISOString().split('T')[0]),
            lte(bookings.checkIn, checkOutDate.toISOString().split('T')[0])
          )
        : and(
            gte(bookings.checkOut, checkInDate.toISOString().split('T')[0]),
            lte(bookings.checkIn, checkOutDate.toISOString().split('T')[0])
          )
    ];

    if (excludeBookingId) {
      whereConditions.push(ne(bookings.id, excludeBookingId));
    }

    return await this.db
      .select()
      .from(bookings)
      .where(and(...whereConditions));
  }

  private async getConflictingReservations(
    apartmentId: number,
    checkInDate: Date,
    checkOutDate: Date,
    excludeReservationId?: number
  ): Promise<Reservation[]> {
    const now = new Date();
    const whereConditions = [
      eq(reservations.apartmentId, apartmentId),
      eq(reservations.status, 'active'),
      gte(reservations.expiresAt, now), // Only active, non-expired reservations
      and(
        gte(reservations.checkOut, checkInDate),
        lte(reservations.checkIn, checkOutDate)
      )
    ];

    if (excludeReservationId) {
      whereConditions.push(ne(reservations.id, excludeReservationId));
    }

    return await this.db
      .select()
      .from(reservations)
      .where(and(...whereConditions));
  }

  private async getBookingsInDateRange(
    apartmentId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Booking[]> {
    return await this.db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.apartmentId, apartmentId),
          ne(bookings.status, 'cancelled'),
          or(
            and(
              gte(bookings.checkIn, startDate.toISOString().split('T')[0]),
              lte(bookings.checkIn, endDate.toISOString().split('T')[0])
            ),
            and(
              gte(bookings.checkOut, startDate.toISOString().split('T')[0]),
              lte(bookings.checkOut, endDate.toISOString().split('T')[0])
            ),
            and(
              lte(bookings.checkIn, startDate.toISOString().split('T')[0]),
              gte(bookings.checkOut, endDate.toISOString().split('T')[0])
            )
          )
        )
      );
  }

  private async getReservationsInDateRange(
    apartmentId: number,
    startDate: Date,
    endDate: Date
  ): Promise<Reservation[]> {
    const now = new Date();
    return await this.db
      .select()
      .from(reservations)
      .where(
        and(
          eq(reservations.apartmentId, apartmentId),
          eq(reservations.status, 'active'),
          gte(reservations.expiresAt, now),
          or(
            and(
              gte(reservations.checkIn, startDate),
              lte(reservations.checkIn, endDate)
            ),
            and(
              gte(reservations.checkOut, startDate),
              lte(reservations.checkOut, endDate)
            ),
            and(
              lte(reservations.checkIn, startDate),
              gte(reservations.checkOut, endDate)
            )
          )
        )
      );
  }

  private async findNextAvailablePeriod(
    apartmentId: number,
    fromDate: Date
  ): Promise<{ startDate: string; endDate: string } | null> {
    // Look ahead 90 days for next available period
    const endDate = new Date(fromDate);
    endDate.setDate(endDate.getDate() + 90);

    const calendarData = await this.getCalendarAvailability(
      apartmentId,
      fromDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    );

    let availableStart: string | null = null;
    for (const day of calendarData) {
      if (day.isAvailable && !availableStart) {
        availableStart = day.date;
      } else if (!day.isAvailable && availableStart) {
        return {
          startDate: availableStart,
          endDate: calendarData[calendarData.indexOf(day) - 1].date
        };
      }
    }

    if (availableStart) {
      return {
        startDate: availableStart,
        endDate: calendarData[calendarData.length - 1].date
      };
    }

    return null;
  }

  private generateCacheKey(type: string, data: any): string {
    const dataStr = JSON.stringify(data);
    return `availability:${type}:${Buffer.from(dataStr).toString('base64')}`;
  }

  private async clearAvailabilityCache(apartmentId: number): Promise<void> {
    // Clear all cache entries related to this apartment
    const patterns = [
      `availability:availability:*${apartmentId}*`,
      `availability:calendar:*${apartmentId}*`
    ];
    
    for (const pattern of patterns) {
      await cacheService.clear(pattern);
    }
  }
}