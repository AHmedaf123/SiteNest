import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Apartment, Booking, Customer } from "@shared/schema";
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
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");

  const { data: apartments = [] } = useQuery<Apartment[]>({
    queryKey: ["/api/apartments"],
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", selectedRoomId],
    enabled: !!selectedRoomId,
  });

  const selectedApartment = apartments.find(apt => apt.id.toString() === selectedRoomId);

  // Transform bookings into calendar events
  const events = bookings.map(booking => ({
    id: booking.id,
    title: `Booked - ${booking.hostName}`,
    start: new Date(booking.checkIn),
    end: new Date(booking.checkOut),
    resource: booking,
  }));

  // Generate calendar grid data for the table view
  const generateCalendarData = () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
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
      const currentDate = new Date(currentYear, currentMonth, day);
      const dateString = currentDate.toISOString().split('T')[0];
      
      // Check if this date has any bookings
      const booking = bookings.find(b => {
        const checkIn = new Date(b.checkIn);
        const checkOut = new Date(b.checkOut);
        return currentDate >= checkIn && currentDate < checkOut;
      });

      let status = 'available';
      if (booking) {
        status = booking.status === 'booked' ? 'booked' : 'pending';
      }

      calendarDays.push({
        day: day.toString(),
        status,
        isCurrentMonth: true,
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
    <section className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Room Availability Calendar</h2>
          <p className="text-xl text-secondary">Check availability and booking status for any room</p>
        </div>
        
        {/* Room Selection Dropdown */}
        <div className="max-w-md mx-auto mb-12">
          <Select value={selectedRoomId} onValueChange={setSelectedRoomId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a room..." />
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
        
        {selectedRoomId && selectedApartment && (
          <>
            {/* Calendar View */}
            <Card className="mb-12">
              <CardHeader>
                <CardTitle>
                  Room {selectedApartment.roomNumber} - {format(new Date(), 'MMMM yyyy')}
                </CardTitle>
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
                      className={`text-center p-3 rounded cursor-pointer transition-colors ${
                        day.isCurrentMonth 
                          ? getStatusColor(day.status)
                          : 'text-gray-400'
                      }`}
                      title={day.booking ? `Booked by ${day.booking.hostName}` : ''}
                    >
                      {day.day}
                    </div>
                  ))}
                </div>
                
                {/* Legend */}
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
                </div>
              </CardContent>
            </Card>
            
            {/* Booking Details Table */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Details - Room {selectedApartment.roomNumber}</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dates
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
                            Payment
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {bookings.map((booking) => (
                          <tr key={booking.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {format(new Date(booking.checkIn), 'MMM dd')} - {format(new Date(booking.checkOut), 'MMM dd, yyyy')}
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
                              {booking.hostName}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={booking.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                                {booking.paymentStatus}
                              </Badge>
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
        )}
      </div>
    </section>
  );
}
