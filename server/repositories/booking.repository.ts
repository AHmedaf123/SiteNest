/**
 * Booking Repository
 * Handles all database operations for bookings with proper error handling and optimization
 */

import { BaseRepository, PaginationOptions, PaginationResult } from './base.repository';
import { bookings, apartments, users, type Booking, type Apartment, type User } from '@shared/schema';
import { eq, and, or, gte, lte, desc, asc, count } from 'drizzle-orm';

export interface BookingWithDetails extends Booking {
  apartment: Apartment;
  user: User;
}

export interface BookingSearchFilters {
  userId?: string;
  apartmentId?: number;
  status?: string;
  paymentStatus?: string;
  checkInFrom?: Date;
  checkInTo?: Date;
  checkOutFrom?: Date;
  checkOutTo?: Date;
  totalAmountMin?: number;
  totalAmountMax?: number;
  guests?: number;
}

export interface AvailabilityQuery {
  apartmentId: number;
  checkIn: Date;
  checkOut: Date;
  excludeBookingId?: number;
}

export class BookingRepository extends BaseRepository<Booking> {
  constructor() {
    super('bookings', 'BookingRepository');
  }

  /**
   * Create a new booking
   */
  async create(data: Partial<Booking>): Promise<Booking> {
    return this.executeQuery(async () => {
      this.logOperation('create', { apartmentId: data.apartmentId, customerId: data.customerId });

      // Validate required fields
      this.validateRequiredFields(data, [
        'apartmentId', 'customerId', 'checkIn', 'checkOut', 
        'guests', 'totalAmount', 'status'
      ]);

      // Sanitize data
      const sanitizedData = this.sanitizeData(data);

      // Add timestamps
      const bookingData = {
        ...sanitizedData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await this.db
        .insert(bookings)
        .values(bookingData as any)
        .returning();

      return result[0];
    }, 'create', { apartmentId: data.apartmentId, customerId: data.customerId });
  }

  /**
   * Find booking by ID
   */
  async findById(id: string | number): Promise<Booking | null> {
    return this.executeQuery(async () => {
      this.logOperation('findById', { id });

      const result = await this.db
        .select()
        .from(bookings)
        .where(eq(bookings.id, Number(id)))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    }, 'findById', { id });
  }

  /**
   * Find booking by ID with apartment and user details
   */
  async findByIdWithDetails(id: string | number): Promise<BookingWithDetails | null> {
    return this.executeQuery(async () => {
      this.logOperation('findByIdWithDetails', { id });

      const result = await this.db
        .select({
          booking: bookings,
          apartment: apartments,
          user: users
        })
        .from(bookings)
        .leftJoin(apartments, eq(bookings.apartmentId, apartments.id))
        .leftJoin(users, eq(bookings.customerId, users.id))
        .where(eq(bookings.id, Number(id)))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        ...row.booking,
        apartment: row.apartment!,
        user: row.user!
      };
    }, 'findByIdWithDetails', { id });
  }

  /**
   * Update booking by ID
   */
  async update(id: string | number, data: Partial<Booking>): Promise<Booking> {
    return this.executeQuery(async () => {
      this.logOperation('update', { id, ...data });

      // Sanitize data
      const sanitizedData = this.sanitizeData(data);

      // Add updated timestamp
      const updateData = {
        ...sanitizedData,
        updatedAt: new Date()
      };

      const result = await this.db
        .update(bookings)
        .set(updateData as any)
        .where(eq(bookings.id, Number(id)))
        .returning();

      if (result.length === 0) {
        throw new Error(`Booking with ID ${id} not found`);
      }

      return result[0];
    }, 'update', { id });
  }

  /**
   * Delete booking by ID
   */
  async delete(id: string | number): Promise<boolean> {
    return this.executeQuery(async () => {
      this.logOperation('delete', { id });

      const result = await this.db
        .delete(bookings)
        .where(eq(bookings.id, Number(id)))
        .returning();

      return result.length > 0;
    }, 'delete', { id });
  }

  /**
   * Find bookings with filters and pagination
   */
  async findMany(
    filters: BookingSearchFilters = {},
    options: PaginationOptions = {}
  ): Promise<PaginationResult<BookingWithDetails>> {
    return this.executeQuery(async () => {
      this.logOperation('findMany', { filters, options });

      const validatedOptions = this.validatePaginationOptions(options);
      const { page, limit, sortBy, sortOrder } = validatedOptions;

      // Build where conditions
      const whereConditions = [];

      if (filters.userId) {
        whereConditions.push(eq(bookings.customerId, Number(filters.userId)));
      }

      if (filters.apartmentId) {
        whereConditions.push(eq(bookings.apartmentId, filters.apartmentId));
      }

      if (filters.status) {
        whereConditions.push(eq(bookings.status, filters.status));
      }

      if (filters.paymentStatus) {
        whereConditions.push(eq(bookings.paymentStatus, filters.paymentStatus));
      }

      if (filters.checkInFrom) {
        whereConditions.push(gte(bookings.checkIn, filters.checkInFrom.toISOString()));
      }

      if (filters.checkInTo) {
        whereConditions.push(lte(bookings.checkIn, filters.checkInTo.toISOString()));
      }

      if (filters.checkOutFrom) {
        whereConditions.push(gte(bookings.checkOut, filters.checkOutFrom.toISOString()));
      }

      if (filters.checkOutTo) {
        whereConditions.push(lte(bookings.checkOut, filters.checkOutTo.toISOString()));
      }

      if (filters.totalAmountMin) {
        whereConditions.push(gte(bookings.totalAmount, filters.totalAmountMin));
      }

      if (filters.totalAmountMax) {
        whereConditions.push(lte(bookings.totalAmount, filters.totalAmountMax));
      }

      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      // Get total count
      const totalResult = await this.db
        .select({ count: count() })
        .from(bookings)
        .where(whereClause);

      const total = totalResult[0].count;

      // Build order by
      const orderBy = this.buildOrderBy(bookings, sortBy, sortOrder) || desc(bookings.createdAt);

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
        .where(whereClause)
        .orderBy(orderBy)
        .limit(limit)
        .offset(offset);

      const bookingsWithDetails = results.map(result => ({
        ...result.booking,
        apartment: result.apartment!,
        user: result.user!
      }));

      return {
        items: bookingsWithDetails,
        pagination: this.buildPaginationMetadata(total, page, limit)
      };
    }, 'findMany', { filters, options });
  }

