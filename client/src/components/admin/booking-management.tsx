import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { CheckCircle, XCircle, Clock, User, Phone, MapPin, Calendar, DollarSign, MessageSquare, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useRealAuth } from "@/hooks/useRealAuth";
import type { BookingRequest } from "@shared/schema";

interface EnrichedBookingRequest extends BookingRequest {
  totalAmount?: number;
  apartment: {
    id: number;
    roomNumber: string;
    title: string;
    price: number;
  } | null;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    cnic: string;
    address: string;
  };
  affiliateInfo?: {
    affiliateId: string;
    affiliateName: string;
    affiliateEmail: string;
    commissionAmount: number;
    commissionStatus: string;
    linkCode: string;
    linkId?: number;
  };
}

export default function BookingManagement() {
  const [selectedRequest, setSelectedRequest] = useState<EnrichedBookingRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const { toast } = useToast();
  const { isAuthenticated, user } = useRealAuth();

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const { data: bookingRequests = [], isLoading, refetch } = useQuery<EnrichedBookingRequest[]>({
    queryKey: ["/api/booking-requests"],
    enabled: isAuthenticated && isAdmin,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: number; status: string; adminNotes?: string }) => {
      const response = await fetch(`/api/booking-requests/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNotes }),
      });
      if (!response.ok) throw new Error("Failed to update status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-requests"] });
      setIsDetailsOpen(false);
      setSelectedRequest(null);
      setAdminNotes("");
      toast({
        title: "Success!",
        description: "Booking request status updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update booking request status.",
        variant: "destructive",
      });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/booking-requests/${id}/confirm-payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) throw new Error("Failed to confirm payment");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/booking-requests"] });
      toast({
        title: "Success!",
        description: "Payment confirmed and booking added to calendar.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to confirm payment.",
        variant: "destructive",
      });
    },
  });

  const handleViewDetails = (request: EnrichedBookingRequest) => {
    setSelectedRequest(request);
    setAdminNotes(request.adminNotes || "");
    setIsDetailsOpen(true);
  };

  const handleStatusUpdate = (status: string) => {
    if (selectedRequest) {
      updateStatusMutation.mutate({
        id: selectedRequest.id,
        status,
        adminNotes: adminNotes.trim() || undefined,
      });
    }
  };

  const handleConfirmPayment = (requestId: number) => {
    confirmPaymentMutation.mutate(requestId);
  };

  const getStatusBadge = (status: string, paymentReceived: boolean | null) => {
    if (paymentReceived) {
      return <Badge className="bg-green-500 text-white">Payment Confirmed</Badge>;
    }

    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-500 text-white"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500 text-white"><CheckCircle className="h-3 w-3 mr-1" />Confirmed</Badge>;
      case "rejected":
        return <Badge className="bg-red-500 text-white"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getRequestAge = (requestDate: string | Date) => {
    const now = new Date();
    const created = typeof requestDate === 'string' ? new Date(requestDate) : requestDate;
    const diffMs = now.getTime() - created.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading booking requests...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">New Booking Requests</h2>
          <p className="text-gray-600">Manage incoming booking requests and payment confirmations</p>
        </div>
        <Button onClick={() => refetch()} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Booking Requests */}
      {bookingRequests.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No booking requests found.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookingRequests.map((request) => (
            <Card key={request.id} className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <div>
                    <span>
                      Room {request.roomNumber} - {request.user.firstName} {request.user.lastName}
                    </span>
                    <div className="text-sm font-normal text-gray-500 mt-1">
                      Requested {getRequestAge(request.requestDate || request.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status, request.paymentReceived)}
                    {(request.affiliateId || request.affiliateName) && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                        <Users className="h-3 w-3 mr-1" />
                        Affiliate Booking
                        {request.affiliateName && (
                          <span className="ml-1">({request.affiliateName})</span>
                        )}
                      </Badge>
                    )}
                    {request.affiliateInfo && request.paymentReceived && (
                      <Badge
                        variant={request.affiliateInfo.commissionStatus === 'pending' ? 'secondary' : 'default'}
                        className={
                          request.affiliateInfo.commissionStatus === 'pending'
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }
                      >
                        Commission: {request.affiliateInfo.commissionStatus}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewDetails(request)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">
                        {formatDate(request.checkIn)} - {formatDate(request.checkOut)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{request.guestCount || 1} guests</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">PKR {request.totalAmount?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{request.user.phone}</span>
                    </div>
                    {request.affiliateInfo && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">
                          Affiliate: {request.affiliateInfo.affiliateName}
                          <span className="text-gray-500 ml-1">
                            (+{request.affiliateInfo.commissionAmount.toLocaleString()} PKR commission - {request.affiliateInfo.commissionStatus})
                          </span>
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {request.apartment && (
                      <div>
                        <h4 className="font-medium">{request.apartment.title}</h4>
                        <p className="text-sm text-gray-600">PKR {request.apartment.price.toLocaleString()}/night</p>
                      </div>
                    )}
                    {request.mealPreferences && (
                      <div>
                        <p className="text-sm font-medium">Meal Preferences:</p>
                        <p className="text-sm text-gray-600">{request.mealPreferences}</p>
                      </div>
                    )}
                    {(request.needsParking || request.hasPets) && (
                      <div>
                        <p className="text-sm font-medium">Additional Info:</p>
                        <div className="text-sm text-gray-600">
                          {request.needsParking && <span>• Parking required</span>}
                          {request.needsParking && request.hasPets && <br />}
                          {request.hasPets && <span>• Has pets</span>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="flex space-x-2 mt-4">
                  {!request.paymentReceived && request.status === "confirmed" && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmPayment(request.id)}
                      disabled={confirmPaymentMutation.isPending}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Confirm Payment
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Booking Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              {/* Customer Information */}
              <div>
                <h3 className="font-semibold mb-2">Customer Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Name:</strong> {selectedRequest.user.firstName} {selectedRequest.user.lastName}</div>
                  <div><strong>Email:</strong> {selectedRequest.user.email}</div>
                  <div><strong>Phone:</strong> {selectedRequest.user.phone}</div>
                  <div><strong>CNIC:</strong> {selectedRequest.user.cnic}</div>
                  <div className="col-span-2"><strong>Address:</strong> {selectedRequest.user.address}</div>
                </div>
              </div>

              {/* Booking Information */}
              <div>
                <h3 className="font-semibold mb-2">Booking Information</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>Room:</strong> {selectedRequest.roomNumber}</div>
                  <div><strong>Guests:</strong> {selectedRequest.guestCount || 1}</div>
                  <div><strong>Check-in:</strong> {formatDate(selectedRequest.checkIn)}</div>
                  <div><strong>Check-out:</strong> {formatDate(selectedRequest.checkOut)}</div>
                  <div><strong>Total Amount:</strong> PKR {selectedRequest.totalAmount?.toLocaleString() || 'N/A'}</div>
                  <div><strong>Status:</strong> {selectedRequest.status}</div>
                  <div className="col-span-2"><strong>Request Age:</strong> {getRequestAge(selectedRequest.requestDate || selectedRequest.createdAt)}</div>
                  {selectedRequest.arrivalTime && (
                    <div><strong>Arrival Time:</strong> {selectedRequest.arrivalTime}</div>
                  )}
                  {selectedRequest.confirmationAmount && (
                    <div><strong>Confirmation Amount:</strong> PKR {selectedRequest.confirmationAmount.toLocaleString()}</div>
                  )}
                </div>

                {/* Additional Information */}
                {(selectedRequest.mealPreferences || selectedRequest.needsParking || selectedRequest.hasPets) && (
                  <div className="mt-3">
                    <strong>Additional Information:</strong>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      {selectedRequest.mealPreferences && (
                        <div>• Meal Preferences: {selectedRequest.mealPreferences}</div>
                      )}
                      {selectedRequest.needsParking && (
                        <div>• Parking required</div>
                      )}
                      {selectedRequest.hasPets && (
                        <div>• Has pets</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Payment Information */}
                {(selectedRequest.paymentReceived || selectedRequest.whatsappConfirmed) && (
                  <div className="mt-3">
                    <strong>Payment Status:</strong>
                    <div className="text-sm text-gray-600 mt-1">
                      {selectedRequest.paymentReceived && <div>• Payment received</div>}
                      {selectedRequest.whatsappConfirmed && <div>• WhatsApp confirmed</div>}
                    </div>
                  </div>
                )}

                {/* Affiliate Information */}
                {(selectedRequest.affiliateName || selectedRequest.affiliateId) && (
                  <div className="mt-3">
                    <strong>Affiliate Attribution:</strong>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div>• Affiliate: {selectedRequest.affiliateName || selectedRequest.affiliateId}</div>
                    </div>
                  </div>
                )}
                {selectedRequest.affiliateInfo && (
                  <div className="mt-3">
                    <strong>Affiliate Attribution:</strong>
                    <div className="text-sm text-gray-600 mt-1 space-y-1">
                      <div>• Affiliate: {selectedRequest.affiliateInfo.affiliateName}</div>
                      <div>• Email: {selectedRequest.affiliateInfo.affiliateEmail}</div>
                      <div>• Commission: {selectedRequest.affiliateInfo.commissionAmount.toLocaleString()} PKR</div>
                      <div>• Status: <span className={`font-medium ${
                        selectedRequest.affiliateInfo.commissionStatus === 'pending' ? 'text-yellow-600' :
                        selectedRequest.affiliateInfo.commissionStatus === 'approved' ? 'text-green-600' :
                        'text-gray-600'
                      }`}>{selectedRequest.affiliateInfo.commissionStatus}</span></div>
                      <div>• Link Code: {selectedRequest.affiliateInfo.linkCode}</div>
                      {selectedRequest.affiliateInfo.linkId && (
                        <div>• Link ID: #{selectedRequest.affiliateInfo.linkId}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Notes */}
              <div>
                <Label htmlFor="adminNotes">Admin Notes</Label>
                <Textarea
                  id="adminNotes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this booking request..."
                  className="mt-1"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleStatusUpdate("confirmed")}
                  disabled={updateStatusMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Confirm
                </Button>
                <Button
                  onClick={() => handleStatusUpdate("rejected")}
                  disabled={updateStatusMutation.isPending}
                  variant="destructive"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                {!selectedRequest.paymentReceived && selectedRequest.status === "confirmed" && (
                  <Button
                    onClick={() => handleConfirmPayment(selectedRequest.id)}
                    disabled={confirmPaymentMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Confirm Payment
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
