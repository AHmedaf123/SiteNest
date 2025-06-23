import { useState, useEffect } from 'react';
import { useRealAuth } from './useRealAuth';
import { useBookingDates } from '../contexts/BookingContext';

interface AffiliatePricing {
  hasAffiliatePricing: boolean;
  // Legacy fields
  priceAdjustment?: number;
  adjustmentType?: 'add' | 'subtract' | 'percentage';
  discountPercentage?: number;
  additionalAmount?: number;
  additionalDiscount?: number;
  // New long-stay discount fields
  longStayDiscountEnabled?: boolean;
  longStayMinDays?: number;
  longStayDiscountType?: 'percentage' | 'flat';
  longStayDiscountValue?: number;
  longStayDiscountApplies?: boolean;
  stayDuration?: number;
  affiliateId?: string;
}

export function useAffiliatePricing() {
  const { isAuthenticated } = useRealAuth();
  const { bookingDates } = useBookingDates();
  const [affiliatePricing, setAffiliatePricing] = useState<AffiliatePricing>({
    hasAffiliatePricing: false
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch affiliate pricing on initial load and URL changes
  useEffect(() => {
    const handleLocationChange = () => {
      fetchAffiliatePricing(bookingDates.checkIn, bookingDates.checkOut);
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleLocationChange);

    // Fetch on initial load
    fetchAffiliatePricing(bookingDates.checkIn, bookingDates.checkOut);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [bookingDates.checkIn, bookingDates.checkOut]);

  // When authentication status changes, only re-fetch if we don't already have affiliate pricing
  // This prevents losing affiliate pricing when user logs in
  useEffect(() => {
    if (isAuthenticated && !affiliatePricing.hasAffiliatePricing) {
      // User just logged in and we don't have affiliate pricing yet, try to fetch it
      const timer = setTimeout(() => {
        fetchAffiliatePricing(bookingDates.checkIn, bookingDates.checkOut);
      }, 100); // Small delay to prevent rapid re-fetching

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, bookingDates.checkIn, bookingDates.checkOut]);

  const fetchAffiliatePricing = async (checkIn?: string, checkOut?: string) => {
    try {
      setIsLoading(true);

      // Check for affiliate reference in URL parameters first
      const urlParams = new URLSearchParams(window.location.search);
      const refParam = urlParams.get('ref');

      // Get stored affiliate reference from localStorage
      const storedRef = localStorage.getItem('sitenest_affiliate_ref');

      // If we have a ref parameter in URL, store it and clean the URL
      if (refParam) {
        localStorage.setItem('sitenest_affiliate_ref', refParam);

        // Clean the URL for SEO (remove ref parameter but keep other params)
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('ref');
        const cleanUrl = newUrl.pathname + (newUrl.search || '');
        window.history.replaceState({}, document.title, cleanUrl);
      }

      // Use the ref from URL or localStorage
      const affiliateRef = refParam || storedRef;

      // Build query parameters
      const queryParams = new URLSearchParams();
      if (affiliateRef) {
        queryParams.set('ref', affiliateRef);
      }
      if (checkIn) {
        queryParams.set('checkIn', checkIn);
      }
      if (checkOut) {
        queryParams.set('checkOut', checkOut);
      }

      // If user is authenticated, try authenticated endpoint first
      if (isAuthenticated) {
        try {
          const token = localStorage.getItem('sitenest_token');

          const authApiUrl = `/api/pricing/affiliate?${queryParams.toString()}`;

          const authResponse = await fetch(authApiUrl, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (authResponse.ok) {
            const authData = await authResponse.json();
            setAffiliatePricing(authData);
            return; // Exit early if authenticated endpoint works
          }
        } catch (authError) {
          // Fall through to public endpoint if authenticated fails
        }
      }

      // Use public endpoint (for non-authenticated users or if authenticated endpoint failed)
      const apiUrl = `/api/pricing/affiliate/public?${queryParams.toString()}`;

      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();
        setAffiliatePricing(data);
      }
    } catch (error) {
      console.error('Failed to fetch affiliate pricing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate adjusted price based on affiliate settings
  // This function takes the already-discounted price and applies affiliate adjustments
  const calculateAdjustedPrice = (discountedPrice: number): number => {
    if (!affiliatePricing.hasAffiliatePricing) {
      return discountedPrice;
    }

    let finalPrice = discountedPrice;

    // Apply long-stay discount if it applies
    if (affiliatePricing.longStayDiscountApplies && affiliatePricing.longStayDiscountValue) {
      if (affiliatePricing.longStayDiscountType === 'percentage') {
        finalPrice = finalPrice * (1 - affiliatePricing.longStayDiscountValue / 100);
      } else if (affiliatePricing.longStayDiscountType === 'flat') {
        finalPrice = Math.max(0, finalPrice - affiliatePricing.longStayDiscountValue);
      }
    }
    // Apply legacy dual adjustments if available and no long-stay discount
    else if (affiliatePricing.additionalAmount || affiliatePricing.additionalDiscount) {
      // Add additional amount first
      if (affiliatePricing.additionalAmount && affiliatePricing.additionalAmount > 0) {
        finalPrice += affiliatePricing.additionalAmount;
      }

      // Then apply additional discount
      if (affiliatePricing.additionalDiscount && affiliatePricing.additionalDiscount > 0) {
        finalPrice = finalPrice * (1 - affiliatePricing.additionalDiscount / 100);
      }
    }
    // Legacy support for old adjustment format
    else {
      const { adjustmentType, priceAdjustment = 0, discountPercentage = 0 } = affiliatePricing;

      switch (adjustmentType) {
        case 'add':
          finalPrice = discountedPrice + priceAdjustment;
          break;
        case 'subtract':
          finalPrice = Math.max(0, discountedPrice - priceAdjustment);
          break;
        case 'percentage':
          finalPrice = Math.max(0, discountedPrice - (discountedPrice * discountPercentage / 100));
          break;
      }
    }

    return Math.max(0, Math.round(finalPrice));
  };

  // Get affiliate discount amount (difference between discounted price and final affiliate price)
  const getAffiliateDiscountAmount = (discountedPrice: number): number => {
    if (!affiliatePricing.hasAffiliatePricing) {
      return 0;
    }

    const adjustedPrice = calculateAdjustedPrice(discountedPrice);
    return Math.max(0, discountedPrice - adjustedPrice);
  };

  // Get long-stay discount percentage if applicable
  const getLongStayDiscountPercentage = (): number => {
    if (!affiliatePricing.hasAffiliatePricing || !affiliatePricing.longStayDiscountApplies) {
      return 0;
    }

    if (affiliatePricing.longStayDiscountType === 'percentage') {
      return affiliatePricing.longStayDiscountValue || 0;
    }

    return 0;
  };

  // Check if long-stay discount is active
  const hasLongStayDiscount = (): boolean => {
    return !!(affiliatePricing.hasAffiliatePricing && affiliatePricing.longStayDiscountApplies);
  };

  // Get affiliate additional amount
  const getAffiliateAdditionalAmount = (): number => {
    if (!affiliatePricing.hasAffiliatePricing) {
      return 0;
    }

    return affiliatePricing.additionalAmount || 0;
  };

  // Get affiliate discount percentage (based on discounted price)
  const getAffiliateDiscountPercentage = (discountedPrice: number): number => {
    if (!affiliatePricing.hasAffiliatePricing || discountedPrice === 0) {
      return 0;
    }

    return affiliatePricing.additionalDiscount || 0;
  };

  // Format price adjustment for display
  const formatPriceAdjustment = (): string => {
    if (!affiliatePricing.hasAffiliatePricing) {
      return '';
    }

    const adjustments = [];

    // New dual adjustments
    if (affiliatePricing.additionalAmount && affiliatePricing.additionalAmount > 0) {
      adjustments.push(`+${affiliatePricing.additionalAmount} PKR`);
    }

    if (affiliatePricing.additionalDiscount && affiliatePricing.additionalDiscount > 0) {
      adjustments.push(`-${affiliatePricing.additionalDiscount}%`);
    }

    // Legacy adjustments
    if (adjustments.length === 0) {
      const { adjustmentType, priceAdjustment = 0, discountPercentage = 0 } = affiliatePricing;

      switch (adjustmentType) {
        case 'add':
          return `+${priceAdjustment} PKR`;
        case 'subtract':
          return `-${priceAdjustment} PKR`;
        case 'percentage':
          return `-${discountPercentage}%`;
        default:
          return '';
      }
    }

    return adjustments.join(' + ');
  };

  // Clear affiliate reference (useful for testing or manual clearing)
  const clearAffiliateRef = () => {
    localStorage.removeItem('sitenest_affiliate_ref');
    setAffiliatePricing({ hasAffiliatePricing: false });
  };

  // Get current affiliate reference
  const getCurrentAffiliateRef = (): string | null => {
    return localStorage.getItem('sitenest_affiliate_ref');
  };

  return {
    affiliatePricing,
    isLoading,
    calculateAdjustedPrice,
    getAffiliateDiscountAmount,
    getAffiliateAdditionalAmount,
    getAffiliateDiscountPercentage,
    getLongStayDiscountPercentage,
    hasLongStayDiscount,
    formatPriceAdjustment,
    clearAffiliateRef,
    getCurrentAffiliateRef,
    refetch: fetchAffiliatePricing
  };
}
