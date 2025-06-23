import { db, databaseClient } from '../db';
// Potential issues identified in the code:

// 1. Inconsistent null handling in interfaces
interface CachedApartmentData {
  id: number
  roomNumber: string
  title: string
  description: string; // Not nullable but nullable in ApartmentWithTimestamps
  price: number
  discountPercentage: number; // Not nullable but nullable in ApartmentWithTimestamps
  bedrooms: number
  bathrooms: number
  squareFeet: number; // Not nullable but nullable in ApartmentWithTimestamps
  imageUrl: string; // Not nullable but nullable in ApartmentWithTimestamps
  images: string[]; // Not nullable but nullable in ApartmentWithTimestamps
  amenities: string[]; // Not nullable but nullable in ApartmentWithTimestamps
  isActive: boolean
  lastUpdated: Date
  updatedAt: Date
  modifiedAt?: Date; // Inconsistent timestamp naming (lastUpdated vs updatedAt vs modifiedAt)
}

// 2. Timestamp fields need standardization
interface ApartmentWithTimestamps {
  id: number
  roomNumber: string
  title: string
  description: string | null
  price: number
  discountPercentage: number | null
  bedrooms: number
  bathrooms: number
  squareFeet: number | null
  imageUrl: string | null
  images: string[] | null
  amenities: string[] | null
  // Missing timestamp fields that exist in CachedApartmentData
}

// 3. Error handling could be improved
import { apartments, bookings, affiliateLinks } from '@shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { log } from '../utils/logger';
import { DatabaseError } from '../errors';

// Type guard for Error objects
function isError(error: unknown): error is Error {
  return error instanceof Error || (typeof error === 'object' && error !== null && 'message' in error);
}

// Safe error message extraction
function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  return String(error);
}
interface CachedApartmentData {
  id: number;
  roomNumber: string;
  title: string;
  description: string;
  price: number;
  discountPercentage: number;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number;
  imageUrl: string;
  images: string[];
  amenities: string[];
  isActive: boolean;
  lastUpdated: Date;
  updatedAt: Date;
  modifiedAt?: Date;
}

interface ApartmentWithTimestamps {
  id: number;
  roomNumber: string;
  title: string;
  description: string | null;
  price: number;
  discountPercentage: number | null;
  bedrooms: number;
  bathrooms: number;
  squareFeet: number | null;
  imageUrl: string | null;
  images: string[] | null;
  amenities: string[] | null;
  updatedAt?: Date;
  modifiedAt?: Date;
}

interface AvailabilityCache {
  apartmentId: number;
  dateRange: string;
  isAvailable: boolean;
  lastChecked: Date;
  expiresAt: Date;
  checkIn: string;
  checkOut: string;
}

interface SyncMetrics {
  apartmentsSynced: number;
  availabilityChecks: number;
  cacheHits: number;
  cacheMisses: number;
  errors: number;
  lastSyncDuration: number;
}

/**
 * Enterprise-grade chatbot data synchronization service
 */
export class ChatbotDataSyncService {
  private static apartmentCache = new Map<number, CachedApartmentData>();
  private static availabilityCache = new Map<string, AvailabilityCache>();
  private static lastModifiedTimes = new Map<number, Date>();
  private static lastFullSync: Date | null = null;
  private static syncInterval: NodeJS.Timeout | null = null;
  private static isInitialized = false;
  private static isShuttingDown = false;
  private static syncInProgress = false;
  private static metrics: SyncMetrics = {
    apartmentsSynced: 0,
    availabilityChecks: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    lastSyncDuration: 0
  };

  // Cache configuration
  private static readonly CACHE_TTL_MINUTES = 10;
  private static readonly SYNC_INTERVAL_MINUTES = 5;
  private static readonly MAX_CACHE_SIZE = 1000;
  private static readonly AVAILABILITY_CACHE_TTL_MINUTES = 10;
  private static readonly MAX_SYNC_RETRIES = 3;
  private static readonly SYNC_RETRY_DELAY_MS = 5000;

