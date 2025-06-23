import React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps {
  variant?: 'full' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  textClassName?: string;
}

const sizeClasses = {
  sm: {
    icon: 'w-6 h-6',
    text: 'text-lg'
  },
  md: {
    icon: 'w-8 h-8',
    text: 'text-xl'
  },
  lg: {
    icon: 'w-12 h-12',
    text: 'text-2xl'
  },
  xl: {
    icon: 'w-16 h-16',
    text: 'text-3xl'
  }
};

export default function Logo({ 
  variant = 'full', 
  size = 'md', 
  className = '', 
  showText = true,
  textClassName = ''
}: LogoProps) {
  const iconSizeClass = sizeClasses[size].icon;
  const textSizeClass = sizeClasses[size].text;

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center', className)}>
        <img
          src="/assets/branding/sitenest-icon.svg"
          alt="SiteNest"
          className={cn(iconSizeClass, 'object-contain')}
        />
        {showText && (
          <span className={cn(
            'ml-2 font-bold font-playfair text-sitenest-primary',
            textSizeClass,
            textClassName
          )}>
            SiteNest
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center', className)}>
      <img
        src="/assets/branding/sitenest-logo.svg"
        alt="SiteNest - A Step Towards Comfort"
        className={cn(
          size === 'sm' ? 'h-8' : 
          size === 'md' ? 'h-10' : 
          size === 'lg' ? 'h-14' : 
          'h-16',
          'w-auto object-contain'
        )}
      />
    </div>
  );
}

// Specialized logo components for common use cases
export function HeaderLogo({ className = '' }: { className?: string }) {
  return (
    <Logo 
      variant="icon" 
      size="md" 
      className={className}
      textClassName="text-white"
    />
  );
}

export function AuthLogo({ className = '' }: { className?: string }) {
  return (
    <Logo 
      variant="full" 
      size="lg" 
      className={cn('justify-center mb-6', className)}
    />
  );
}

export function FooterLogo({ className = '', textClassName = 'text-sitenest-primary' }: { className?: string; textClassName?: string }) {
  return (
    <Logo
      variant="icon"
      size="sm"
      className={className}
      textClassName={textClassName}
    />
  );
}

export function AdminLogo({ className = '' }: { className?: string }) {
  return (
    <Logo
      variant="icon"
      size="lg"
      className={cn('justify-center mb-4', className)}
      textClassName="text-sitenest-primary"
    />
  );
}

export function FaviconLogo({ className = '' }: { className?: string }) {
  return (
    <img
      src="/assets/branding/sitenest-icon.svg"
      alt="SiteNest"
      className={cn('w-8 h-8 object-contain', className)}
    />
  );
}
