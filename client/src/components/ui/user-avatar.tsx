import React from "react";
import { User } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  imageUrl?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showFallback?: boolean;
}

const sizeClasses = {
  sm: "w-8 h-8",
  md: "w-12 h-12", 
  lg: "w-16 h-16",
  xl: "w-24 h-24"
};

const iconSizes = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8", 
  xl: "w-12 h-12"
};

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg"
};

export default function UserAvatar({ 
  imageUrl, 
  name, 
  size = "md", 
  className,
  showFallback = true 
}: UserAvatarProps) {
  // Generate initials from name
  const getInitials = (fullName: string) => {
    const names = fullName.trim().split(' ');
    if (names.length === 1) {
      return names[0].charAt(0).toUpperCase();
    }
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  const initials = getInitials(name);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageUrl && (
        <AvatarImage 
          src={imageUrl} 
          alt={name}
          className="object-cover"
        />
      )}
      <AvatarFallback 
        className="bg-sitenest-blue text-white font-semibold border-2 border-sitenest-secondary"
      >
        {showFallback ? (
          <span className={textSizes[size]}>{initials}</span>
        ) : (
          <User className={cn(iconSizes[size], "text-white")} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