  /**
   * Initialize the service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      log.warn('ChatbotDataSyncService already initialized');
      return;
    }

    let retries = 0;
    while (retries < this.MAX_SYNC_RETRIES) {
      try {
        await this.performFullSync();
        this.startPeriodicSync();
        this.isInitialized = true;
        log.info('ChatbotDataSyncService initialized successfully');
        return;
      } catch (error) {
        retries++;
        log.error(`Initialization attempt ${retries} failed:`, getErrorMessage(error));
        
        if (retries < this.MAX_SYNC_RETRIES) {
          log.info(`Retrying in ${this.SYNC_RETRY_DELAY_MS}ms...`);
          await new Promise(resolve => setTimeout(resolve, this.SYNC_RETRY_DELAY_MS));
        } else {
          log.error('Failed to initialize ChatbotDataSyncService after max retries');
          throw new Error(`Initialization failed after ${this.MAX_SYNC_RETRIES} attempts: ${getErrorMessage(error)}`);
        }
      }
    }
  }

  /**
   * Start periodic sync
   */
  private static startPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      try {
        await this.performIncrementalSync();
      } catch (error) {
        log.error('Periodic sync failed:', getErrorMessage(error));
      }
    }, this.SYNC_INTERVAL_MINUTES * 60 * 1000);
  }

  /**
   * Perform a full sync of all apartment data
   */
  private static async performFullSync(): Promise<void> {
    if (!databaseClient.isConnectionHealthy()) {
      throw new DatabaseError('Database connection is not healthy, skipping sync');
    }

    try {
      log.info('Starting full apartment data sync...');

      const apartmentData = await databaseClient.executeWithRetry(async () => {
        return await db.select().from(apartments);
      });

      // Update cache with fresh data
      this.apartmentCache.clear();
      
      for (const apt of apartmentData) {
        const cachedData: CachedApartmentData = {
          id: apt.id,
          roomNumber: apt.roomNumber,
          title: apt.title,
          description: apt.description || '',
          price: apt.price,
          discountPercentage: apt.discountPercentage || 0,
          bedrooms: apt.bedrooms,
          bathrooms: apt.bathrooms,
          squareFeet: apt.squareFeet || 0,
          imageUrl: apt.imageUrl || '',
          images: apt.images || [],
          amenities: apt.amenities || [],
          isActive: true,
          lastUpdated: new Date(),
          updatedAt: new Date(),
          modifiedAt: undefined
        };
        
        this.apartmentCache.set(apt.id, cachedData);
      }

      this.lastFullSync = new Date();
      log.info(`Full sync completed. Cached ${apartmentData.length} apartments.`);
    } catch (error) {
      log.error('Full sync failed:', getErrorMessage(error));
      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Perform incremental sync
   */
  private static async performIncrementalSync(): Promise<void> {
    if (this.syncInProgress) {
      log.debug('Sync already in progress, skipping');
      return;
    }

    if (!this.isInitialized) {
      log.warn('Service not initialized, skipping incremental sync');
      return;
    }

    this.syncInProgress = true;
    const startTime = Date.now();
    
    try {
      if (!databaseClient.isConnectionHealthy()) {
        throw new DatabaseError('Database connection is not healthy');
      }

      if (!this.lastFullSync) {
        await this.performFullSync();
        return;
      }

      // Get only changed apartments since last sync
      const changedApartments = await db.transaction(async (trx) => {
        // Find affected apartment IDs from bookings
        const bookingChanges = await trx
          .select({
            apartmentId: bookings.apartmentId
          })
          .from(bookings)
          .where(sql`${bookings.createdAt} >= ${this.lastFullSync}`);

        const affectedIds = new Set(bookingChanges.map(b => b.apartmentId));

        // Get full apartment data for affected IDs
        const apartmentData = await trx
          .select()
          .from(apartments)
          .where(sql`${apartments.id} = ANY(${Array.from(affectedIds)})`);

        return apartmentData;
      });

      if (changedApartments.length > 0) {
        log.info(`Updating ${changedApartments.length} changed apartments`);

        // Process in batches to avoid memory issues
        const BATCH_SIZE = 25;
        for (let i = 0; i < changedApartments.length; i += BATCH_SIZE) {
          const batch = changedApartments.slice(i, i + BATCH_SIZE);
          
          for (const apt of batch) {
            const cachedData: CachedApartmentData = {
              id: apt.id,
              roomNumber: apt.roomNumber,
              title: apt.title,
              description: apt.description || '',
              price: apt.price,
              discountPercentage: apt.discountPercentage || 0,
              bedrooms: apt.bedrooms,
              bathrooms: apt.bathrooms,
              squareFeet: apt.squareFeet || 0,
              imageUrl: apt.imageUrl || '',
              images: apt.images || [],
              amenities: apt.amenities || [],
              isActive: true,
              lastUpdated: new Date(),
              updatedAt: new Date(),
              modifiedAt: undefined
            };
            
            this.apartmentCache.set(apt.id, cachedData);
            this.lastModifiedTimes.set(apt.id, new Date());
          }

          // Allow other operations between batches
          await new Promise(resolve => setTimeout(resolve, 0));
        }
      }

      this.lastFullSync = new Date();
      this.metrics.lastSyncDuration = Date.now() - startTime;
      this.metrics.apartmentsSynced += changedApartments.length;
      
      // Cleanup expired cache entries
      await this.cleanupExpiredCache();
      
    } catch (error) {
      this.metrics.errors++;
      log.error('Incremental sync failed:', getErrorMessage(error));
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get all cached apartment data with improved error handling
   */
  static getCachedApartments(): CachedApartmentData[] {
    try {
      return Array.from(this.apartmentCache.values())
        .filter(apt => apt.isActive)
        .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
    } catch (error) {
      log.error('Error getting cached apartments:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Get apartment by room number from cache with improved error handling
   */
  static getCachedApartmentByRoomNumber(roomNumber: string): CachedApartmentData | null {
    try {
      const apartments = Array.from(this.apartmentCache.values());
      return apartments.find(apt => apt.roomNumber === roomNumber && apt.isActive) || null;
    } catch (error) {
      log.error('Error getting apartment by room number:', getErrorMessage(error));
      return null;
    }
  }

  /**
   * Check real-time availability with caching
   */
  static async checkAvailabilityWithCache(
    apartmentId: number, 
    checkIn: string, 
    checkOut: string
  ): Promise<boolean> {
    try {
      const cacheKey = `${apartmentId}-${checkIn}-${checkOut}`;
      const cached = this.availabilityCache.get(cacheKey);
      
      // Use cache if less than TTL minutes old
      if (cached && (Date.now() - cached.lastChecked.getTime()) < this.CACHE_TTL_MINUTES * 60 * 1000) {
        this.metrics.cacheHits++;
        return cached.isAvailable;
      }

      this.metrics.cacheMisses++;

      // Convert dates to ISO strings for database comparison
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
        throw new Error('Invalid date format provided');
      }

      const checkInISO = checkInDate.toISOString().split('T')[0];
      const checkOutISO = checkOutDate.toISOString().split('T')[0];

      // Check real availability using optimized query
      const conflictingBookings = await db
        .select()
        .from(bookings)
        .where(and(
          eq(bookings.apartmentId, apartmentId),
          sql`(${bookings.status} = 'confirmed' OR ${bookings.status} = 'pending')`,
          sql`NOT (
            ${bookings.checkOut} <= ${checkInISO}::date
            OR ${bookings.checkIn} >= ${checkOutISO}::date
          )`
        ));

      const isAvailable = conflictingBookings.length === 0;

      // Cache the result with expiration
      const now = new Date();
      this.availabilityCache.set(cacheKey, {
        apartmentId,
        dateRange: `${checkIn}-${checkOut}`,
        isAvailable,
        lastChecked: now,
        expiresAt: new Date(now.getTime() + this.CACHE_TTL_MINUTES * 60 * 1000),
        checkIn,
        checkOut
      });

      // Update metrics
      this.metrics.availabilityChecks++;

      return isAvailable;
    } catch (error) {
      this.metrics.errors++;
      log.error('Availability check failed:', getErrorMessage(error));
      throw new Error(`Failed to check availability for apartment ${apartmentId}: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Get available apartments with filters
   */
  static async getAvailableApartmentsWithFilters(
    checkIn?: string,
    checkOut?: string,
    guestCount?: number,
    budgetRange?: { min: number; max: number }
  ): Promise<CachedApartmentData[]> {
    try {
      let availableApartments = this.getCachedApartments();

      // Filter by availability if dates provided
      if (checkIn && checkOut) {
        const availabilityChecks = await Promise.all(
          availableApartments.map(async apt => ({
            ...apt,
            isAvailable: await this.checkAvailabilityWithCache(apt.id, checkIn, checkOut)
          }))
        );
        availableApartments = availabilityChecks.filter(apt => apt.isAvailable);
      }

      // Filter by guest count (assuming bedrooms * 2 = max guests)
      if (guestCount !== undefined && guestCount > 0) {
        availableApartments = availableApartments.filter(apt => 
          apt.bedrooms * 2 >= guestCount
        );
      }

      // Filter by budget range (considering discounts)
      if (budgetRange) {
        availableApartments = availableApartments.filter(apt => {
          const finalPrice = apt.discountPercentage > 0
            ? Math.round(apt.price * (1 - apt.discountPercentage / 100))
            : apt.price;
          return finalPrice >= budgetRange.min && finalPrice <= budgetRange.max;
        });
      }

      return availableApartments;
    } catch (error) {
      log.error('Failed to get available apartments with filters:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Apply affiliate discounts with caching
   */
  static async applyAffiliateDiscountsWithCache(
    basePrice: number,
    affiliateCode?: string,
    stayDuration?: number
  ): Promise<{ finalPrice: number; discount: number; affiliateDiscount: number }> {
    try {
      if (!affiliateCode) {
        return { finalPrice: basePrice, discount: 0, affiliateDiscount: 0 };
      }

      // Get affiliate link details
      const affiliateLink = await db
        .select()
        .from(affiliateLinks)
        .where(and(
          eq(affiliateLinks.linkCode, affiliateCode),
          eq(affiliateLinks.isActive, true)
        ))
        .limit(1);

      if (affiliateLink.length === 0) {
        return { finalPrice: basePrice, discount: 0, affiliateDiscount: 0 };
      }

      const link = affiliateLink[0];
      let affiliateDiscount = 0;

      // Apply long-stay discount if enabled and eligible
      if (link.longStayDiscountEnabled && 
          stayDuration && 
          link.longStayMinDays && 
          stayDuration >= link.longStayMinDays) {
        if (link.longStayDiscountType === 'percentage' && link.longStayDiscountValue) {
          affiliateDiscount = Math.round(basePrice * (link.longStayDiscountValue / 100));
        } else if (link.longStayDiscountType === 'fixed' && link.longStayDiscountValue) {
          affiliateDiscount = link.longStayDiscountValue;
        }
      }

      // Apply legacy price adjustments if no long-stay discount
      if (affiliateDiscount === 0) {
        if (link.adjustmentType === 'subtract' && link.priceAdjustment) {
          affiliateDiscount = link.priceAdjustment;
        } else if (link.adjustmentType === 'percentage' && 
                  link.discountPercentage && 
                  link.discountPercentage > 0) {
          affiliateDiscount = Math.round(basePrice * (link.discountPercentage / 100));
        }
      }

      const finalPrice = Math.max(basePrice - affiliateDiscount, 0);

      return { 
        finalPrice, 
        discount: basePrice - finalPrice, 
        affiliateDiscount 
      };
    } catch (error) {
      log.error('Failed to apply affiliate discounts:', getErrorMessage(error));
      return { finalPrice: basePrice, discount: 0, affiliateDiscount: 0 };
    }
  }

  /**
   * Clear all caches
   */
  static clearCache(): void {
    this.apartmentCache.clear();
    this.availabilityCache.clear();
    this.lastFullSync = null;
    log.info('All caches cleared');
  }

  /**
   * Stop the sync service
   */
  static stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.clearCache();
    log.info('Chatbot Data Sync Service stopped');
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return {
      apartmentCount: this.apartmentCache.size,
      availabilityCacheSize: this.availabilityCache.size,
      lastFullSync: this.lastFullSync,
      isRunning: this.syncInterval !== null
    };
  }

  /**
   * Perform graceful shutdown
   */
  static shutdown(): void {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    
    try {
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
        log.info('Chatbot data sync service stopped');
      }

      // Clear caches to free memory
      this.clearCache();
      log.info('Chatbot data sync service shutdown complete');
    } catch (error) {
      log.error('Error during chatbot sync service shutdown:', getErrorMessage(error));
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Safe iteration for Map values in older environments
   */
  private static getCacheValues<T>(cache: Map<any, T>): T[] {
    return Array.from(cache.values());
  }

  /**
   * Clean up expired cache entries with improved memory management
   */
  private static async cleanupExpiredCache(): Promise<void> {
    const now = Date.now();
    let cleanedEntries = 0;
    
    try {
      // Cleanup availability cache
      const availabilityEntries = Array.from(this.availabilityCache.entries());
      for (const [key, entry] of availabilityEntries) {
        if (now >= entry.expiresAt.getTime()) {
          this.availabilityCache.delete(key);
          cleanedEntries++;
        }
      }

      // If cache is too large, remove oldest entries
      if (this.availabilityCache.size > this.MAX_CACHE_SIZE) {
        const entries = Array.from(this.availabilityCache.entries())
          .sort((a, b) => a[1].lastChecked.getTime() - b[1].lastChecked.getTime());
        
        const toRemove = entries.slice(0, entries.length - this.MAX_CACHE_SIZE);
        toRemove.forEach(([key]) => {
          this.availabilityCache.delete(key);
          cleanedEntries++;
        });
      }

      // Clean up apartment cache entries that haven't been accessed recently
      const APARTMENT_CACHE_TTL = this.CACHE_TTL_MINUTES * 60 * 1000;
      const apartmentEntries = Array.from(this.apartmentCache.entries());
      for (const [id, apt] of apartmentEntries) {
        if (now - apt.lastUpdated.getTime() > APARTMENT_CACHE_TTL) {
          this.apartmentCache.delete(id);
          this.lastModifiedTimes.delete(id);
          cleanedEntries++;
        }
      }

      if (cleanedEntries > 0) {
        log.debug(`Cleaned up ${cleanedEntries} expired cache entries`);
      }

      // Force garbage collection if too much memory is used
      if (cleanedEntries > 100 && typeof global.gc === 'function') {
        global.gc();
      }
    } catch (error) {
      log.error('Error during cache cleanup:', getErrorMessage(error));
    }
  }
}

// Auto-initialize when module is loaded
ChatbotDataSyncService.initialize().catch(error => {
  log.error('Failed to auto-initialize ChatbotDataSyncService:', error);
});
