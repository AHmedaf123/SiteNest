/**
 * Chatbot Availability Service
 * Provides real-time room availability information for the chatbot
 */

import { storage } from './storage';
import { AvailabilityService } from './services/availability.service';
import { log } from './utils/logger';

interface AvailabilityRequest {
  checkIn?: string;
  checkOut?: string;
  roomNumber?: string;
  guestCount?: number;
  excludeApartmentId?: number;
}

interface AvailabilityResult {
  available: boolean;
  requestedRoom?: any;
  alternatives?: any[];
  message: string;
  quickActions: string[];
  type?: string;
  data?: any;
}

interface RoomAvailabilityInfo {
  id: number;
  apartmentId: number;
  roomNumber: string;
  title: string;
  price: number;
  bedrooms: number;
  imageUrl: string;
  description: string;
  isAvailable: boolean;
}

export class ChatbotAvailabilityService {
  private static availabilityService = new AvailabilityService();
  
  /**
   * Check availability for chatbot queries
   */
  static async checkAvailability(request: AvailabilityRequest): Promise<AvailabilityResult> {
    try {
      const { checkIn, checkOut, roomNumber, guestCount, excludeApartmentId } = request;

      // If no dates provided, show available rooms for today
      if (!checkIn || !checkOut) {
        return await this.getAvailableRoomsToday();
      }

      // Validate dates
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (checkInDate < today) {
        return {
          available: false,
          message: "Check-in date cannot be in the past. Please select a future date.",
          quickActions: ['check_availability', 'contact_support']
        };
      }

      if (checkOutDate <= checkInDate) {
        return {
          available: false,
          message: "Check-out date must be after check-in date. Please select valid dates.",
          quickActions: ['check_availability', 'contact_support']
        };
      }

      // If specific room requested
      if (roomNumber) {
        return await this.checkSpecificRoom(roomNumber, checkIn, checkOut, excludeApartmentId);
      }

      // General availability check
      return await this.checkGeneralAvailability(checkIn, checkOut, guestCount);

    } catch (error) {
      log.error('Chatbot availability check failed', error);
      return {
        available: false,
        message: "I'm having trouble checking availability right now. Please contact us directly at 0311-5197087 for immediate assistance.",
        quickActions: ['open_whatsapp', 'contact_support']
      };
    }
  }

  /**
   * Get available rooms for today
   */
  private static async getAvailableRoomsToday(): Promise<AvailabilityResult> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const allApartments = await storage.getApartments();
      const availableRooms: RoomAvailabilityInfo[] = [];

      for (const apartment of allApartments) {
        const isAvailable = await storage.checkAvailability(
          apartment.id,
          today,
          tomorrowStr
        );

        if (isAvailable) {
          availableRooms.push({
            id: apartment.id,
            apartmentId: apartment.id,
            roomNumber: apartment.roomNumber,
            title: apartment.title,
            price: apartment.price,
            bedrooms: apartment.bedrooms,
            imageUrl: apartment.imageUrl,
            description: apartment.description,
            isAvailable: true
          });
        }
      }

