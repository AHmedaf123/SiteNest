import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useAffiliatePricing } from "@/hooks/useAffiliatePricing";
import { Tag, Percent } from "lucide-react";

interface ComprehensivePricingProps {
  originalPrice: number;
  discountPercentage?: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showNightLabel?: boolean;
}

export default function ComprehensivePricing({ 
  originalPrice, 
  discountPercentage = 0,
  className = "", 
  size = 'md',
  showNightLabel = true
}: ComprehensivePricingProps) {
  const {
    affiliatePricing,
    calculateAdjustedPrice,
    getAffiliateDiscountAmount,
    getAffiliateAdditionalAmount,
    getAffiliateDiscountPercentage,
    getLongStayDiscountPercentage,
    hasLongStayDiscount
  } = useAffiliatePricing();

  // Memoize calculations to prevent rapid re-renders
  const pricingData = useMemo(() => {
    // Calculate the discounted price (after original listing discount)
    const discountedPrice = discountPercentage > 0
      ? Math.round(originalPrice * (1 - discountPercentage / 100))
      : originalPrice;

    // Calculate affiliate adjusted price (applied to discounted price)
    const affiliatePrice = calculateAdjustedPrice(discountedPrice);
    const affiliateDiscountAmount = getAffiliateDiscountAmount(discountedPrice);
    const affiliateAdditionalAmount = getAffiliateAdditionalAmount();
    const affiliateDiscountPercentage = getAffiliateDiscountPercentage(discountedPrice);
    const longStayDiscountPercentage = getLongStayDiscountPercentage();
    const isLongStayDiscount = hasLongStayDiscount();

    const hasOriginalDiscount = discountPercentage > 0;
    const hasAffiliateAdjustments = affiliatePricing.hasAffiliatePricing &&
      (affiliateAdditionalAmount > 0 || affiliateDiscountAmount > 0 || isLongStayDiscount);

    return {
      discountedPrice,
      affiliatePrice,
      affiliateDiscountAmount,
      affiliateAdditionalAmount,
      affiliateDiscountPercentage,
      longStayDiscountPercentage,
      isLongStayDiscount,
      hasOriginalDiscount,
      hasAffiliateAdjustments
    };
  }, [
    originalPrice,
    discountPercentage,
    affiliatePricing.hasAffiliatePricing,
    calculateAdjustedPrice,
    getAffiliateDiscountAmount,
    getAffiliateAdditionalAmount,
    getAffiliateDiscountPercentage
  ]);

  const {
    discountedPrice,
    affiliatePrice,
    affiliateDiscountAmount,
    affiliateAdditionalAmount,
    affiliateDiscountPercentage,
    longStayDiscountPercentage,
    isLongStayDiscount,
    hasOriginalDiscount,
    hasAffiliateAdjustments
  } = pricingData;

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const priceSizeClasses = {
    sm: 'text-lg font-semibold',
    md: 'text-xl font-bold',
    lg: 'text-2xl font-bold'
  };

  const badgeSizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-3 py-1'
  };

  // If no discounts or affiliate adjustments, show simple price
  if (!hasOriginalDiscount && !hasAffiliateAdjustments) {
    return (
      <div className={`${className}`}>
        <span className={`${priceSizeClasses[size]} text-sitenest-secondary`}>
          PKR {originalPrice.toLocaleString()}
        </span>
        {showNightLabel && <span className="text-secondary text-sm ml-1">/night</span>}
      </div>
    );
  }

  // If only original discount (no affiliate)
  if (hasOriginalDiscount && !hasAffiliateAdjustments) {
    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center space-x-2">
          <span className={`${priceSizeClasses[size]} text-sitenest-secondary`}>
            PKR {discountedPrice.toLocaleString()}
          </span>
          <Badge className={`bg-red-500 text-white ${badgeSizeClasses[size]}`}>
            -{discountPercentage}%
          </Badge>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-400 line-through">
            PKR {originalPrice.toLocaleString()}
          </span>
          {showNightLabel && <span className="text-secondary text-sm">/night</span>}
        </div>
      </div>
    );
  }

  // If affiliate adjustments - show as natural pricing
  if (hasAffiliateAdjustments) {
    // Calculate what the "fake original price" should be to make the discount look natural
    const fakeOriginalPrice = hasOriginalDiscount
      ? Math.round(affiliatePrice / (1 - discountPercentage / 100))
      : affiliatePrice;

    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center space-x-2">
          <span className={`${priceSizeClasses[size]} text-sitenest-secondary`}>
            PKR {affiliatePrice.toLocaleString()}
          </span>
          {hasOriginalDiscount && (
            <Badge className={`bg-red-500 text-white ${badgeSizeClasses[size]}`}>
              -{discountPercentage}%
            </Badge>
          )}
          {isLongStayDiscount && (
            <Badge className={`bg-blue-500 text-white ${badgeSizeClasses[size]} flex items-center space-x-1`}>
              <Tag className="w-3 h-3" />
              <span>Long Stay -{longStayDiscountPercentage}%</span>
            </Badge>
          )}
        </div>
        {hasOriginalDiscount && (
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-400 line-through">
              PKR {fakeOriginalPrice.toLocaleString()}
            </span>
            {showNightLabel && <span className="text-secondary text-sm">/night</span>}
          </div>
        )}
        {!hasOriginalDiscount && showNightLabel && (
          <span className="text-secondary text-sm">/night</span>
        )}
      </div>
    );
  }

  // Normal pricing (no affiliate adjustments)
  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center space-x-2">
        <span className={`${priceSizeClasses[size]} text-sitenest-secondary`}>
          PKR {affiliatePrice.toLocaleString()}
        </span>
        {hasOriginalDiscount && (
          <Badge className={`bg-red-500 text-white ${badgeSizeClasses[size]}`}>
            -{discountPercentage}%
          </Badge>
        )}
      </div>
      {hasOriginalDiscount && (
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-400 line-through">
            PKR {originalPrice.toLocaleString()}
          </span>
          {showNightLabel && <span className="text-secondary text-sm">/night</span>}
        </div>
      )}
      {!hasOriginalDiscount && showNightLabel && (
        <span className="text-secondary text-sm">/night</span>
      )}
    </div>
  );
}

