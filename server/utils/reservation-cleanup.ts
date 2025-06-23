/**
 * Reservation Cleanup Utility
 * Handles automatic cleanup of expired reservations
 */

import { AvailabilityService } from '../services/availability.service';
import { log } from './logger';

export class ReservationCleanup {
  private static instance: ReservationCleanup;
  private availabilityService: AvailabilityService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.availabilityService = new AvailabilityService();
  }

  static getInstance(): ReservationCleanup {
    if (!ReservationCleanup.instance) {
      ReservationCleanup.instance = new ReservationCleanup();
    }
    return ReservationCleanup.instance;
  }

  /**
   * Start automatic cleanup of expired reservations
   */
  startCleanup(): void {
    if (this.cleanupInterval) {
      log.warn('Reservation cleanup already running');
      return;
    }

    log.info('Starting reservation cleanup service');
    
    // Run cleanup immediately
    this.runCleanup();

    // Schedule periodic cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      log.info('Reservation cleanup service stopped');
    }
  }

  /**
   * Run cleanup manually
   */
  async runCleanup(): Promise<number> {
    try {
      const releasedCount = await this.availabilityService.releaseExpiredReservations();
      
      if (releasedCount > 0) {
        log.info(`Released ${releasedCount} expired reservations`);
      }
      
      return releasedCount;
    } catch (error) {
      log.error('Error during reservation cleanup', error);
      return 0;
    }
  }

  /**
   * Get cleanup status
   */
  getStatus(): {
    isRunning: boolean;
    intervalMs: number;
    nextCleanupIn?: number;
  } {
    return {
      isRunning: this.cleanupInterval !== null,
      intervalMs: this.CLEANUP_INTERVAL_MS,
      nextCleanupIn: this.cleanupInterval ? this.CLEANUP_INTERVAL_MS : undefined
    };
  }
}

// Export singleton instance
export const reservationCleanup = ReservationCleanup.getInstance();