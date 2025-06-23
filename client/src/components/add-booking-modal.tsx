import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import type { Apartment } from "@shared/schema";

interface AddBookingModalProps {
  apartments: Apartment[];
  selectedRoomId?: string;
}

interface BookingFormData {
  clientName: string;
  clientPhone: string;
  apartmentId: string;
  checkIn: string;
  checkOut: string;
  status: string;
  paymentStatus: string;
  hostName: string;
}

export function AddBookingModal({ apartments, selectedRoomId }: AddBookingModalProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useSimpleAuth();
  const queryClient = useQueryClient();

  // Auto-populate host name from user profile
  const getHostName = () => {
    if (user) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Current User';
    }
    return 'Current User';
  };

  const [formData, setFormData] = useState<BookingFormData>({
    clientName: "",
    clientPhone: "",
    apartmentId: selectedRoomId || "",
    checkIn: "",
    checkOut: "",
    status: "pending",
    paymentStatus: "pending",
    hostName: getHostName(),
  });

  const createBookingMutation = useMutation({
    mutationFn: async (bookingData: BookingFormData) => {
      // First create a customer if needed
      const customerResponse = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: bookingData.clientName,
          phone: bookingData.clientPhone,
          cnic: "12345-6789012-3" // Default CNIC for simplicity
        }),
      });

      if (!customerResponse.ok) {
        throw new Error('Failed to create customer');
      }

      const customer = await customerResponse.json();

      // Then create the booking with the new customer ID
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apartmentId: parseInt(bookingData.apartmentId),
          customerId: customer.id,
          checkIn: new Date(bookingData.checkIn).toISOString(),
          checkOut: new Date(bookingData.checkOut).toISOString(),
          status: bookingData.status,
          paymentStatus: bookingData.paymentStatus,
          hostName: getHostName(),
          totalAmount: 500 // Default amount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create booking");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch bookings for all rooms and the specific room
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      if (selectedRoomId) {
        queryClient.invalidateQueries({ queryKey: ["/api/bookings", selectedRoomId] });
      }

      toast({
        title: "Success",
        description: "Booking created successfully!",
      });

      // Reset form and close modal
      setFormData({
        clientName: "",
        clientPhone: "",
        apartmentId: selectedRoomId || "",
        checkIn: "",
        checkOut: "",
        status: "pending",
        paymentStatus: "pending",
        hostName: getHostName(),
      });
      setOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create booking. Please try again.",
        variant: "destructive",
      });
      console.error("Error creating booking:", error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!formData.clientName || !formData.clientPhone || !formData.apartmentId ||
        !formData.checkIn || !formData.checkOut) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    // Check if check-out is after check-in
    if (new Date(formData.checkOut) <= new Date(formData.checkIn)) {
      toast({
        title: "Validation Error",
        description: "Check-out date must be after check-in date.",
        variant: "destructive",
      });
      return;
    }

    createBookingMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof BookingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button className="bg-brand-coral hover:bg-brand-coral/90">
          Add Booking
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Booking</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                value={formData.clientName}
                onChange={(e) => handleInputChange("clientName", e.target.value)}
                placeholder="Enter client name"
                required
              />
            </div>
            <div>
              <Label htmlFor="clientPhone">Client Phone *</Label>
              <Input
                id="clientPhone"
                value={formData.clientPhone}
                onChange={(e) => handleInputChange("clientPhone", e.target.value)}
                placeholder="Enter phone number"
                required
              />
            </div>
          </div>

            <div>
              <Label htmlFor="hostName">Host Name</Label>
              <Input
                id="hostName"
                value={formData.hostName}
                disabled
                className="bg-gray-50 text-gray-600"
              />
              <p className="text-xs text-gray-500 mt-1">Auto-populated from your profile</p>
            </div>

            <div>
              <Label htmlFor="apartmentId">Room *</Label>
              <Select
                value={formData.apartmentId}
                onValueChange={(value) => handleInputChange("apartmentId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apartment) => (
                    <SelectItem key={apartment.id} value={apartment.id.toString()}>
                      Room {apartment.roomNumber} - {apartment.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="checkIn">Check-in Date *</Label>
                <Input
                  id="checkIn"
                  type="datetime-local"
                  value={formData.checkIn}
                  onChange={(e) => handleInputChange("checkIn", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="checkOut">Check-out Date *</Label>
                <Input
                  id="checkOut"
                  type="datetime-local"
                  value={formData.checkOut}
                  onChange={(e) => handleInputChange("checkOut", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value) => handleInputChange("paymentStatus", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createBookingMutation.isPending}
              >
                {createBookingMutation.isPending ? "Creating..." : "Create Booking"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
}
