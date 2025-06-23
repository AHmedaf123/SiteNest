import { Badge } from "@/components/ui/badge";
import { useAffiliatePricing } from "@/hooks/useAffiliatePricing";
import { Tag, Percent } from "lucide-react";

interface AffiliatePricingBadgeProps {
  basePrice: number;
  className?: string;
  showDetails?: boolean;
}

export default function AffiliatePricingBadge({
  basePrice,
  className = "",
  showDetails = false
}: AffiliatePricingBadgeProps) {
  const {
    affiliatePricing,
    calculateAdjustedPrice,
    getAffiliateDiscountAmount,
    getAffiliateAdditionalAmount,
    getAffiliateDiscountPercentage,
    formatPriceAdjustment
  } = useAffiliatePricing();

  if (!affiliatePricing.hasAffiliatePricing) {
    return null;
  }

  // basePrice here should be the already-discounted price
  const adjustedPrice = calculateAdjustedPrice(basePrice);
  const discountAmount = getAffiliateDiscountAmount(basePrice);
  const additionalAmount = getAffiliateAdditionalAmount();
  const discountPercentage = getAffiliateDiscountPercentage(basePrice);

  const hasAdjustments = additionalAmount > 0 || discountAmount > 0;

  if (!hasAdjustments) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <Badge
        variant="destructive"
        className="bg-blue-500 hover:bg-blue-600 text-white flex items-center space-x-1"
      >
        <Tag className="w-3 h-3" />
        <span>Affiliate Price</span>
      </Badge>

      {showDetails && (
        <div className="flex items-center space-x-2 text-sm">
          <span className="text-gray-500 line-through">
            {basePrice.toLocaleString()} PKR
          </span>
          <span className="font-semibold text-blue-600">
            {adjustedPrice.toLocaleString()} PKR
          </span>
          {discountAmount > 0 && (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Percent className="w-3 h-3 mr-1" />
              {discountPercentage}% OFF
            </Badge>
          )}
          {additionalAmount > 0 && (
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              +{additionalAmount.toLocaleString()} PKR
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

interface AffiliatePriceDisplayProps {
  basePrice: number;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function AffiliatePriceDisplay({
  basePrice,
  className = "",
  size = 'md'
}: AffiliatePriceDisplayProps) {
  const {
    affiliatePricing,
    calculateAdjustedPrice,
    getAffiliateDiscountAmount,
    getAffiliateAdditionalAmount,
    getAffiliateDiscountPercentage
  } = useAffiliatePricing();

  const adjustedPrice = calculateAdjustedPrice(basePrice);
  const discountAmount = getAffiliateDiscountAmount(basePrice);
  const additionalAmount = getAffiliateAdditionalAmount();
  const discountPercentage = getAffiliateDiscountPercentage(basePrice);
  const hasAdjustments = affiliatePricing.hasAffiliatePricing && (additionalAmount > 0 || discountAmount > 0);

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

  if (!hasAdjustments) {
    return (
      <div className={`${className}`}>
        <span className={`${priceSizeClasses[size]} text-gray-900`}>
          {basePrice.toLocaleString()} PKR
        </span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <div className="flex items-center space-x-2">
        <span className={`${sizeClasses[size]} text-gray-500 line-through`}>
          {basePrice.toLocaleString()} PKR
        </span>
        <Badge variant="destructive" className="bg-blue-500 hover:bg-blue-600 text-white">
          Affiliate Price
        </Badge>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`${priceSizeClasses[size]} text-blue-600`}>
          {adjustedPrice.toLocaleString()} PKR
        </span>
        <div className="flex items-center space-x-1">
          {discountAmount > 0 && (
            <span className={`${sizeClasses[size]} text-green-600`}>
              (Save {discountAmount.toLocaleString()} PKR)
            </span>
          )}
          {additionalAmount > 0 && (
            <span className={`${sizeClasses[size]} text-blue-600`}>
              (+{additionalAmount.toLocaleString()} PKR)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface AffiliateInfoCardProps {
  basePrice: number;
  className?: string;
}

export function AffiliateInfoCard({ basePrice, className = "" }: AffiliateInfoCardProps) {
  const {
    affiliatePricing,
    calculateAdjustedPrice,
    getAffiliateDiscountAmount,
    getAffiliateDiscountPercentage,
    formatPriceAdjustment
  } = useAffiliatePricing();

  if (!affiliatePricing.hasAffiliatePricing) {
    return null;
  }

  const adjustedPrice = calculateAdjustedPrice(basePrice);
  const discountAmount = getAffiliateDiscountAmount(basePrice);
  const discountPercentage = getAffiliateDiscountPercentage(basePrice);
  const hasDiscount = discountAmount > 0;

  if (!hasDiscount) {
    return null;
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center space-x-2 mb-3">
        <Tag className="w-5 h-5 text-green-600" />
        <h3 className="font-semibold text-green-800">Affiliate Discount Applied</h3>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Original Price:</span>
          <span className="line-through text-gray-500">{basePrice.toLocaleString()} PKR</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Discount ({discountPercentage}%):</span>
          <span className="text-green-600">-{discountAmount.toLocaleString()} PKR</span>
        </div>
        
        <div className="border-t border-green-200 pt-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-green-800">Your Price:</span>
            <span className="font-bold text-green-600 text-lg">
              {adjustedPrice.toLocaleString()} PKR
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-green-700 bg-green-100 rounded px-2 py-1">
        💡 This special pricing is available through your affiliate referral
      </div>
    </div>
  );
}
