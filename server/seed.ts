// Load environment variables from .env file
import { config } from 'dotenv';
config();

import { db } from "./db";
import { apartments, customers, bookings, reviews } from "@shared/schema";
import type { InsertApartment, InsertCustomer, InsertBooking, InsertReview } from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Starting database seeding...");

  try {
    // Check if data already exists
    const existingApartments = await db.select().from(apartments);
    if (existingApartments.length > 0) {
      console.log("📊 Database already contains data, skipping seed...");
      return;
    }

    // Seed apartments
    console.log("🏠 Seeding apartments...");
    const apartmentData: InsertApartment[] = [
      {
        roomNumber: "714",
        title: "Luxury Studio - Room 714",
        description: "Modern studio with panoramic city views, fully furnished with premium amenities.",
        price: 120,
        bedrooms: 1,
        bathrooms: 1,
        squareFeet: 650,
        imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600",
        amenities: ["WiFi", "Kitchen", "City View", "AC"]
      }
    ];

    const createdApartments = await db.insert(apartments).values(apartmentData).returning();
    console.log(`✅ Created ${createdApartments.length} apartments`);

    // Seed customers
    console.log("👥 Seeding customers...");
    const customerData: InsertCustomer[] = [
      {
        name: "Josef",
        phone: "+923001234567",
        cnic: "42101-1234567-8"
      },
      {
        name: "Ahmed",
        phone: "+923009876543",
        cnic: "42201-9876543-2"
      }
    ];

    const createdCustomers = await db.insert(customers).values(customerData).returning();
    console.log(`✅ Created ${createdCustomers.length} customers`);

    // No dummy reviews - reviews will be added by users through the review system
    console.log("⭐ Skipping review seeding - reviews will be added by users");

    // Seed sample bookings
    console.log("📅 Seeding bookings...");
    const bookingData: InsertBooking[] = [
      {
        apartmentId: createdApartments[0].id, // Room 714
        customerId: createdCustomers[0].id, // Josef
        checkIn: "2025-06-03",
        checkOut: "2025-06-05",
        status: "booked",
        paymentStatus: "paid",
        hostName: "web",
        totalAmount: 240,
        affiliateId: null,
        affiliateName: null
      },
      {
        apartmentId: createdApartments[0].id, // Room 714
        customerId: createdCustomers[1].id, // Ahmed
        checkIn: "2025-06-06",
        checkOut: "2025-06-06",
        status: "booked",
        paymentStatus: "paid",
        hostName: "web",
        totalAmount: 120,
        affiliateId: null,
        affiliateName: null
      }
    ];

    const createdBookings = await db.insert(bookings).values(bookingData).returning();
    console.log(`✅ Created ${createdBookings.length} bookings`);

    console.log("🎉 Database seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run seeding - always execute when this file is run directly
seedDatabase()
  .then(() => {
    console.log("✅ Seeding completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  });

export { seedDatabase };
