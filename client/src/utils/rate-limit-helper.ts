/**
 * Rate limit helper utilities for development and testing
 */

export const rateLimitHelper = {
  /**
   * Check if we're currently rate limited based on local storage
   */
  isRateLimited(): boolean {
    const lastRateLimit = localStorage.getItem('sitenest_last_rate_limit');
    if (!lastRateLimit) return false;
    
    const rateLimitTime = parseInt(lastRateLimit);
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    
    return (now - rateLimitTime) < fifteenMinutes;
  },

  /**
   * Get remaining time until rate limit expires
   */
  getRemainingTime(): number {
    const lastRateLimit = localStorage.getItem('sitenest_last_rate_limit');
    if (!lastRateLimit) return 0;
    
    const rateLimitTime = parseInt(lastRateLimit);
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    const elapsed = now - rateLimitTime;
    
    return Math.max(0, fifteenMinutes - elapsed);
  },

  /**
   * Record a rate limit occurrence
   */
  recordRateLimit(): void {
    localStorage.setItem('sitenest_last_rate_limit', Date.now().toString());
  },

  /**
   * Clear rate limit record (for testing)
   */
  clearRateLimit(): void {
    localStorage.removeItem('sitenest_last_rate_limit');
  },

  /**
   * Get formatted remaining time string
   */
  getFormattedRemainingTime(): string {
    const remaining = this.getRemainingTime();
    if (remaining === 0) return '0 minutes';
    
    const minutes = Math.ceil(remaining / (60 * 1000));
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
};

// Add to window for debugging in development
if (process.env.NODE_ENV === 'development') {
  (window as any).rateLimitHelper = rateLimitHelper;
}