  /**
   * Count bookings with filters
   */
  async count(filters: BookingSearchFilters = {}): Promise<number> {
    return this.executeQuery(async () => {
      this.logOperation('count', filters);

      const whereConditions = this.buildWhereConditions(filters, bookings);
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const result = await this.db
        .select({ count: count() })
        .from(bookings)
        .where(whereClause);

      return result[0].count;
    }, 'count', filters);
  }

  /**
   * Check if booking exists
   */
  async exists(conditions: Record<string, any>): Promise<boolean> {
    return this.executeQuery(async () => {
      this.logOperation('exists', conditions);

      const whereConditions = this.buildWhereConditions(conditions, bookings);
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const result = await this.db
        .select({ count: count() })
        .from(bookings)
        .where(whereClause)
        .limit(1);

      return result[0].count > 0;
    }, 'exists', conditions);
  }

  /**
   * Create multiple bookings
   */
  async createMany(data: Partial<Booking>[]): Promise<Booking[]> {
    return this.executeQuery(async () => {
      this.logOperation('createMany', { count: data.length });

      // Validate and sanitize all records
      const sanitizedData = data.map(booking => {
        this.validateRequiredFields(booking, [
          'apartmentId', 'userId', 'checkIn', 'checkOut', 
          'guests', 'totalAmount', 'status'
        ]);

        return {
          ...this.sanitizeData(booking),
          createdAt: new Date(),
          updatedAt: new Date()
        };
      });

      const result = await this.db
        .insert(bookings)
        .values(sanitizedData as any)
        .returning();

      return result;
    }, 'createMany', { count: data.length });
  }

  /**
   * Update multiple bookings
   */
  async updateMany(conditions: Record<string, any>, data: Partial<Booking>): Promise<number> {
    return this.executeQuery(async () => {
      this.logOperation('updateMany', { conditions, data });

      const whereConditions = this.buildWhereConditions(conditions, bookings);
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const sanitizedData = this.sanitizeData(data);
      const updateData = {
        ...sanitizedData,
        updatedAt: new Date()
      };

      const result = await this.db
        .update(bookings)
        .set(updateData as any)
        .where(whereClause)
        .returning();

      return result.length;
    }, 'updateMany', { conditions });
  }

  /**
   * Delete multiple bookings
   */
  async deleteMany(conditions: Record<string, any>): Promise<number> {
    return this.executeQuery(async () => {
      this.logOperation('deleteMany', conditions);

      const whereConditions = this.buildWhereConditions(conditions, bookings);
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const result = await this.db
        .delete(bookings)
        .where(whereClause)
        .returning();

      return result.length;
    }, 'deleteMany', conditions);
  }

  /**
   * Check apartment availability for given dates
   */
  async checkAvailability(query: AvailabilityQuery): Promise<Booking[]> {
    return this.executeQuery(async () => {
      this.logOperation('checkAvailability', query);

      const conditions = [
        eq(bookings.apartmentId, query.apartmentId),
        or(
          // New booking starts during existing booking
          and(
            gte(bookings.checkIn, query.checkIn.toISOString()),
            lte(bookings.checkIn, query.checkOut.toISOString())
          ),
          // New booking ends during existing booking
          and(
            gte(bookings.checkOut, query.checkIn.toISOString()),
            lte(bookings.checkOut, query.checkOut.toISOString())
          ),
          // New booking completely encompasses existing booking
          and(
            lte(bookings.checkIn, query.checkIn.toISOString()),
            gte(bookings.checkOut, query.checkOut.toISOString())
          )
        )
      ];

      // Exclude specific booking if provided (for updates)
      if (query.excludeBookingId) {
        conditions.push(eq(bookings.id, query.excludeBookingId));
      }

      const result = await this.db
        .select()
        .from(bookings)
        .where(and(...conditions));

      return result;
    }, 'checkAvailability', query);
  }

  /**
   * Get bookings by user ID
   */
  async findByUserId(userId: string, options: PaginationOptions = {}): Promise<PaginationResult<BookingWithDetails>> {
    return this.findMany({ userId }, options);
  }

  /**
   * Get bookings by apartment ID
   */
  async findByApartmentId(apartmentId: number, options: PaginationOptions = {}): Promise<PaginationResult<BookingWithDetails>> {
    return this.findMany({ apartmentId }, options);
  }

  /**
   * Get upcoming bookings
   */
  async findUpcoming(options: PaginationOptions = {}): Promise<PaginationResult<BookingWithDetails>> {
    const today = new Date();
    return this.findMany({ checkInFrom: today }, options);
  }

  /**
   * Get bookings by status
   */
  async findByStatus(status: string, options: PaginationOptions = {}): Promise<PaginationResult<BookingWithDetails>> {
    return this.findMany({ status }, options);
  }
}
