import React, { createContext, useContext, useState, ReactNode } from 'react';

interface BookingDates {
  checkIn?: string;
  checkOut?: string;
}

interface BookingContextType {
  bookingDates: BookingDates;
  setBookingDates: (dates: BookingDates) => void;
  clearBookingDates: () => void;
  getStayDuration: () => number;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [bookingDates, setBookingDates] = useState<BookingDates>({});

  const clearBookingDates = () => {
    setBookingDates({});
  };

  const getStayDuration = (): number => {
    if (!bookingDates.checkIn || !bookingDates.checkOut) {
      return 0;
    }

    const checkInDate = new Date(bookingDates.checkIn);
    const checkOutDate = new Date(bookingDates.checkOut);
    const diffTime = checkOutDate.getTime() - checkInDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays);
  };

  return (
    <BookingContext.Provider value={{
      bookingDates,
      setBookingDates,
      clearBookingDates,
      getStayDuration
    }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBookingContext() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error('useBookingContext must be used within a BookingProvider');
  }
  return context;
}

// Hook that safely returns booking context or default values
export function useBookingDates() {
  try {
    return useBookingContext();
  } catch {
    // Return default values if not within provider
    return {
      bookingDates: {},
      setBookingDates: () => {},
      clearBookingDates: () => {},
      getStayDuration: () => 0
    };
  }
}