      if (availableRooms.length > 0) {
        return {
          available: true,
          message: `Great! We have ${availableRooms.length} rooms available today. Here are your options:`,
          quickActions: ['open_whatsapp', 'check_specific_dates', 'pricing'],
          type: 'carousel',
          data: availableRooms
        };
      } else {
        return {
          available: false,
          message: "All rooms are currently booked for today. Would you like to check availability for specific dates or contact us for more options?",
          quickActions: ['check_specific_dates', 'open_whatsapp', 'contact_support']
        };
      }
    } catch (error) {
      log.error('Error getting today\'s availability', error);
      throw error;
    }
  }

  /**
   * Check availability for a specific room
   */
  private static async checkSpecificRoom(roomNumber: string, checkIn: string, checkOut: string, excludeApartmentId?: number): Promise<AvailabilityResult> {
    try {
      const requestedRoom = await storage.getApartmentByRoomNumber(roomNumber);
      
      if (!requestedRoom) {
        return {
          available: false,
          message: `Room ${roomNumber} not found. Please check the room number or contact us at 0311-5197087.`,
          quickActions: ['check_availability', 'open_whatsapp', 'contact_support']
        };
      }

      const isAvailable = await storage.checkAvailability(
        requestedRoom.id,
        checkIn,
        checkOut
      );

      if (isAvailable) {
        const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
        const totalPrice = requestedRoom.price * nights;

        return {
          available: true,
          requestedRoom,
          message: `Excellent! Room ${roomNumber} is available from ${checkIn} to ${checkOut}. Total cost: PKR ${totalPrice.toLocaleString()} for ${nights} night(s).`,
          quickActions: ['open_whatsapp', 'book_now', 'pricing_details'],
          type: 'pricing_breakdown',
          data: {
            basePrice: requestedRoom.price,
            nights,
            total: totalPrice,
            discount: 0
          }
        };
      } else {
        // Find alternatives (exclude the unavailable apartment)
        const excludeId = excludeApartmentId || requestedRoom.id;
        const alternatives = await this.findAlternativeRooms(checkIn, checkOut, excludeId);
        
        if (alternatives.length > 0) {
          return {
            available: false,
            requestedRoom,
            alternatives,
            message: `Room ${roomNumber} is not available for those dates. Here are some alternatives:`,
            quickActions: ['open_whatsapp', 'check_other_dates', 'contact_support'],
            type: 'carousel',
            data: alternatives
          };
        } else {
          return {
            available: false,
            requestedRoom,
            message: `Room ${roomNumber} is not available for those dates, and we don't have any alternatives. Please try different dates or contact us at 0311-5197087.`,
            quickActions: ['check_other_dates', 'open_whatsapp', 'contact_support']
          };
        }
      }
    } catch (error) {
      log.error('Error checking specific room', error);
      throw error;
    }
  }

  /**
   * Check general availability without specific room
   */
  private static async checkGeneralAvailability(checkIn: string, checkOut: string, guestCount?: number): Promise<AvailabilityResult> {
    try {
      const allApartments = await storage.getApartments();
      const availableRooms: RoomAvailabilityInfo[] = [];

      for (const apartment of allApartments) {
        const isAvailable = await storage.checkAvailability(
          apartment.id,
          checkIn,
          checkOut
        );

        if (isAvailable) {
          // Filter by guest count if provided
          if (guestCount && apartment.bedrooms * 2 < guestCount) {
            continue; // Skip rooms that can't accommodate the guest count
          }

          availableRooms.push({
            id: apartment.id,
            apartmentId: apartment.id,
            roomNumber: apartment.roomNumber,
            title: apartment.title,
            price: apartment.price,
            bedrooms: apartment.bedrooms,
            imageUrl: apartment.imageUrl,
            description: apartment.description,
            isAvailable: true
          });
        }
      }

      if (availableRooms.length > 0) {
        const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));

        // Store available rooms for potential email notification
        const result = {
          available: true,
          message: `Perfect! We have ${availableRooms.length} room(s) available from ${checkIn} to ${checkOut} (${nights} night${nights > 1 ? 's' : ''}):`,
          quickActions: ['open_whatsapp', 'book_now', 'pricing_details'],
          type: 'carousel',
          data: availableRooms,
          emailData: {
            availableRooms: availableRooms.map(room => ({
              roomNumber: room.roomNumber,
              title: room.title,
              price: room.price
            })),
            checkIn,
            checkOut,
            nights
          }
        };

        return result;
      } else {
        return {
          available: false,
          message: `Sorry, no rooms are available from ${checkIn} to ${checkOut}. Please try different dates or contact us at 0311-5197087 for more options.`,
          quickActions: ['check_other_dates', 'open_whatsapp', 'contact_support']
        };
      }
    } catch (error) {
      log.error('Error checking general availability', error);
      throw error;
    }
  }

  /**
   * Find alternative rooms when requested room is not available
   */
  private static async findAlternativeRooms(checkIn: string, checkOut: string, excludeRoomId: number): Promise<RoomAvailabilityInfo[]> {
    try {
      const allApartments = await storage.getApartments();
      const alternatives: RoomAvailabilityInfo[] = [];

      for (const apartment of allApartments) {
        if (apartment.id === excludeRoomId) continue;

        const isAvailable = await storage.checkAvailability(
          apartment.id,
          checkIn,
          checkOut
        );

        if (isAvailable) {
          alternatives.push({
            id: apartment.id,
            apartmentId: apartment.id,
            roomNumber: apartment.roomNumber,
            title: apartment.title,
            price: apartment.price,
            bedrooms: apartment.bedrooms,
            imageUrl: apartment.imageUrl,
            description: apartment.description,
            isAvailable: true
          });
        }
      }

      return alternatives.slice(0, 3); // Limit to 3 alternatives
    } catch (error) {
      log.error('Error finding alternative rooms', error);
      return [];
    }
  }

  /**
   * Get room availability for a specific date (for calendar integration)
   */
  static async getRoomAvailabilityByDate(date: string): Promise<any> {
    try {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayString = nextDay.toISOString().split('T')[0];

      const allApartments = await storage.getApartments();
      const roomsAvailability = [];

      for (const apartment of allApartments) {
        const isAvailable = await storage.checkAvailability(
          apartment.id,
          date,
          nextDayString
        );

        const bookings = await storage.getBookingsByApartment(apartment.id);
        const bookingForDate = bookings.find(booking => {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          return searchDate >= checkIn && searchDate < checkOut;
        });

        roomsAvailability.push({
          id: apartment.id,
          roomNumber: apartment.roomNumber,
          title: apartment.title,
          description: apartment.description,
          pricePerNight: apartment.price,
          maxGuests: apartment.bedrooms * 2,
          isAvailable,
          booking: bookingForDate ? {
            id: bookingForDate.id,
            hostName: bookingForDate.hostName,
            checkIn: bookingForDate.checkIn,
            checkOut: bookingForDate.checkOut,
            status: bookingForDate.status
          } : null
        });
      }

      return {
        date,
        rooms: roomsAvailability,
        summary: {
          total: roomsAvailability.length,
          available: roomsAvailability.filter(room => room.isAvailable).length,
          booked: roomsAvailability.filter(room => !room.isAvailable).length
        }
      };
    } catch (error) {
      log.error('Error getting room availability by date', error);
      throw error;
    }
  }
}
