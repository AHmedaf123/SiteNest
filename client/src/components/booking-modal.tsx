import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";
import { useBookingDates } from "@/contexts/BookingContext";
import { useQuery } from "@tanstack/react-query";
import Logo from "@/components/ui/logo";
import { fetchWithRetry } from "@/utils/retry";
import { rateLimitHelper } from "@/utils/rate-limit-helper";
import type { Apartment } from "@shared/schema";

export default function BookingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(null);
  const [isRoomLocked, setIsRoomLocked] = useState(false); // New state to track if room selection is locked
  const [formData, setFormData] = useState({
    checkIn: "",
    checkOut: ""
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState<number>(0);
  const { isAuthenticated, user } = useRealAuth();
  const { setBookingDates } = useBookingDates();

  // Fetch apartments for room selection dropdown
  const { data: apartments = [], isLoading: apartmentsLoading } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
    enabled: isOpen && !isRoomLocked, // Only fetch when modal is open and room is not locked
  });

  const getRoomTitle = (roomId: string) => {
    const roomTitles: { [key: string]: string } = {
      "714": "Luxury Studio",
      "503": "Cozy One-Bed",
      "301": "Family Two-Bed",
      "901": "Luxury Three-Bed",
      "205": "Downtown Loft",
      "802": "Waterfront View"
    };
    return roomTitles[roomId] || "Unknown Room";
  };
  const { toast } = useToast();

  useEffect(() => {
    const handleOpenBookingModal = (event: any) => {
      // Check authentication first
      if (!isAuthenticated) {
        toast({
          title: "Sign In Required",
          description: "Please sign in to book a room.",
          variant: "destructive"
        });
        return;
      }

      setIsOpen(true);
      
      // Check if this is for a specific apartment (room should be locked)
      if (event.detail?.roomId && event.detail?.apartmentId && event.detail.roomId !== 'any') {
        setSelectedRoomId(event.detail.roomId);
        setSelectedApartmentId(event.detail.apartmentId);
        setIsRoomLocked(true); // Lock room selection for specific apartment bookings
      } else {
        // General booking - allow room selection
        setSelectedRoomId("");
        setSelectedApartmentId(null);
        setIsRoomLocked(false); // Enable room selection for general bookings
      }
    };

    window.addEventListener('openBookingModal', handleOpenBookingModal);
    return () => window.removeEventListener('openBookingModal', handleOpenBookingModal);
  }, [isAuthenticated, toast]);

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);

    // Update booking context when dates change
    if (field === 'checkIn' || field === 'checkOut') {
      setBookingDates({
        checkIn: field === 'checkIn' ? value : formData.checkIn,
        checkOut: field === 'checkOut' ? value : formData.checkOut
      });
    }
  };

  const handleRoomSelection = (apartmentId: string) => {
    const apartment = apartments.find(apt => apt.id.toString() === apartmentId);
    if (apartment) {
      setSelectedApartmentId(apartment.id);
      setSelectedRoomId(apartment.roomNumber);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission and rate limiting
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitTime;
    const minInterval = 2000; // 2 seconds minimum between submissions

    if (isSubmitting) {
      toast({
        title: "Please Wait",
        description: "Your booking request is being processed...",
        variant: "default"
      });
      return;
    }

    if (timeSinceLastSubmit < minInterval) {
      toast({
        title: "Too Fast",
        description: `Please wait ${Math.ceil((minInterval - timeSinceLastSubmit) / 1000)} more seconds before submitting again.`,
        variant: "destructive"
      });
      return;
    }

    // Check if we're currently rate limited
    if (rateLimitHelper.isRateLimited()) {
      const remainingTime = rateLimitHelper.getFormattedRemainingTime();
      toast({
        title: "Rate Limited",
        description: `Please wait ${remainingTime} before trying again. You can clear this in development by running: rateLimitHelper.clearRateLimit() in the console.`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    setLastSubmitTime(now);

    // Check authentication
    if (!isAuthenticated || !user) {
      setIsSubmitting(false);
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue.",
        variant: "destructive"
      });
      return;
    }

    // Validate form
    if (!formData.checkIn || !formData.checkOut) {
      setIsSubmitting(false);
      toast({
        title: "Missing Information",
        description: "Please select check-in and check-out dates.",
        variant: "destructive"
      });
      return;
    }

    // Validate room selection
    if (!selectedRoomId || !selectedApartmentId) {
      setIsSubmitting(false);
      toast({
        title: "Missing Information",
        description: "Please select a room to book.",
        variant: "destructive"
      });
      return;
    }

    // Validate dates with time
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const today = new Date();

    if (checkInDate < today) {
      setIsSubmitting(false);
      toast({
        title: "Invalid Check-in Date",
        description: "Check-in date cannot be in the past.",
        variant: "destructive"
      });
      return;
    }

    if (checkOutDate <= checkInDate) {
      setIsSubmitting(false);
      toast({
        title: "Invalid Check-out Date",
        description: "Check-out date must be after check-in date.",
        variant: "destructive"
      });
      return;
    }

    try {
      // Create booking request in database first
      const bookingRequestData = {
        apartmentId: parseInt(String(selectedApartmentId || '0'), 10),
        roomNumber: selectedRoomId,
        checkIn: checkInDate.toISOString(),
        checkOut: checkOutDate.toISOString(),
        guests: 1, // Default to 1 guest for now
        totalAmount: 0 // Will be calculated by the server
      };

      console.log('📤 Creating booking request:', bookingRequestData);

      // Check for affiliate reference to include in the request
      const affiliateRef = localStorage.getItem('sitenest_affiliate_ref');
      const queryParams = new URLSearchParams();
      if (affiliateRef) {
        queryParams.set('ref', affiliateRef);
        console.log('🔗 Including affiliate reference:', affiliateRef);
      }

      const apiUrl = `/api/booking-requests${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;

      let response: Response;
      
      try {
        response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('sitenest_token')}`
          },
          body: JSON.stringify(bookingRequestData)
        });
      } catch (networkError) {
        console.error('❌ Network error:', networkError);
        throw new Error('Network error. Please check your connection and try again.');
      }

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        let errorData: any = {};
        
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
          errorData = { message: 'Server error occurred' };
        }
        
        console.error('❌ Error response:', errorData);
        console.error('❌ Validation errors:', errorData.errors);
        console.error('❌ Error details:', errorData.details);

        // Handle rate limiting error specifically
        if (response.status === 429) {
          // Record the rate limit for future checks
          rateLimitHelper.recordRateLimit();
          
          const retryAfter = errorData.error?.retryAfter || errorData.retryAfter || 900; // Default to 15 minutes
          const retryMinutes = Math.ceil(retryAfter / 60);
          
          toast({
            title: "Too Many Requests",
            description: `Please wait ${retryMinutes} minutes before trying again. This helps us maintain service quality for all users. In development, you can clear this by running: rateLimitHelper.clearRateLimit() in the console.`,
            variant: "destructive"
          });
          return;
        }

        // Handle room not available error specifically
        if (errorData.error === 'ROOM_NOT_AVAILABLE') {
          // Close the booking modal first
          setIsOpen(false);
          
          // Trigger chatbot with room unavailability data
          const event = new CustomEvent('openChatbotWithUnavailability', {
            detail: {
              roomId: selectedRoomId,
              apartmentId: selectedApartmentId,
              checkIn: formData.checkIn,
              checkOut: formData.checkOut,
              user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                cnic: user.cnic,
                isEmailVerified: user.isEmailVerified,
                isPhoneVerified: user.isPhoneVerified
              }
            }
          });
          window.dispatchEvent(event);
          return; // Don't proceed with booking flow
        }

        // Show detailed error message if available
        let errorMessage = errorData.message || errorData.error?.message || 'Failed to create booking request';
        if (errorData.details && errorData.details.length > 0) {
          errorMessage += '\n\nDetails:\n' + errorData.details.join('\n');
        }

        throw new Error(errorMessage);
      }

      const bookingRequest = await response.json();

      // Create 45-minute reservation
      try {
        const reservationResponse = await fetch('/api/reservations/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apartmentId: selectedApartmentId,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut
          }),
        });

        if (reservationResponse.ok) {
          console.log('✅ 45-minute reservation created');

          // Trigger a refresh of apartment-specific booking buttons
          const event = new CustomEvent('reservationCreated', {
            detail: { apartmentId: selectedApartmentId }
          });
          window.dispatchEvent(event);
        }
      } catch (reservationError) {
        console.error('❌ Failed to create reservation:', reservationError);
      }

      toast({
        title: "Booking Request Submitted!",
        description: "Room reserved for 45 minutes. Complete payment to confirm booking.",
      });

      // Close the booking modal first
      setIsOpen(false);

      // Send availability confirmation email
      try {
        const emailResponse = await fetch('/api/email/availability-confirmation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customerName: `${user.firstName} ${user.lastName}`,
            customerEmail: user.email,
            roomNumber: selectedRoomId,
            checkIn: formData.checkIn,
            checkOut: formData.checkOut,
            guests: 1 // Default to 1 guest, can be enhanced later
          }),
        });

        if (emailResponse.ok) {
          console.log('✅ Availability confirmation email sent');
        } else {
          console.warn('⚠️ Failed to send availability confirmation email');
        }
      } catch (emailError) {
        console.error('❌ Error sending availability confirmation email:', emailError);
        // Don't block the booking process if email fails
      }

      // Open the chatbot with the booking data
      const event = new CustomEvent('openChatbotWithBooking', {
        detail: {
          roomId: selectedRoomId,
          apartmentId: selectedApartmentId,
          checkIn: formData.checkIn,
          checkOut: formData.checkOut,
          bookingRequestId: bookingRequest.id,
          user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            cnic: user.cnic,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified
          }
        }
      });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Error creating booking request:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit booking request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }

    // Reset form
    setFormData({
      checkIn: "",
      checkOut: ""
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedRoomId("");
    setSelectedApartmentId(null);
    setIsRoomLocked(false);
    setFormData({
      checkIn: "",
      checkOut: ""
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <Logo variant="icon" size="md" showText={true} textClassName="text-sitenest-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-sitenest-primary">Book Your Stay</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User Info Display (Read-only) */}
          {user && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <h4 className="font-medium text-gray-900">Booking for:</h4>
              <p className="text-sm text-gray-600">
                {user.firstName} {user.lastName} ({user.email})
              </p>
              {user.phone && (
                <p className="text-sm text-gray-600">Phone: {user.phone}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check-in Date & Time *</Label>
              <Input
                id="checkIn"
                type="datetime-local"
                value={formData.checkIn}
                onChange={(e) => handleInputChange('checkIn', e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check-out Date & Time *</Label>
              <Input
                id="checkOut"
                type="datetime-local"
                value={formData.checkOut}
                onChange={(e) => handleInputChange('checkOut', e.target.value)}
                required
                min={formData.checkIn || new Date().toISOString().slice(0, 16)}
              />
            </div>
          </div>

          {/* Room Selection - Locked or Flexible */}
          <div className="space-y-2">
            <Label htmlFor="roomSelection">
              {isRoomLocked ? "Selected Room" : "Choose Room *"}
            </Label>
            {isRoomLocked ? (
              // Locked room display (for specific apartment bookings)
              <div className="p-3 bg-gray-50 border rounded-md">
                <span className="font-medium text-sitenest-primary">
                  Room {selectedRoomId} - {getRoomTitle(selectedRoomId)}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Room pre-selected for this booking
                </p>
              </div>
            ) : (
              // Flexible room selection (for general bookings)
              <Select
                value={selectedApartmentId?.toString() || ""}
                onValueChange={handleRoomSelection}
                disabled={apartmentsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={apartmentsLoading ? "Loading rooms..." : "Select a room"} />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apartment) => (
                    <SelectItem key={apartment.id} value={apartment.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          Room {apartment.roomNumber} - {apartment.title}
                        </span>
                        <span className="text-sm text-gray-500">
                          PKR {apartment.price}/night • {apartment.bedrooms} bed • {apartment.bathrooms} bath
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex space-x-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-sitenest-primary hover:bg-sitenest-hover-button text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Processing..." : "Check Now"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
