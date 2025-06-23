import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";

interface ApartmentBookingButtonProps {
  apartmentId: number;
  roomNumber: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "outline";
  onAuthRequired?: () => void;
}

interface ReservationStatus {
  isReserved: boolean;
  reservationTimeLeft: number;
  isLoading: boolean;
}

export default function ApartmentBookingButton({
  apartmentId,
  roomNumber,
  className = "",
  size = "md",
  variant = "default",
  onAuthRequired
}: ApartmentBookingButtonProps) {
  const [reservationStatus, setReservationStatus] = useState<ReservationStatus>({
    isReserved: false,
    reservationTimeLeft: 0,
    isLoading: false
  });

  const { isAuthenticated } = useRealAuth();
  const { toast } = useToast();

  // Check apartment-specific reservations
  const checkApartmentReservations = async () => {
    if (!apartmentId) return;
    
    setReservationStatus(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await fetch(`/api/reservations/active?apartmentId=${apartmentId}`);
      
      if (response.ok) {
        const reservations = await response.json();
        const activeReservation = reservations.find((r: any) =>
          new Date(r.expiresAt) > new Date()
        );

        if (activeReservation) {
          const now = new Date();
          const timeLeft = Math.max(0, Math.floor((new Date(activeReservation.expiresAt).getTime() - now.getTime()) / (1000 * 60)));
          
          setReservationStatus({
            isReserved: true,
            reservationTimeLeft: timeLeft,
            isLoading: false
          });
        } else {
          setReservationStatus({
            isReserved: false,
            reservationTimeLeft: 0,
            isLoading: false
          });
        }
      } else {
        setReservationStatus({
          isReserved: false,
          reservationTimeLeft: 0,
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Failed to check apartment reservations:', error);
      setReservationStatus({
        isReserved: false,
        reservationTimeLeft: 0,
        isLoading: false
      });
    }
  };

  // Initial check and setup interval
  useEffect(() => {
    checkApartmentReservations();

    // Listen for reservation events
    const handleReservationCreated = (event: any) => {
      // Only refresh if it's for this apartment
      if (event.detail?.apartmentId === apartmentId) {
        checkApartmentReservations();
      }
    };

    const handleReservationExpired = (event: any) => {
      // Only refresh if it's for this apartment
      if (event.detail?.apartmentId === apartmentId) {
        checkApartmentReservations();
      }
    };

    window.addEventListener('reservationCreated', handleReservationCreated);
    window.addEventListener('reservationExpired', handleReservationExpired);

    return () => {
      window.removeEventListener('reservationCreated', handleReservationCreated);
      window.removeEventListener('reservationExpired', handleReservationExpired);
    };
  }, [apartmentId]);

  // Timer for countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (reservationStatus.isReserved && reservationStatus.reservationTimeLeft > 0) {
      interval = setInterval(() => {
        setReservationStatus(prev => {
          const newTimeLeft = prev.reservationTimeLeft - 1;
          
          if (newTimeLeft <= 0) {
            // Reservation expired
            const event = new CustomEvent('reservationExpired', {
              detail: { apartmentId }
            });
            window.dispatchEvent(event);
            
            return {
              isReserved: false,
              reservationTimeLeft: 0,
              isLoading: false
            };
          }
          
          return {
            ...prev,
            reservationTimeLeft: newTimeLeft
          };
        });
      }, 60000); // Update every minute
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [reservationStatus.isReserved, reservationStatus.reservationTimeLeft, apartmentId]);

  const handleBookNowClick = (e: React.MouseEvent) => {
    // Prevent event bubbling to parent elements (like card clicks)
    e.stopPropagation();
    e.preventDefault();
    
    if (!isAuthenticated) {
      if (onAuthRequired) {
        onAuthRequired();
      } else {
        toast({
          title: "Authentication Required",
          description: "Please sign in to book this apartment.",
          variant: "default"
        });
      }
      return;
    }

    // Open booking modal for this specific apartment
    const event = new CustomEvent('openBookingModal', {
      detail: { roomId: roomNumber, apartmentId: apartmentId }
    });
    window.dispatchEvent(event);
  };

  // Button size classes
  const sizeClasses = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-2 text-base",
    lg: "px-8 py-4 text-lg"
  };

  // Loading state
  if (reservationStatus.isLoading) {
    return (
      <Button 
        disabled 
        className={`${sizeClasses[size]} ${className}`}
        variant={variant}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
        Checking...
      </Button>
    );
  }

  // Reserved state
  if (reservationStatus.isReserved) {
    return (
      <Button
        disabled
        className={`bg-orange-500 hover:bg-orange-500 text-white cursor-not-allowed ${sizeClasses[size]} ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <Clock className="mr-2 h-4 w-4" />
        Reserved ({reservationStatus.reservationTimeLeft}m)
      </Button>
    );
  }

  // Available state
  return (
    <Button
      onClick={handleBookNowClick}
      className={`${sizeClasses[size]} ${className}`}
      variant={variant}
    >
      <Calendar className="mr-2 h-4 w-4" />
      Book Now
    </Button>
  );
}