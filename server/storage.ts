import { 
  apartments, 
  customers, 
  bookings, 
  reviews, 
  chatSessions,
  users,
  type Apartment, 
  type Customer, 
  type Booking, 
  type Review, 
  type ChatSession,
  type User,
  type InsertApartment, 
  type InsertCustomer, 
  type InsertBooking, 
  type InsertReview, 
  type InsertChatSession,
  type UpsertUser
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Apartments
  getApartments(): Promise<Apartment[]>;
  getApartment(id: number): Promise<Apartment | undefined>;
  getApartmentByRoomNumber(roomNumber: string): Promise<Apartment | undefined>;
  createApartment(apartment: InsertApartment): Promise<Apartment>;

  // Customers
  getCustomer(id: number): Promise<Customer | undefined>;
  getCustomerByPhone(phone: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined>;

  // Bookings
  getBookings(): Promise<Booking[]>;
  getBookingsByApartment(apartmentId: number): Promise<Booking[]>;
  getBookingsByCustomer(customerId: number): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  checkAvailability(apartmentId: number, checkIn: string, checkOut: string): Promise<boolean>;

  // Reviews
  getReviews(): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;

  // Chat Sessions
  getChatSession(sessionId: string): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined>;

  // User operations (for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

export class MemStorage implements IStorage {
  private apartments: Map<number, Apartment>;
  private customers: Map<number, Customer>;
  private bookings: Map<number, Booking>;
  private reviews: Map<number, Review>;
  private chatSessions: Map<string, ChatSession>;
  private users: Map<string, User>;
  private currentId: { [key: string]: number };

  constructor() {
    this.apartments = new Map();
    this.customers = new Map();
    this.bookings = new Map();
    this.reviews = new Map();
    this.chatSessions = new Map();
    this.users = new Map();
    this.currentId = { 
      apartments: 1, 
      customers: 1, 
      bookings: 1, 
      reviews: 1, 
      chatSessions: 1 
    };
    
    this.seedData();
  }

  private seedData() {
    // Seed apartments
    const apartmentData: InsertApartment[] = [
      {
        roomNumber: "714",
        title: "Luxury Studio - Room 714",
        description: "Modern studio with panoramic city views, fully furnished with premium amenities.",
        price: 120,
        bedrooms: 1,
        imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        amenities: ["WiFi", "Kitchen", "City View", "AC"]
      },
      {
        roomNumber: "503",
        title: "Cozy One-Bed - Room 503", 
        description: "Comfortable one-bedroom with separate living area and fully equipped kitchen.",
        price: 150,
        bedrooms: 1,
        imageUrl: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        amenities: ["WiFi", "Kitchen", "Balcony", "AC"]
      },
      {
        roomNumber: "301",
        title: "Family Two-Bed - Room 301",
        description: "Spacious two-bedroom perfect for families, featuring a private balcony.",
        price: 200,
        bedrooms: 2,
        imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        amenities: ["WiFi", "Kitchen", "Balcony", "AC", "Parking"]
      },
      {
        roomNumber: "901",
        title: "Luxury Three-Bed - Room 901",
        description: "Premium three-bedroom penthouse with stunning city views and luxury amenities.",
        price: 350,
        bedrooms: 3,
        imageUrl: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        amenities: ["WiFi", "Kitchen", "City View", "AC", "Parking", "Gym"]
      },
      {
        roomNumber: "205",
        title: "Downtown Loft - Room 205",
        description: "Industrial-style loft in the heart of downtown with exposed brick and high ceilings.",
        price: 180,
        bedrooms: 1,
        imageUrl: "https://images.unsplash.com/photo-1484154218962-a197022b5858?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        amenities: ["WiFi", "Kitchen", "High Ceilings", "AC"]
      },
      {
        roomNumber: "802",
        title: "Waterfront View - Room 802",
        description: "Beautiful waterfront apartment with private terrace and stunning water views.",
        price: 280,
        bedrooms: 2,
        imageUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        amenities: ["WiFi", "Kitchen", "Water View", "Terrace", "AC"]
      }
    ];

    apartmentData.forEach(apt => this.createApartment(apt));

    // Seed reviews
    const reviewData: InsertReview[] = [
      {
        customerName: "Sarah Johnson",
        rating: 5,
        content: "Absolutely amazing experience! The apartment was exactly as described and the location was perfect. Side Nest made our stay unforgettable.",
        imageUrl: "https://images.unsplash.com/photo-1494790108755-2616b612b5c5?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"
      },
      {
        customerName: "Mike Chen",
        rating: 5,
        content: "Professional service and beautiful apartments. The booking process was smooth and the staff was incredibly helpful throughout our stay.",
        imageUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"
      },
      {
        customerName: "Emily Rodriguez",
        rating: 5,
        content: "I've stayed with Side Nest multiple times and they never disappoint. Clean, comfortable, and always exceeding expectations!",
        imageUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&h=150"
      }
    ];

    reviewData.forEach(review => this.createReview(review));

    // Seed some sample bookings
    const customer1 = this.createCustomer({
      name: "John Smith",
      phone: "+1234567890",
      cnic: "12345-6789012-3"
    });

    const customer2 = this.createCustomer({
      name: "Lisa Wang", 
      phone: "+1987654321",
      cnic: "98765-4321098-7"
    });

    this.createBooking({
      apartmentId: 1,
      customerId: 1,
      checkIn: "2024-12-10",
      checkOut: "2024-12-12",
      status: "booked",
      paymentStatus: "paid",
      hostName: "Maria Garcia",
      totalAmount: 240
    });

    this.createBooking({
      apartmentId: 1,
      customerId: 2,
      checkIn: "2024-12-18",
      checkOut: "2024-12-21", 
      status: "booked",
      paymentStatus: "pending",
      hostName: "David Johnson",
      totalAmount: 360
    });
  }

  // Apartment methods
  async getApartments(): Promise<Apartment[]> {
    return Array.from(this.apartments.values());
  }

  async getApartment(id: number): Promise<Apartment | undefined> {
    return this.apartments.get(id);
  }

  async getApartmentByRoomNumber(roomNumber: string): Promise<Apartment | undefined> {
    return Array.from(this.apartments.values()).find(apt => apt.roomNumber === roomNumber);
  }

  async createApartment(insertApartment: InsertApartment): Promise<Apartment> {
    const id = this.currentId.apartments++;
    const apartment: Apartment = { ...insertApartment, id };
    this.apartments.set(id, apartment);
    return apartment;
  }

  // Customer methods
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByPhone(phone: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(customer => customer.phone === phone);
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = this.currentId.customers++;
    const customer: Customer = { 
      ...insertCustomer, 
      id, 
      isVerified: false, 
      verificationPin: null 
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: number, updates: Partial<Customer>): Promise<Customer | undefined> {
    const customer = this.customers.get(id);
    if (!customer) return undefined;
    
    const updatedCustomer = { ...customer, ...updates };
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  // Booking methods
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async getBookingsByApartment(apartmentId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.apartmentId === apartmentId);
  }

  async getBookingsByCustomer(customerId: number): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(booking => booking.customerId === customerId);
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentId.bookings++;
    const booking: Booking = { 
      ...insertBooking, 
      id, 
      createdAt: new Date() 
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async checkAvailability(apartmentId: number, checkIn: string, checkOut: string): Promise<boolean> {
    const existingBookings = await this.getBookingsByApartment(apartmentId);
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    return !existingBookings.some(booking => {
      if (booking.status === "cancelled") return false;
      
      const bookingCheckIn = new Date(booking.checkIn);
      const bookingCheckOut = new Date(booking.checkOut);
      
      return (checkInDate < bookingCheckOut && checkOutDate > bookingCheckIn);
    });
  }

  // Review methods
  async getReviews(): Promise<Review[]> {
    return Array.from(this.reviews.values());
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.currentId.reviews++;
    const review: Review = { ...insertReview, id };
    this.reviews.set(id, review);
    return review;
  }

  // Chat session methods
  async getChatSession(sessionId: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(sessionId);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = this.currentId.chatSessions++;
    const session: ChatSession = { 
      ...insertSession, 
      id, 
      createdAt: new Date() 
    };
    this.chatSessions.set(insertSession.sessionId, session);
    return session;
  }

  async updateChatSession(sessionId: string, updates: Partial<ChatSession>): Promise<ChatSession | undefined> {
    const session = this.chatSessions.get(sessionId);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates };
    this.chatSessions.set(sessionId, updatedSession);
    return updatedSession;
  }
}

export const storage = new MemStorage();
