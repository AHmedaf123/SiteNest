import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useRealAuth } from "@/hooks/useRealAuth";
import { useBookingDates } from "@/contexts/BookingContext";
import Logo from "@/components/ui/logo";

export default function BookingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedApartmentId, setSelectedApartmentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    checkIn: "",
    checkOut: ""
  });
  const { isAuthenticated, user } = useRealAuth();
  const { setBookingDates } = useBookingDates();

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
      if (event.detail?.roomId) {
        setSelectedRoomId(event.detail.roomId);
      }
      if (event.detail?.apartmentId) {
        setSelectedApartmentId(event.detail.apartmentId);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check authentication
    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to continue.",
        variant: "destructive"
      });
      return;
    }

    // Validate form
    if (!formData.checkIn || !formData.checkOut) {
      toast({
        title: "Missing Information",
        description: "Please select check-in and check-out dates.",
        variant: "destructive"
      });
      return;
    }

    // Validate dates with time
    const checkInDate = new Date(formData.checkIn);
    const checkOutDate = new Date(formData.checkOut);
    const today = new Date();

    if (checkInDate < today) {
      toast({
        title: "Invalid Check-in Date",
        description: "Check-in date cannot be in the past.",
        variant: "destructive"
      });
      return;
    }

    if (checkOutDate <= checkInDate) {
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

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sitenest_token')}`
        },
        body: JSON.stringify(bookingRequestData)
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error response:', errorData);
        console.error('❌ Validation errors:', errorData.errors);
        console.error('❌ Error details:', errorData.details);

        // Handle room not available error specifically
        if (errorData.error === 'ROOM_NOT_AVAILABLE') {
          toast({
            title: "Room Not Available",
            description: `Room ${selectedRoomId} is not available for the selected dates. Please choose different dates or contact us for alternatives.`,
            variant: "destructive"
          });
          return; // Don't proceed with booking flow
        }

        // Show detailed error message if available
        let errorMessage = errorData.message || 'Failed to create booking request';
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
      return;
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

          {/* Show selected room (read-only) */}
          <div className="space-y-2">
            <Label htmlFor="selectedRoom">Selected Room</Label>
            <div className="p-3 bg-gray-50 border rounded-md">
              <span className="font-medium text-sitenest-primary">
                Room {selectedRoomId} - {getRoomTitle(selectedRoomId)}
              </span>
            </div>
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
              className="flex-1 bg-sitenest-primary hover:bg-sitenest-hover-button text-white"
            >
              Check Now
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