// Simplified version for cards
export function SimplePricing({
  originalPrice,
  discountPercentage = 0,
  className = ""
}: {
  originalPrice: number;
  discountPercentage?: number;
  className?: string;
}) {
  const {
    affiliatePricing,
    calculateAdjustedPrice
  } = useAffiliatePricing();

  // Memoize calculations to prevent rapid re-renders
  const pricingData = useMemo(() => {
    // Calculate the discounted price (after original listing discount)
    const discountedPrice = discountPercentage > 0
      ? Math.round(originalPrice * (1 - discountPercentage / 100))
      : originalPrice;

    // Calculate affiliate adjusted price (applied to discounted price)
    const finalPrice = affiliatePricing.hasAffiliatePricing
      ? calculateAdjustedPrice(discountedPrice)
      : discountedPrice;

    return { discountedPrice, finalPrice };
  }, [originalPrice, discountPercentage, affiliatePricing.hasAffiliatePricing, calculateAdjustedPrice]);

  const { discountedPrice, finalPrice } = pricingData;

  // If affiliate pricing is active, show it as the natural price with original discount
  if (affiliatePricing.hasAffiliatePricing) {
    // Calculate what the "fake original price" should be to make the discount look natural
    const fakeOriginalPrice = discountPercentage > 0
      ? Math.round(finalPrice / (1 - discountPercentage / 100))
      : finalPrice;

    return (
      <div className={`space-y-1 ${className}`}>
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold text-sitenest-secondary">
            PKR {finalPrice.toLocaleString()}
          </span>
          {discountPercentage > 0 && (
            <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
              -{discountPercentage}%
            </Badge>
          )}
        </div>
        {discountPercentage > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-sm text-gray-400 line-through">
              PKR {fakeOriginalPrice.toLocaleString()}
            </span>
            <span className="text-secondary text-sm">/night</span>
          </div>
        )}
      </div>
    );
  }

  // Normal pricing (no affiliate)
  const hasOriginalDiscount = discountPercentage > 0;

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center space-x-2">
        <span className="text-xl font-bold text-sitenest-secondary">
          PKR {finalPrice.toLocaleString()}
        </span>
        {hasOriginalDiscount && (
          <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">
            -{discountPercentage}%
          </Badge>
        )}
      </div>
      {hasOriginalDiscount && (
        <div className="flex items-center space-x-1">
          <span className="text-sm text-gray-400 line-through">
            PKR {originalPrice.toLocaleString()}
          </span>
          <span className="text-secondary text-sm">/night</span>
        </div>
      )}
    </div>
  );
}
