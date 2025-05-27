import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCustomerSchema, insertBookingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apartments endpoints
  app.get("/api/apartments", async (req, res) => {
    try {
      const apartments = await storage.getApartments();
      res.json(apartments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch apartments" });
    }
  });

  app.get("/api/apartments/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const apartment = await storage.getApartment(id);
      
      if (!apartment) {
        return res.status(404).json({ message: "Apartment not found" });
      }
      
      res.json(apartment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch apartment" });
    }
  });

  // Bookings endpoints
  app.get("/api/bookings", async (req, res) => {
    try {
      const apartmentId = req.query.apartmentId ? parseInt(req.query.apartmentId as string) : undefined;
      
      if (apartmentId) {
        const bookings = await storage.getBookingsByApartment(apartmentId);
        res.json(bookings);
      } else {
        const bookings = await storage.getBookings();
        res.json(bookings);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      
      // Check availability
      const isAvailable = await storage.checkAvailability(
        bookingData.apartmentId,
        bookingData.checkIn,
        bookingData.checkOut
      );

      if (!isAvailable) {
        return res.status(400).json({ message: "Room is not available for the selected dates" });
      }

      const booking = await storage.createBooking(bookingData);
      res.json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid booking data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.get("/api/availability/:apartmentId", async (req, res) => {
    try {
      const apartmentId = parseInt(req.params.apartmentId);
      const { checkIn, checkOut } = req.query;

      if (!checkIn || !checkOut) {
        return res.status(400).json({ message: "Check-in and check-out dates are required" });
      }

      const isAvailable = await storage.checkAvailability(
        apartmentId,
        checkIn as string,
        checkOut as string
      );

      res.json({ available: isAvailable });
    } catch (error) {
      res.status(500).json({ message: "Failed to check availability" });
    }
  });

  // Reviews endpoint
  app.get("/api/reviews", async (req, res) => {
    try {
      const reviews = await storage.getReviews();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Customer endpoints
  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid customer data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  app.post("/api/customers/:id/verify", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { pin } = req.body;

      const customer = await storage.getCustomer(id);
      if (!customer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      if (customer.verificationPin === pin) {
        const updatedCustomer = await storage.updateCustomer(id, { isVerified: true });
        res.json({ verified: true, customer: updatedCustomer });
      } else {
        res.json({ verified: false, message: "Invalid PIN" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to verify customer" });
    }
  });

  app.post("/api/customers/:id/send-pin", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const pin = Math.floor(100000 + Math.random() * 900000).toString();

      const updatedCustomer = await storage.updateCustomer(id, { verificationPin: pin });
      
      if (!updatedCustomer) {
        return res.status(404).json({ message: "Customer not found" });
      }

      // In a real app, you would send the PIN via SMS
      console.log(`Sending PIN ${pin} to customer ${id}`);
      
      res.json({ message: "PIN sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send PIN" });
    }
  });

  // Chat session endpoints
  app.post("/api/chat/session", async (req, res) => {
    try {
      const sessionId = Math.random().toString(36).substring(7);
      const session = await storage.createChatSession({
        sessionId,
        currentStep: 0,
        data: JSON.stringify({}),
        customerId: null
      });
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to create chat session" });
    }
  });

  app.get("/api/chat/session/:sessionId", async (req, res) => {
    try {
      const session = await storage.getChatSession(req.params.sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch chat session" });
    }
  });

  app.put("/api/chat/session/:sessionId", async (req, res) => {
    try {
      const { currentStep, data, customerId } = req.body;
      const session = await storage.updateChatSession(req.params.sessionId, {
        currentStep,
        data: typeof data === 'string' ? data : JSON.stringify(data),
        customerId
      });
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chat session" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
