import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isAfter, isBefore, isEqual } from "date-fns";
import { enUS } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { downloadCSV } from "@/utils/csvExport";
import type { Apartment, Booking, Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { bookingValidation } from "@shared/schema";
import { Calendar as CalendarIcon, Search, CheckCircle } from "lucide-react";

// Extended booking type that includes client information
interface ExtendedBooking extends Booking {
  client?: {
    name: string;
    phone: string;
    cnic?: string;
  };
  notes?: string;
}


import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function RoomCalendar() {
  const { toast } = useToast();
  const { user } = useSimpleAuth();
  const { isAdmin, isAffiliate } = useRoleAccess();
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<ExtendedBooking | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState<ExtendedBooking | null>(null);

  // Calendar navigation state
  const [currentDate, setCurrentDate] = useState(new Date());

  // Room availability search state
  const [availabilitySearch, setAvailabilitySearch] = useState({
    checkIn: "",
    checkOut: "",
    isSearching: false
  });
  const [availableRooms, setAvailableRooms] = useState<Apartment[]>([]);

  // Auto-populate host name from user profile
  const getHostName = () => {
    if (user) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Current User';
    }
    return 'Current User';
  };

  const [formData, setFormData] = useState({
    clientName: "",
    clientPhone: "",
    clientCnic: "",
    checkIn: "",
    checkOut: "",
    status: "pending",
    paymentStatus: "pending",
    hostName: getHostName()
  });
  const queryClient = useQueryClient();

  // Calendar navigation functions
  const goToPreviousMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  const goToSpecificMonth = (year: number, month: number) => {
    setCurrentDate(new Date(year, month, 1));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't interfere with form inputs
      }

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPreviousMonth();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNextMonth();
          break;
        case 'Home':
          event.preventDefault();
          goToCurrentMonth();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add the createBooking mutation
  const createBookingMutation = useMutation({
    mutationFn: async (newBooking: any) => {
      // First create a customer if needed
      const customerResponse = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newBooking.clientName,
          phone: newBooking.clientPhone,
          cnic: newBooking.clientCnic || "00000-0000000-0" // Use provided CNIC or default
        }),
      });

      if (!customerResponse.ok) {
        throw new Error('Failed to create customer');
      }

      const customer = await customerResponse.json();

      // Then create the booking with the new customer ID
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apartmentId: parseInt(newBooking.apartmentId),
          customerId: customer.id,
          checkIn: new Date(newBooking.checkIn).toISOString(),
          checkOut: new Date(newBooking.checkOut).toISOString(),
          status: newBooking.status,
          paymentStatus: newBooking.paymentStatus,
          hostName: newBooking.hostName,
          totalAmount: 500 // Default amount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }

      return response.json();
    },
    onSuccess: () => {
      // Close the modal
      setIsBookingModalOpen(false);

      // Show success toast
      toast({
        title: "Success",
        description: "Booking created successfully",
      });

      // Reset form data
      setFormData({
        clientName: "",
        clientPhone: "",
        clientCnic: "",
        checkIn: "",
        checkOut: "",
        status: "pending",
        paymentStatus: "pending",
        hostName: getHostName()
      });

      // Refresh the bookings data for the selected room and customers data
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", selectedRoomId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create booking: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // Delete booking mutation
  const deleteBookingMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete booking');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the bookings data for the selected room and customers data
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", selectedRoomId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });

      toast({
        title: "Success",
        description: "Booking deleted successfully",
      });

      // Close the delete dialog
      setIsDeleteDialogOpen(false);
      setDeletingBooking(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete booking: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // Edit booking mutation
  const editBookingMutation = useMutation({
    mutationFn: async (updatedBooking: any) => {
      const response = await fetch(`/api/bookings/${updatedBooking.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apartmentId: parseInt(updatedBooking.apartmentId),
          customerId: updatedBooking.customerId,
          checkIn: new Date(updatedBooking.checkIn).toISOString(),
          checkOut: new Date(updatedBooking.checkOut).toISOString(),
          status: updatedBooking.status,
          paymentStatus: updatedBooking.paymentStatus,
          hostName: updatedBooking.hostName,
          totalAmount: updatedBooking.totalAmount || 500
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update booking');
      }

      return response.json();
    },
    onSuccess: () => {
      // Refresh the bookings data for the selected room and customers data
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", selectedRoomId] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });

      toast({
        title: "Success",
        description: "Booking updated successfully",
      });

      // Close the edit modal
      setIsEditModalOpen(false);
      setEditingBooking(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update booking: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });

  // Function to handle booking creation
  const createBooking = (bookingData: any) => {
    createBookingMutation.mutate(bookingData);
  };

  // Function to handle booking deletion
  const handleDeleteBooking = (booking: ExtendedBooking) => {
    setDeletingBooking(booking);
    setIsDeleteDialogOpen(true);
  };

  // Function to handle booking editing
  const handleEditBooking = (booking: ExtendedBooking) => {
    setEditingBooking(booking);
    setIsEditModalOpen(true);
  };

  // Function to check if dates overlap (strict overlap check)
  const datesOverlap = (
    start1: Date, 
    end1: Date, 
    start2: Date, 
    end2: Date
  ): boolean => {
    // Two date ranges overlap if:
    // start1 < end2 AND start2 < end1
    // This handles all overlap scenarios including:
    // - Partial overlaps (start or end within existing booking)
    // - Complete containment (new booking within existing or vice versa)
    // - Exact matches
    return isBefore(start1, end2) && isBefore(start2, end1);
  };

  // Function to check room availability for given dates
  const checkRoomAvailability = (apartmentId: number, checkIn: string, checkOut: string): boolean => {
    if (!checkIn || !checkOut) return false;
    
    const requestedCheckIn = new Date(checkIn);
    const requestedCheckOut = new Date(checkOut);
    
    // Validate that check-out is after check-in
    if (!isAfter(requestedCheckOut, requestedCheckIn)) {
      return false;
    }
    
    // Find all active bookings for this apartment
    const apartmentBookings = allBookings.filter(booking => 
      booking.apartmentId === apartmentId && 
      (booking.status === 'booked' || booking.status === 'pending')
    );
    
    // Check if any booking overlaps with requested dates
    for (const booking of apartmentBookings) {
      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);
      
      // Skip invalid booking dates
      if (!bookingCheckIn || !bookingCheckOut || !isAfter(bookingCheckOut, bookingCheckIn)) {
        continue;
      }
      
      if (datesOverlap(requestedCheckIn, requestedCheckOut, bookingCheckIn, bookingCheckOut)) {
        return false; // Room is not available due to overlap
      }
    }
    
    return true; // Room is available
  };

  // Function to search for available rooms
  const searchAvailableRooms = () => {
    // Validation
    if (!availabilitySearch.checkIn || !availabilitySearch.checkOut) {
      toast({
        title: "Validation Error",
        description: "Please select both check-in and check-out dates.",
        variant: "destructive",
      });
      return;
    }

    const checkInDate = new Date(availabilitySearch.checkIn);
    const checkOutDate = new Date(availabilitySearch.checkOut);
    const now = new Date();

    // Check if dates are valid
    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      toast({
        title: "Validation Error",
        description: "Please enter valid dates.",
        variant: "destructive",
      });
      return;
    }

    // Check if check-out is after check-in
    if (!isAfter(checkOutDate, checkInDate)) {
      toast({
        title: "Validation Error",
        description: "Check-out date must be after check-in date.",
        variant: "destructive",
      });
      return;
    }

    // Check if check-in is not in the past
    if (isBefore(checkInDate, now)) {
      toast({
        title: "Validation Error",
        description: "Check-in date cannot be in the past.",
        variant: "destructive",
      });
      return;
    }

    setAvailabilitySearch(prev => ({ ...prev, isSearching: true }));

    try {
      // Filter available rooms
      const available = apartments.filter(apartment => 
        checkRoomAvailability(apartment.id, availabilitySearch.checkIn, availabilitySearch.checkOut)
      );

      setAvailableRooms(available);

      // Show appropriate message
      if (available.length === 0) {
        toast({
          title: "No Rooms Available",
          description: "No rooms are available for the selected dates. Please try different dates.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Search Complete",
          description: `Found ${available.length} available room${available.length !== 1 ? 's' : ''} for your selected dates.`,
        });
      }
    } catch (error) {
      console.error('Error searching for available rooms:', error);
      toast({
        title: "Search Error",
        description: "An error occurred while searching for available rooms. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAvailabilitySearch(prev => ({ ...prev, isSearching: false }));
    }
  };

  // Function to select a room from availability results
  const selectRoomFromAvailability = (apartmentId: number) => {
    setSelectedRoomId(apartmentId.toString());
    
    // Pre-populate booking form with searched dates if available
    if (availabilitySearch.checkIn && availabilitySearch.checkOut) {
      setFormData(prev => ({
        ...prev,
        checkIn: availabilitySearch.checkIn,
        checkOut: availabilitySearch.checkOut,
        hostName: getHostName()
      }));
    }
    
    // Scroll to calendar section
    setTimeout(() => {
      const calendarSection = document.getElementById('calendar-section');
      if (calendarSection) {
        calendarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);

    // Show success message
    const selectedApartment = apartments.find(apt => apt.id === apartmentId);
    if (selectedApartment) {
      toast({
        title: "Room Selected",
        description: `Room ${selectedApartment.roomNumber} selected. Calendar view updated below.`,
      });
    }
  };

  // Function to clear availability search
  const clearAvailabilitySearch = () => {
    setAvailabilitySearch({
      checkIn: "",
      checkOut: "",
      isSearching: false
    });
    setAvailableRooms([]);
  };

  // Function to quick book a room from availability results
  const quickBookRoom = (apartmentId: number) => {
    setSelectedRoomId(apartmentId.toString());
    
    // Pre-populate booking form with searched dates
    if (availabilitySearch.checkIn && availabilitySearch.checkOut) {
      setFormData(prev => ({
        ...prev,
        checkIn: availabilitySearch.checkIn,
        checkOut: availabilitySearch.checkOut,
        hostName: getHostName()
      }));
    }
    
    // Open booking modal
    setIsBookingModalOpen(true);

    // Show success message
    const selectedApartment = apartments.find(apt => apt.id === apartmentId);
    if (selectedApartment) {
      toast({
        title: "Quick Booking",
        description: `Booking form opened for Room ${selectedApartment.roomNumber} with your selected dates.`,
      });
    }
  };

  const { data: apartments = [] } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
    refetchInterval: 30000, // Refetch every 30 seconds for real-time sync
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", selectedRoomId],
    queryFn: async () => {
      if (!selectedRoomId) return [];
      const response = await fetch(`/api/bookings?apartmentId=${selectedRoomId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      return response.json();
    },
    enabled: !!selectedRoomId,
  });

  // Fetch customers data to get real client information
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: async () => {
      const response = await fetch('/api/customers');
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json();
    },
  });

  // Fetch all bookings for availability checking
  const { data: allBookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/all"],
    queryFn: async () => {
      const response = await fetch('/api/bookings');
      if (!response.ok) {
        throw new Error('Failed to fetch all bookings');
      }
      return response.json();
    },
  });



  // Map bookings with real client information from customers
  const bookingsWithClients: ExtendedBooking[] = bookings.map(booking => {
    const customer = customers.find(c => c.id === booking.customerId);
    return {
      ...booking,
      client: customer ? {
        name: customer.name,
        phone: customer.phone,
        cnic: customer.cnic
      } : {
        name: "Unknown Client",
        phone: "N/A",
        cnic: "N/A"
      }
    };
  });

  const selectedApartment = apartments.find(apt => apt.id.toString() === selectedRoomId);

  // Transform bookings into calendar events
  const events = bookingsWithClients.map(booking => ({
    id: booking.id,
    title: `Booked - ${booking.hostName}`,
    start: new Date(booking.checkIn),
    end: new Date(booking.checkOut),
    resource: booking,
  }));

  // CSV Download function
  const handleDownloadCSV = () => {
    try {
      if (bookingsWithClients.length === 0) {
        toast({
          title: "No Data",
          description: "No booking data available to download",
          variant: "destructive"
        });
        return;
      }

      const csvData = bookingsWithClients.map(booking => ({
        "Booking Date": format(new Date(booking.createdAt), 'MMM dd, yyyy h:mm a'),
        "Status": booking.status,
        "Check-in": format(new Date(booking.checkIn), 'MMM dd, h:mm a'),
        "Check-out": format(new Date(booking.checkOut), 'MMM dd, h:mm a'),
        "Host Name": "web",
        "Client Name": booking.client?.name || "",
        "Client Phone": booking.client?.phone || "",
        "Client CNIC": booking.client?.cnic || "",
        "Payment Status": booking.paymentStatus,
      }));

      const filename = `bookings-room-${selectedApartment?.roomNumber}-${format(currentDate, 'yyyy-MM')}.csv`;
      downloadCSV(csvData, filename);

      toast({
        title: "Success",
        description: "Booking data downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download booking data",
        variant: "destructive"
      });
    }
  };

  // Generate calendar grid data for the table view
  const generateCalendarData = () => {
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const startingDayOfWeek = firstDay.getDay();

    const calendarDays = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      calendarDays.push({ day: '', status: '', isCurrentMonth: false });
    }

    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(currentYear, currentMonth, day);
      const dateString = dayDate.toISOString().split('T')[0];
      const today = new Date();
      const isToday = dayDate.toDateString() === today.toDateString();

      // Check if this date has any bookings
      const booking = bookingsWithClients.find(b => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return dayDate >= checkIn && dayDate < checkOut;
      });

      let status = 'available';
      if (booking) {
        status = booking.status === 'booked' ? 'booked' : 'pending';
      }

      calendarDays.push({
        day: day.toString(),
        status,
        isCurrentMonth: true,
        isToday,
        date: dateString,
        booking
      });
    }

    return calendarDays;
  };

  const calendarData = selectedRoomId ? generateCalendarData() : [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'available':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Room Calendar Management</h1>
          <p className="text-gray-600">Manage room availability and bookings across all properties</p>
        </div>

        {/* Calendar Section */}
        <div className="space-y-6">
          {/* Room Availability Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Check Room Availability
              </CardTitle>
              <p className="text-sm text-gray-600">
                Enter your desired check-in and check-out dates to see all available rooms
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="availability-checkin">Check-in Date & Time</Label>
                    <Input
                      id="availability-checkin"
                      type="datetime-local"
                      value={availabilitySearch.checkIn}
                      onChange={(e) => setAvailabilitySearch(prev => ({ 
                        ...prev, 
                        checkIn: e.target.value 
                      }))}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Select your arrival date and time</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availability-checkout">Check-out Date & Time</Label>
                    <Input
                      id="availability-checkout"
                      type="datetime-local"
                      value={availabilitySearch.checkOut}
                      onChange={(e) => setAvailabilitySearch(prev => ({ 
                        ...prev, 
                        checkOut: e.target.value 
                      }))}
                      min={availabilitySearch.checkIn || new Date().toISOString().slice(0, 16)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Select your departure date and time</p>
                  </div>
                  <div className="flex items-end gap-2">
                    <Button 
                      onClick={searchAvailableRooms}
                      disabled={availabilitySearch.isSearching || !availabilitySearch.checkIn || !availabilitySearch.checkOut}
                      className="bg-green-600 hover:bg-green-700 text-white flex-1"
                    >
                      {availabilitySearch.isSearching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search Rooms
                        </>
                      )}
                    </Button>
                    {(availabilitySearch.checkIn || availabilitySearch.checkOut || availableRooms.length > 0) && (
                      <Button 
                        onClick={clearAvailabilitySearch}
                        variant="outline"
                        size="sm"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>

                {/* Available Rooms Results */}
                {availableRooms.length > 0 && (
                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Available Rooms ({availableRooms.length})
                      </h3>
                      <div className="text-sm text-gray-600">
                        {availabilitySearch.checkIn && availabilitySearch.checkOut && (
                          <span>
                            {format(new Date(availabilitySearch.checkIn), 'MMM dd, yyyy')} - {format(new Date(availabilitySearch.checkOut), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availableRooms.map((apartment) => {
                        // Calculate total nights and cost
                        const checkInDate = new Date(availabilitySearch.checkIn);
                        const checkOutDate = new Date(availabilitySearch.checkOut);
                        const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
                        const totalCost = nights * apartment.price;
                        const discountedPrice = apartment.discountPercentage 
                          ? apartment.price * (1 - apartment.discountPercentage / 100)
                          : apartment.price;
                        const discountedTotal = nights * discountedPrice;

                        return (
                          <Card 
                            key={apartment.id} 
                            className="cursor-pointer hover:shadow-lg transition-all duration-200 border-green-200 bg-green-50 hover:bg-green-100"
                            onClick={() => selectRoomFromAvailability(apartment.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-semibold text-green-800">
                                  Room {apartment.roomNumber}
                                </h4>
                                <Badge variant="secondary" className="bg-green-100 text-green-800">
                                  Available
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-700 mb-3 font-medium">{apartment.title}</p>
                              
                              <div className="space-y-2 mb-3">
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <span>{apartment.bedrooms} bed • {apartment.bathrooms} bath</span>
                                  <span>{apartment.squareFeet} sq ft</span>
                                </div>
                                
                                <div className="text-sm">
                                  {apartment.discountPercentage && apartment.discountPercentage > 0 ? (
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="line-through text-gray-500">PKR {apartment.price}</span>
                                        <Badge variant="destructive" className="text-xs">
                                          {apartment.discountPercentage}% OFF
                                        </Badge>
                                      </div>
                                      <div className="font-medium text-green-600">
                                        PKR {Math.round(discountedPrice)}/night
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="font-medium text-green-600">
                                      PKR {apartment.price}/night
                                    </div>
                                  )}
                                </div>

                                <div className="text-xs text-gray-600 pt-1 border-t border-green-200">
                                  <div className="flex justify-between">
                                    <span>{nights} night{nights !== 1 ? 's' : ''}</span>
                                    <span className="font-medium">
                                      Total: PKR {apartment.discountPercentage ? Math.round(discountedTotal) : totalCost}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="border-green-600 text-green-600 hover:bg-green-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectRoomFromAvailability(apartment.id);
                                  }}
                                >
                                  View Calendar
                                </Button>
                                <Button 
                                  size="sm" 
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    quickBookRoom(apartment.id);
                                  }}
                                >
                                  Quick Book
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* No rooms available message */}
                {availabilitySearch.checkIn && availabilitySearch.checkOut && 
                 availableRooms.length === 0 && !availabilitySearch.isSearching && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-center">
                      No rooms are available for the selected dates. Please try different dates.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Room Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Room</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-w-md">
                <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a room to view calendar..." />
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
            </CardContent>
          </Card>

            {selectedRoomId && selectedApartment ? (
              <>
                {/* Calendar View */}
                <Card id="calendar-section">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>
                        Room {selectedApartment.roomNumber} - {format(currentDate, 'MMMM yyyy')}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button onClick={goToPreviousMonth} variant="outline" size="sm">
                          ← Previous
                        </Button>
                        <Button onClick={goToCurrentMonth} variant="outline" size="sm">
                          Today
                        </Button>
                        <Button onClick={goToNextMonth} variant="outline" size="sm">
                          Next →
                        </Button>

                        {/* Month/Year Selector */}
                        <Select
                          value={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
                          onValueChange={(value) => {
                            const [year, month] = value.split('-').map(Number);
                            goToSpecificMonth(year, month);
                          }}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 24 }, (_, i) => {
                              const date = new Date();
                              date.setMonth(date.getMonth() - 12 + i);
                              const year = date.getFullYear();
                              const month = date.getMonth();
                              return (
                                <SelectItem key={`month-selector-${i}`} value={`${year}-${month}`}>
                                  {format(date, 'MMM yyyy')}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>

                        <Button onClick={handleDownloadCSV} variant="outline">
                          Download CSV
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2 mb-6">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-semibold p-3 text-secondary">
                          {day}
                        </div>
                      ))}

                      {calendarData.map((day, index) => (
                        <div
                          key={index}
                          className={`text-center p-3 rounded cursor-pointer transition-colors relative ${
                            day.isCurrentMonth
                              ? getStatusColor(day.status)
                              : 'text-gray-400'
                          } ${
                            day.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''
                          }`}
                          title={day.booking ? `Booked by ${day.booking.hostName}` : ''}
                        >
                          {day.day}
                          {day.isToday && (
                            <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div className="space-y-4">
                      <div className="flex flex-wrap justify-center gap-6 text-sm">
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-green-100 rounded mr-2"></div>
                          <span>Available</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-red-100 rounded mr-2"></div>
                          <span>Booked</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-4 h-4 bg-yellow-100 rounded mr-2"></div>
                          <span>Pending</span>
                        </div>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                          <span>Today</span>
                        </div>
                      </div>

                      {/* Keyboard shortcuts info */}
                      <div className="text-center text-xs text-gray-500">
                        <span>Use ← → arrow keys to navigate months, Home key to go to current month</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Booking Details Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Booking Details - Room {selectedApartment.roomNumber}</CardTitle>
                    <Button
                      onClick={() => setIsBookingModalOpen(true)}
                      className="bg-sitenest-primary hover:bg-sitenest-primary/90 text-white"
                    >
                      Add Booking
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {bookingsWithClients.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Booking Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Check-in
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Check-out
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Host
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Client Info
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {bookingsWithClients.map((booking) => (
                              <tr key={booking.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {format(new Date(booking.createdAt), 'MMM dd, yyyy h:mm a')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={booking.status === 'booked' ? 'destructive' : 'secondary'}>
                                    {booking.status}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {format(new Date(booking.checkIn), 'MMM dd, h:mm a')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {format(new Date(booking.checkOut), 'MMM dd, h:mm a')}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  web
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {booking.client?.name && (
                                    <div>
                                      <div>{booking.client.name}</div>
                                      <div className="text-xs text-gray-500">{booking.client.phone}</div>
                                      {booking.client.cnic && (
                                        <div className="text-xs text-gray-500">
                                          CNIC: {booking.client.cnic}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                    {booking.paymentStatus}
                                  </Badge>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    <Button
                                      onClick={() => handleEditBooking(booking)}
                                      variant="outline"
                                      size="sm"
                                      className="text-blue-600 hover:text-blue-900"
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      onClick={() => handleDeleteBooking(booking)}
                                      variant="outline"
                                      size="sm"
                                      className="text-red-600 hover:text-red-900"
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        No bookings found for this room.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-8">
                    <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Room</h3>
                    <p className="text-gray-600">Choose a room from the dropdown above to view its calendar and manage bookings.</p>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        {/* Add the booking modal */}
        {isBookingModalOpen && (
          <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add New Booking for Room {selectedApartment?.roomNumber}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();

                // Basic validation
                if (!formData.clientName || !formData.clientPhone || !formData.clientCnic ||
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

                // Create booking object from form data
                const newBooking = {
                  apartmentId: selectedRoomId,
                  clientName: formData.clientName,
                  clientPhone: formData.clientPhone,
                  clientCnic: formData.clientCnic,
                  checkIn: formData.checkIn,
                  checkOut: formData.checkOut,
                  status: formData.status,
                  paymentStatus: formData.paymentStatus,
                  hostName: getHostName()
                };

                // Submit the booking directly
                createBookingMutation.mutate(newBooking);
              }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        value={formData.clientName}
                        onChange={(e) => setFormData({...formData, clientName: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="clientPhone">Client Phone</Label>
                      <Input
                        id="clientPhone"
                        value={formData.clientPhone}
                        onChange={(e) => setFormData({...formData, clientPhone: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="clientCnic">Client CNIC</Label>
                    <Input
                      id="clientCnic"
                      value={formData.clientCnic}
                      onChange={(e) => setFormData({...formData, clientCnic: e.target.value})}
                      placeholder="12345-1234567-1"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="checkIn">Check-in Date</Label>
                      <Input
                        id="checkIn"
                        type="datetime-local"
                        value={formData.checkIn}
                        onChange={(e) => setFormData({...formData, checkIn: e.target.value})}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="checkOut">Check-out Date</Label>
                      <Input
                        id="checkOut"
                        type="datetime-local"
                        value={formData.checkOut}
                        onChange={(e) => setFormData({...formData, checkOut: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({...formData, status: value})}
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

                    <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <Select
                        value={formData.paymentStatus}
                        onValueChange={(value) => setFormData({...formData, paymentStatus: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hostName">Host Name</Label>
                    <Input
                      id="hostName"
                      value={formData.hostName}
                      disabled
                      className="bg-gray-50 text-gray-600"
                    />
                    <p className="text-xs text-gray-500">Auto-populated from your profile</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                  <Button type="button" variant="outline" onClick={() => setIsBookingModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-brand-coral hover:bg-red-600"
                    disabled={createBookingMutation.isPending}
                  >
                    {createBookingMutation.isPending ? "Creating..." : "Add Booking"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        {isDeleteDialogOpen && deletingBooking && (
          <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Delete Booking</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-600">
                  Are you sure you want to delete this booking for{" "}
                  <span className="font-semibold">{deletingBooking.client?.name || "Unknown Client"}</span>?
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm">
                    <p><strong>Check-in:</strong> {format(new Date(deletingBooking.checkIn), 'MMM dd, yyyy h:mm a')}</p>
                    <p><strong>Check-out:</strong> {format(new Date(deletingBooking.checkOut), 'MMM dd, yyyy h:mm a')}</p>
                    <p><strong>Status:</strong> {deletingBooking.status}</p>
                    <p><strong>Customer CNIC:</strong> {deletingBooking.client?.cnic || 'N/A'}</p>
                  </div>
                </div>
                <p className="text-xs text-red-600 mt-2">
                  This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDeleteDialogOpen(false)}
                  disabled={deleteBookingMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => deleteBookingMutation.mutate(deletingBooking.id)}
                  variant="destructive"
                  disabled={deleteBookingMutation.isPending}
                >
                  {deleteBookingMutation.isPending ? "Deleting..." : "Delete Booking"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit Booking Modal */}
        {isEditModalOpen && editingBooking && (
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Edit Booking for {editingBooking.client?.name || "Unknown Client"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => {
                e.preventDefault();

                const formData = new FormData(e.target as HTMLFormElement);
                const updatedBooking = {
                  id: editingBooking.id,
                  apartmentId: selectedRoomId,
                  customerId: editingBooking.customerId,
                  checkIn: formData.get('checkIn') as string,
                  checkOut: formData.get('checkOut') as string,
                  status: formData.get('status') as string,
                  paymentStatus: formData.get('paymentStatus') as string,
                  hostName: editingBooking.hostName,
                  totalAmount: editingBooking.totalAmount
                };

                // Basic validation
                if (!updatedBooking.checkIn || !updatedBooking.checkOut) {
                  toast({
                    title: "Validation Error",
                    description: "Please fill in all required fields.",
                    variant: "destructive",
                  });
                  return;
                }

                // Check if check-out is after check-in
                if (new Date(updatedBooking.checkOut) <= new Date(updatedBooking.checkIn)) {
                  toast({
                    title: "Validation Error",
                    description: "Check-out date must be after check-in date.",
                    variant: "destructive",
                  });
                  return;
                }

                editBookingMutation.mutate(updatedBooking);
              }}>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-checkIn">Check-in Date</Label>
                      <Input
                        id="edit-checkIn"
                        name="checkIn"
                        type="datetime-local"
                        defaultValue={format(new Date(editingBooking.checkIn), "yyyy-MM-dd'T'HH:mm")}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-checkOut">Check-out Date</Label>
                      <Input
                        id="edit-checkOut"
                        name="checkOut"
                        type="datetime-local"
                        defaultValue={format(new Date(editingBooking.checkOut), "yyyy-MM-dd'T'HH:mm")}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Status</Label>
                      <Select name="status" defaultValue={editingBooking.status}>
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

                    <div className="space-y-2">
                      <Label htmlFor="edit-paymentStatus">Payment Status</Label>
                      <Select name="paymentStatus" defaultValue={editingBooking.paymentStatus}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Client Information</Label>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm"><strong>Name:</strong> {editingBooking.client?.name || "Unknown"}</p>
                      <p className="text-sm"><strong>Phone:</strong> {editingBooking.client?.phone || "N/A"}</p>
                      <p className="text-sm"><strong>CNIC:</strong> {editingBooking.client?.cnic || "N/A"}</p>
                    </div>
                    <p className="text-xs text-gray-500">Client information cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Host Name</Label>
                    <Input
                      value={editingBooking.hostName}
                      disabled
                      className="bg-gray-50 text-gray-600"
                    />
                    <p className="text-xs text-gray-500">Host name cannot be changed</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={editBookingMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={editBookingMutation.isPending}
                  >
                    {editBookingMutation.isPending ? "Updating..." : "Update Booking"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}