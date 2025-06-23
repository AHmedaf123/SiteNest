import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Phone, MessageCircle, Calendar, Users, CreditCard, CheckCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { Apartment } from "@shared/schema";

interface AvailabilityBoardProps {}

interface BookingRequest {
  roomId: string;
  checkIn: string;
  checkOut: string;
  customerData: {
    name: string;
    phone: string;
    cnic: string;
  };
}

interface AvailabilityResult {
  available: boolean;
  requestedRoom?: Apartment;
  alternatives?: Apartment[];
  whatsappNumber?: string;
  easypaisaNumber?: string;
}

export default function AvailabilityBoard({}: AvailabilityBoardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [bookingRequest, setBookingRequest] = useState<BookingRequest | null>(null);
  const { toast } = useToast();

  // Listen for the custom event to open the board
  useEffect(() => {
    const handleOpenBoard = (event: any) => {
      const { roomId, checkIn, checkOut, customerData } = event.detail;
      setBookingRequest({ roomId, checkIn, checkOut, customerData });
      setIsOpen(true);
    };

    window.addEventListener('openAvailabilityBoard', handleOpenBoard);
    return () => window.removeEventListener('openAvailabilityBoard', handleOpenBoard);
  }, []);

  // Fetch availability data when booking request changes
  const { data: availabilityResult, isLoading } = useQuery<AvailabilityResult>({
    queryKey: ["/api/availability-check", bookingRequest],
    queryFn: async () => {
      if (!bookingRequest) return null;

      const response = await fetch(`/api/availability-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomNumber: bookingRequest.roomId,
          checkIn: bookingRequest.checkIn,
          checkOut: bookingRequest.checkOut,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to check availability');
      }

      return response.json();
    },
    enabled: !!bookingRequest && isOpen,
  });

  const handleClose = () => {
    setIsOpen(false);
    setBookingRequest(null);
  };

  const handleRoomSelect = (roomNumber: string) => {
    // Navigate to apartment listing page for the selected room
    window.location.href = `/apartments?room=${roomNumber}`;
  };

  const handleWhatsAppContact = () => {
    if (availabilityResult?.whatsappNumber && bookingRequest) {
      const message = encodeURIComponent(
        `Hi! I want to book Room ${bookingRequest.roomId} from ${bookingRequest.checkIn} to ${bookingRequest.checkOut}. My name is ${bookingRequest.customerData.name} and my phone is ${bookingRequest.customerData.phone}. I will send the confirmation payment screenshot shortly.`
      );
      window.open(`https://wa.me/+92${availabilityResult.whatsappNumber}?text=${message}`, '_blank');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!bookingRequest) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Availability Results
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Details Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your Booking Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Room:</span> {bookingRequest.roomId}
                </div>
                <div>
                  <span className="font-medium">Guest:</span> {bookingRequest.customerData.name}
                </div>
                <div>
                  <span className="font-medium">Check-in:</span> {formatDate(bookingRequest.checkIn)}
                </div>
                <div>
                  <span className="font-medium">Check-out:</span> {formatDate(bookingRequest.checkOut)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-coral mx-auto mb-4"></div>
                  <p>Checking availability...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Availability Results */}
          {availabilityResult && !isLoading && (
            <>
              {availabilityResult.available ? (
                /* Room Available - Payment Confirmation Flow */
                <>
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="text-green-800 flex items-center gap-2">
                        ✅ Great News! Room {bookingRequest.roomId} is Available
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-green-700 mb-4">
                        Room {bookingRequest.roomId} is available for your selected dates.
                        To confirm your booking, please follow these steps:
                      </p>
                    </CardContent>
                  </Card>

                  {/* Payment Instructions */}
                  <Card className="border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-blue-800 flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Booking Confirmation Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                          Send Confirmation Amount
                        </h4>
                        <p className="text-gray-600 mb-3">
                          Send a confirmation amount between <strong>PKR 500 to PKR 2,000</strong> via Easypaisa to:
                        </p>
                        <div className="bg-gray-100 p-3 rounded border text-center">
                          <p className="font-mono text-lg font-bold text-blue-600">
                            {availabilityResult.easypaisaNumber || "0311-5197087"}
                          </p>
                          <p className="text-sm text-gray-500">Easypaisa Account</p>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                          Share Payment Screenshot
                        </h4>
                        <p className="text-gray-600 mb-3">
                          Take a screenshot of your payment confirmation and send it via WhatsApp along with your booking details.
                        </p>

                        {availabilityResult.whatsappNumber && (
                          <Button
                            onClick={handleWhatsAppContact}
                            className="bg-green-600 hover:bg-green-700 text-white w-full"
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            Send Details & Screenshot on WhatsApp
                          </Button>
                        )}
                      </div>

                      <div className="bg-white p-4 rounded-lg border">
                        <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <span className="bg-green-100 text-green-800 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                          Check-in
                        </h4>
                        <p className="text-gray-600">
                          After payment confirmation, you can check-in at your scheduled time.
                          We'll contact you with further details once payment is verified.
                        </p>
                      </div>

                      <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          <strong>Note:</strong> Your booking will be confirmed once we receive and verify your payment screenshot.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </>
              ) : (
                /* Room Not Available - Show Alternatives */
                <>
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-red-800">
                        ❌ Sorry, Room {bookingRequest.roomId} is Not Available
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-red-700">
                        Room {bookingRequest.roomId} is not available for your selected dates.
                        Please check out these alternative rooms:
                      </p>
                    </CardContent>
                  </Card>

                  {/* Alternative Rooms */}
                  {availabilityResult.alternatives && availabilityResult.alternatives.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Available Alternatives</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-4">
                          {availabilityResult.alternatives.map((apartment) => (
                            <div
                              key={apartment.id}
                              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="secondary">Room {apartment.roomNumber}</Badge>
                                  <span className="font-medium">{apartment.title}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-2">{apartment.description}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {apartment.bedrooms} bed, {apartment.bathrooms} bath
                                  </span>
                                  <span className="font-medium text-brand-coral">
                                    ${apartment.price}/night
                                  </span>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleRoomSelect(apartment.roomNumber)}
                                className="bg-brand-coral hover:bg-red-600"
                              >
                                View Room {apartment.roomNumber}
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
