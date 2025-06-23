/**
 * Enhanced AI Service for SiteNest VA Chatbot
 * Advanced conversation management with intent recognition and entity extraction
 */

import OpenAI from 'openai';
import { db } from '../db';
import { chatConversations, chatIntents, chatAnalytics, apartments, bookings, bookingRequests, affiliateLinks } from '@shared/schema';
import { eq, desc, and, gte, lte, or } from 'drizzle-orm';
import { storage } from '../storage';
import { log } from '../utils/logger';
import { ChatbotDataSyncService } from './chatbot-data-sync.service';

interface ConversationContext {
  sessionId: string;
  userId?: string;
  currentIntent?: string;
  entities: Record<string, any>;
  conversationHistory: Message[];
  bookingContext?: BookingContext;
  userPreferences?: {
    preferredRoomType?: string;
    budgetRange?: { min: number; max: number };
    guestCount?: number;
    specialRequests?: string[];
  };
  affiliateCode?: string;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  intent?: string;
  entities?: Record<string, any>;
  confidence?: number;
}

interface BookingContext {
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  guestCount?: number;
  specialRequests?: string;
  needsParking?: boolean;
  needsRefreshments?: boolean;
  additionalRequests?: string;
  qualificationScore?: number;
  currentStep: 'room_selection' | 'dates' | 'guests' | 'parking' | 'refreshments' | 'additional_requests' | 'qualification_check' | 'payment_details' | 'whatsapp_contact';
}

interface IntentClassification {
  intent: string;
  confidence: number;
  entities: Record<string, any>;
}

export class EnhancedAIService {
  private static openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '',
  });

  private static conversationContexts = new Map<string, ConversationContext>();

  /**
   * Check if the service is properly configured
   */
  private static isConfigured(): boolean {
    return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-'));
  }

  // (Removed duplicate implementation of storeConversationMessage)

  /**
   * Get real apartment data from cache (fast and up-to-date)
   */
  private static async getRealApartmentData(): Promise<any[]> {
    try {
      const apartmentData = ChatbotDataSyncService.getCachedApartments();
      return apartmentData.map(apt => ({
        id: apt.id,
        roomNumber: apt.roomNumber,
        title: apt.title,
        description: apt.description,
        price: apt.price,
        discountPercentage: apt.discountPercentage || 0,
        bedrooms: apt.bedrooms,
        bathrooms: apt.bathrooms,
        squareFeet: apt.squareFeet,
        imageUrl: apt.imageUrl,
        images: apt.images || [],
        amenities: apt.amenities || [],
        // Calculate final price with discount
        finalPrice: apt.discountPercentage
          ? Math.round(apt.price * (1 - apt.discountPercentage / 100))
          : apt.price
      }));
    } catch (error) {
      log.error('Failed to fetch apartment data:', error);
      return [];
    }
  }

  /**
   * Check real-time availability for specific dates (with caching)
   */
  private static async checkRealAvailability(
    apartmentId: number,
    checkIn: string,
    checkOut: string
  ): Promise<boolean> {
    try {
      return await ChatbotDataSyncService.checkAvailabilityWithCache(apartmentId, checkIn, checkOut);
    } catch (error) {
      log.error('Failed to check availability:', error);
      return false;
    }
  }

  /**
   * Get available apartments for specific date range (optimized with caching)
   */
  private static async getAvailableApartments(
    checkIn?: string,
    checkOut?: string,
    guestCount?: number,
    budgetRange?: { min: number; max: number }
  ): Promise<any[]> {
    try {
      // Use the optimized data sync service
      const availableApartments = await ChatbotDataSyncService.getAvailableApartmentsWithFilters(
        checkIn,
        checkOut,
        guestCount,
        budgetRange
      );

      return availableApartments.map(apt => ({
        id: apt.id,
        roomNumber: apt.roomNumber,
        title: apt.title,
        description: apt.description,
        price: apt.price,
        discountPercentage: apt.discountPercentage || 0,
        bedrooms: apt.bedrooms,
        bathrooms: apt.bathrooms,
        squareFeet: apt.squareFeet,
        imageUrl: apt.imageUrl,
        images: apt.images || [],
        amenities: apt.amenities || [],
        finalPrice: apt.discountPercentage
          ? Math.round(apt.price * (1 - apt.discountPercentage / 100))
          : apt.price
      }));
    } catch (error) {
      log.error('Failed to get available apartments:', error);
      return [];
    }
  }

  /**
   * Get apartment by room number (from cache for speed)
   */
  private static async getApartmentByRoomNumber(roomNumber: string): Promise<any | null> {
    try {
      const apartment = ChatbotDataSyncService.getCachedApartmentByRoomNumber(roomNumber);
      if (!apartment) return null;

      return {
        id: apartment.id,
        roomNumber: apartment.roomNumber,
        title: apartment.title,
        description: apartment.description,
        price: apartment.price,
        discountPercentage: apartment.discountPercentage || 0,
        bedrooms: apartment.bedrooms,
        bathrooms: apartment.bathrooms,
        squareFeet: apartment.squareFeet,
        imageUrl: apartment.imageUrl,
        images: apartment.images || [],
        amenities: apartment.amenities || [],
        finalPrice: apartment.discountPercentage
          ? Math.round(apartment.price * (1 - apartment.discountPercentage / 100))
          : apartment.price
      };
    } catch (error) {
      log.error('Failed to get apartment by room number:', error);
      return null;
    }
  }

  /**
   * Apply affiliate discounts if applicable
   */
  private static async applyAffiliateDiscounts(
    basePrice: number,
    affiliateCode?: string,
    stayDuration?: number
  ): Promise<{ finalPrice: number; discount: number; affiliateDiscount: number }> {
    let finalPrice = basePrice;
    let discount = 0;
    let affiliateDiscount = 0;

    try {
      if (affiliateCode) {
        // Get affiliate link details
        const affiliateLink = await db
          .select()
          .from(affiliateLinks)
          .where(and(
            eq(affiliateLinks.linkCode, affiliateCode),
            eq(affiliateLinks.isActive, true)
          ))
          .limit(1);

        if (affiliateLink.length > 0) {
          const link = affiliateLink[0];

          // Apply long-stay discount if enabled and eligible
          if (link.longStayDiscountEnabled && stayDuration && link.longStayMinDays != null && stayDuration >= link.longStayMinDays) {
            if (link.longStayDiscountType === 'percentage') {
              affiliateDiscount = Math.round(basePrice * ((link.longStayDiscountValue || 0) / 100));
            } else {
              affiliateDiscount = link.longStayDiscountValue || 0;
            }
          }

          // Apply legacy price adjustments if no long-stay discount
          if (affiliateDiscount === 0) {
            if (link.adjustmentType === 'subtract') {
              affiliateDiscount = link.priceAdjustment || 0;
            } else if (link.adjustmentType === 'percentage' && link.discountPercentage) {
              affiliateDiscount = Math.round(basePrice * (link.discountPercentage / 100));
            }
          }
        }
      }

      finalPrice = Math.max(basePrice - affiliateDiscount, 0);
      discount = affiliateDiscount;

      return { finalPrice, discount, affiliateDiscount };
    } catch (error) {
      log.error('Failed to apply affiliate discounts:', error);
      return { finalPrice: basePrice, discount: 0, affiliateDiscount: 0 };
    }
  }
  /**
   * Main entry point for processing user messages
   */
  static async processMessage(
    sessionId: string,
    userMessage: string,
    userId?: string,
    additionalContext?: any
  ): Promise<{
    response: string;
    quickActions?: string[];
    bookingData?: any;
    requiresAction?: string;
  }> {
    try {
      // Check if service is properly configured
      if (!this.isConfigured()) {
        log.warn('Enhanced AI Service not properly configured, falling back to basic responses');
        throw new Error('Enhanced AI Service not configured');
      }

      // Get or create conversation context
      let context = this.conversationContexts.get(sessionId);
      if (!context) {
        context = await this.initializeContext(sessionId, userId);
      }

      // Handle booking data if provided in additionalContext
      if (additionalContext?.bookingData) {
        const bookingData = additionalContext.bookingData;
        context.bookingContext = {
          roomId: bookingData.roomId,
          checkIn: bookingData.checkIn,
          checkOut: bookingData.checkOut,
          currentStep: 'guests',
          qualificationScore: 30 // Start with some points for form submission
        };

        // If this is a booking request message, return the guest count question immediately
        if (userMessage.toLowerCase().includes('book') && bookingData.roomId) {
          return {
            response: `Hello ${bookingData.user?.firstName || 'there'}! I see you want to book Room ${bookingData.roomId} from ${bookingData.checkIn} to ${bookingData.checkOut}. How many guests will be staying?`,
            quickActions: ['1_person', '2_people', '3_people', '4_people']
          };
        }
      }

      // Classify intent and extract entities
      const classification = await this.classifyIntent(userMessage, context);
      
      // Add user message to conversation
      const userMsg: Message = {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
        intent: classification.intent,
        entities: classification.entities,
        confidence: classification.confidence
      };
      
      context.conversationHistory.push(userMsg);
      context.entities = { ...context.entities, ...classification.entities };
      context.currentIntent = classification.intent;

      // Store conversation in database (with error handling)
      try {
        await this.storeConversationMessage(sessionId, userMsg);
      } catch (error) {
        log.warn('Failed to store user message:', { error });
      }

      // Generate response based on intent
      const response = await this.generateIntentBasedResponse(context, classification, userMessage);

      // Add assistant response to conversation
      const assistantMsg: Message = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date()
      };

      context.conversationHistory.push(assistantMsg);

      // Store assistant response (with error handling)
      try {
        await this.storeConversationMessage(sessionId, assistantMsg);
      } catch (error) {
        log.warn('Failed to store assistant message:', { error });
      }

      // Update context
      this.conversationContexts.set(sessionId, context);

      return response;

    } catch (error) {
      console.error('Enhanced AI Service Error:', error);
      return {
        response: "I apologize for the technical difficulty. Please contact us directly at 0311-5197087 for immediate assistance.",
        quickActions: ['open_whatsapp', 'contact_info']
      };
    }
  }

  /**
   * Initialize conversation context
   */
  private static async initializeContext(sessionId: string, userId?: string): Promise<ConversationContext> {
    try {
      // Load previous conversation if exists
      const previousMessages = await db
        .select()
        .from(chatConversations)
        .where(eq(chatConversations.sessionId, sessionId))
        .orderBy(desc(chatConversations.timestamp))
        .limit(20);

      const conversationHistory: Message[] = previousMessages.reverse().map(msg => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: new Date(msg.timestamp),
        intent: msg.intent || undefined,
        entities: msg.entities as Record<string, any> || {},
        confidence: msg.confidence || undefined
      }));

      const context: ConversationContext = {
        sessionId,
        userId,
        entities: {},
        conversationHistory,
        bookingContext: {
          currentStep: 'room_selection'
        }
      };

      this.conversationContexts.set(sessionId, context);
      return context;
    } catch (error) {
      log.warn('Failed to load conversation history, creating new context:', { error });

      // Create minimal context if database fails
      const context: ConversationContext = {
        sessionId,
        userId,
        entities: {},
        conversationHistory: [],
        bookingContext: {
          currentStep: 'room_selection'
        }
      };

      this.conversationContexts.set(sessionId, context);
      return context;
    }
  }

  /**
   * Classify user intent using AI and pattern matching
   */
  private static async classifyIntent(
    message: string,
    context: ConversationContext
  ): Promise<IntentClassification> {
    const lowerMessage = message.toLowerCase();

    // Load predefined intents from database
    const intents = await db.select().from(chatIntents).where(eq(chatIntents.isActive, true));

    // Pattern-based classification for common intents
    const patterns = {
      'greeting': /^(hi|hello|hey|good morning|good evening|assalam|salam)/i,
      'availability_check': /(availability|available|room.*available|any.*room|check.*availability|want.*check.*room|check.*room.*availability|\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)|june|july|august|september|october|november|december|tomorrow|next week|this weekend)/i,
      'booking_inquiry': /(book|reserve|room|stay)/i,
      'pricing_inquiry': /(price|pricing|cost|rate|how much|charges|fee|pricing options)/i,
      'contact_inquiry': /(contact|phone|whatsapp|call|reach)/i,
      'location_inquiry': /(location|address|where.*located|where.*you|directions)/i,
      'payment_inquiry': /(payment|pay|easypaisa|advance|deposit)/i,
      'room_selection': /(room \d+|714|715|716|717|718|719)/i,
      'date_selection': /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)|tomorrow|next week|this weekend)/i,
      'guest_count': /(\d+\s*(person|people|guest|adult|child))/i,
      'parking_inquiry': /(parking|car|vehicle|park)/i,
      'refreshments_inquiry': /(refreshment|food|meal|breakfast|snack|drink)/i,
      'additional_requests': /(request|need|require|special|extra)/i,
      'booking_procedure': /(procedure|process|steps|how.*book|booking.*process|what.*steps)/i,
      'confirmation': /(yes|confirm|proceed|book it|go ahead)/i,
      'cancellation': /(no|cancel|not interested|maybe later)/i,
      'help': /(help|assist|support|confused|don't understand)/i
    };

    // Find matching pattern
    for (const [intent, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerMessage)) {
        const entities = this.extractEntities(message, intent);
        return {
          intent,
          confidence: 0.9,
          entities
        };
      }
    }

    // Use AI for complex intent classification
    try {
      const aiClassification = await this.classifyWithAI(message, context);
      return aiClassification;
    } catch (error) {
      // Fallback to general inquiry
      return {
        intent: 'general_inquiry',
        confidence: 0.5,
        entities: {}
      };
    }
  }

  /**
   * Extract entities from user message
   */
  private static extractEntities(message: string, intent: string): Record<string, any> {
    const entities: Record<string, any> = {};

    // Room number extraction
    const roomMatch = message.match(/room\s*(\d+)/i);
    if (roomMatch) {
      entities.roomNumber = roomMatch[1];
    }

    // Enhanced date extraction
    const extractedDates = this.extractDatesFromMessage(message);
    if (extractedDates.checkIn) {
      entities.checkIn = extractedDates.checkIn;
    }
    if (extractedDates.checkOut) {
      entities.checkOut = extractedDates.checkOut;
    }
    if (extractedDates.date) {
      entities.date = extractedDates.date;
    }

    // Guest count extraction
    const guestMatch = message.match(/(\d+)\s*(person|people|guest)/i);
    if (guestMatch) {
      entities.guestCount = parseInt(guestMatch[1]);
    }

    // Phone number extraction
    const phoneMatch = message.match(/(\+92|0)?\d{3}[-\s]?\d{7}/);
    if (phoneMatch) {
      entities.phoneNumber = phoneMatch[0];
    }

    return entities;
  }

  /**
   * Extract guest count from message
   */
  private static extractGuestCountFromMessage(message: string): number | null {
    const lowerMessage = message.toLowerCase();

    // Handle quick action responses
    if (lowerMessage.includes('1_guest') || lowerMessage.includes('1 guest')) return 1;
    if (lowerMessage.includes('2_guests') || lowerMessage.includes('2 guests')) return 2;
    if (lowerMessage.includes('3_guests') || lowerMessage.includes('3 guests')) return 3;
    if (lowerMessage.includes('4_guests') || lowerMessage.includes('4 guests')) return 4;

    // Handle natural language
    const patterns = [
      /(\d+)\s*guest/i,
      /(\d+)\s*person/i,
      /(\d+)\s*people/i,
      /for\s*(\d+)/i,
      /^(\d+)$/
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const count = parseInt(match[1]);
        if (count > 0 && count <= 10) {
          return count;
        }
      }
    }

    return null;
  }

  /**
   * Extract parking response from message
   */
  private static extractParkingResponseFromMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Handle quick action responses
    if (lowerMessage.includes('yes_parking') || lowerMessage.includes('yes parking')) return true;
    if (lowerMessage.includes('no_parking') || lowerMessage.includes('no parking')) return false;

    // Handle natural language
    if (lowerMessage.includes('yes') || lowerMessage.includes('need') || lowerMessage.includes('want')) return true;
    if (lowerMessage.includes('no') || lowerMessage.includes('don\'t') || lowerMessage.includes('not')) return false;

    return false; // Default to no parking
  }

  /**
   * Extract refreshments response from message
   */
  private static extractRefreshmentsResponseFromMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Handle quick action responses
    if (lowerMessage.includes('yes_refreshments') || lowerMessage.includes('yes refreshments')) return true;
    if (lowerMessage.includes('no_refreshments') || lowerMessage.includes('no refreshments')) return false;

    // Handle natural language
    if (lowerMessage.includes('yes') || lowerMessage.includes('arrange') || lowerMessage.includes('want')) return true;
    if (lowerMessage.includes('no') || lowerMessage.includes('don\'t') || lowerMessage.includes('not')) return false;

    return false; // Default to no refreshments
  }

  /**
   * Extract dates from message using natural language processing
   */
  private static extractDatesFromMessage(message: string): {
    checkIn?: string;
    checkOut?: string;
    date?: string;
  } {
    const result: { checkIn?: string; checkOut?: string; date?: string } = {};
    const lowerMessage = message.toLowerCase();
    const currentYear = new Date().getFullYear();

    // Month names mapping
    const months: { [key: string]: number } = {
      'january': 0, 'jan': 0,
      'february': 1, 'feb': 1,
      'march': 2, 'mar': 2,
      'april': 3, 'apr': 3,
      'may': 4,
      'june': 5, 'jun': 5,
      'july': 6, 'jul': 6,
      'august': 7, 'aug': 7,
      'september': 8, 'sep': 8, 'sept': 8,
      'october': 9, 'oct': 9,
      'november': 10, 'nov': 10,
      'december': 11, 'dec': 11
    };

    // Pattern 1: "June 12", "12th June", "June 12th"
    const monthDayPattern = /(?:(\d{1,2})(?:st|nd|rd|th)?\s+(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)|(?:january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?)/gi;

    const monthDayMatches = Array.from(lowerMessage.matchAll(monthDayPattern));
    if (monthDayMatches.length > 0) {
      const match = monthDayMatches[0];
      const day = match[1] || match[3];
      const monthName = match[2] || match[0].split(/\s+/).find(word => (months as Record<string, number>)[word]);

      if (day && monthName && months[monthName] !== undefined) {
        const month = months[monthName];
        const date = new Date(currentYear, month, parseInt(day));

        // If the date is in the past, assume next year
        if (date < new Date()) {
          date.setFullYear(currentYear + 1);
        }

        result.date = date.toISOString().split('T')[0];
        result.checkIn = result.date;
      }
    }

    // Pattern 2: Standard date formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
    const standardDatePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})/g;
    const standardMatches = Array.from(lowerMessage.matchAll(standardDatePattern));

    if (standardMatches.length > 0 && !result.date) {
      result.date = standardMatches[0][1];
      result.checkIn = result.date;
    }

    // Pattern 3: Relative dates
    const today = new Date();
    if (lowerMessage.includes('today')) {
      result.date = today.toISOString().split('T')[0];
      result.checkIn = result.date;
    } else if (lowerMessage.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      result.date = tomorrow.toISOString().split('T')[0];
      result.checkIn = result.date;
    } else if (lowerMessage.includes('this weekend')) {
      const daysUntilSaturday = (6 - today.getDay()) % 7;
      const saturday = new Date(today);
      saturday.setDate(today.getDate() + daysUntilSaturday);
      result.checkIn = saturday.toISOString().split('T')[0];

      const sunday = new Date(saturday);
      sunday.setDate(saturday.getDate() + 1);
      result.checkOut = sunday.toISOString().split('T')[0];
    } else if (lowerMessage.includes('next week')) {
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      result.date = nextWeek.toISOString().split('T')[0];
      result.checkIn = result.date;
    }

    return result;
  }

  /**
   * Use AI for complex intent classification
   */
  private static async classifyWithAI(
    message: string,
    context: ConversationContext
  ): Promise<IntentClassification> {
    try {
      if (!this.isConfigured()) {
        throw new Error('OpenAI not configured');
      }

      const prompt = `
      Classify the following message intent for a hotel booking chatbot:

      Message: "${message}"
      Context: Previous intent was "${context.currentIntent || 'none'}"

      Available intents:
      - greeting
      - booking_inquiry
      - pricing_inquiry
      - contact_inquiry
      - location_inquiry
      - payment_inquiry
      - room_selection
      - date_selection
      - guest_count
      - parking_inquiry
      - refreshments_inquiry
      - additional_requests
      - booking_procedure
      - confirmation
      - cancellation
      - help
      - general_inquiry

      Respond with JSON: {"intent": "intent_name", "confidence": 0.0-1.0, "entities": {}}
      `;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.1,
      });

      try {
        const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
        return {
          intent: result.intent || 'general_inquiry',
          confidence: result.confidence || 0.5,
          entities: result.entities || {}
        };
      } catch (parseError) {
        log.warn('Failed to parse OpenAI response:', { error: parseError });
        return {
          intent: 'general_inquiry',
          confidence: 0.5,
          entities: {}
        };
      }
    } catch (error) {
      log.warn('OpenAI classification failed, using fallback:', { error });
      return {
        intent: 'general_inquiry',
        confidence: 0.5,
        entities: {}
      };
    }
  }

  /**
   * Generate response based on classified intent
   */
  private static async generateIntentBasedResponse(
    context: ConversationContext,
    classification: IntentClassification,
    message: string
  ): Promise<{
    response: string;
    quickActions?: string[];
    bookingData?: any;
    requiresAction?: string;
  }> {
    const { intent, entities } = classification;

    // Handle conversation flow based on current step
    if (context.bookingContext && context.bookingContext.currentStep) {
      const currentStep = context.bookingContext.currentStep;

      // Handle guest count step
      if (currentStep === 'guests') {
        const guestCount = entities.guestCount || this.extractGuestCountFromMessage(message);
        if (guestCount) {
          context.bookingContext.guestCount = guestCount;
          context.bookingContext.qualificationScore = (context.bookingContext.qualificationScore || 0) + 20;
          context.bookingContext.currentStep = 'parking';
          return {
            response: `Perfect! ${guestCount} guest${guestCount > 1 ? 's' : ''} noted. Do you need parking space for your vehicle during your stay?`,
            quickActions: ['yes_parking', 'no_parking', 'not_sure']
          };
        } else {
          return {
            response: `How many guests will be staying? Please let me know the number of people.`,
            quickActions: ['1_person', '2_people', '3_people', '4_people']
          };
        }
      }

      // Handle parking step
      if (currentStep === 'parking') {
        const needsParking = this.extractParkingResponseFromMessage(message);
        context.bookingContext.needsParking = needsParking;
        context.bookingContext.qualificationScore = (context.bookingContext.qualificationScore || 0) + 15;
        context.bookingContext.currentStep = 'refreshments';

        const parkingText = needsParking ? "Great! Parking space noted." : "No parking needed, understood.";
        return {
          response: `${parkingText} Would you like us to arrange any refreshments or welcome amenities for your arrival? This service comes with an additional cost.`,
          quickActions: ['yes_refreshments', 'no_refreshments', 'tell_me_more']
        };
      }

      // Handle refreshments step
      if (currentStep === 'refreshments') {
        const needsRefreshments = this.extractRefreshmentsResponseFromMessage(message);
        context.bookingContext.needsRefreshments = needsRefreshments;
        context.bookingContext.qualificationScore = (context.bookingContext.qualificationScore || 0) + 15;
        context.bookingContext.currentStep = 'additional_requests';

        if (needsRefreshments) {
          return {
            response: `Excellent! Refreshments will be arranged for your arrival. The cost will be PKR 500-1000 depending on your preferences. Are you comfortable with this additional cost?`,
            quickActions: ['will_do_payment', 'no_refreshments', 'tell_me_more']
          };
        } else {
          return {
            response: `No refreshments needed, understood. Do you have any other special requests or requirements for your stay?`,
            quickActions: ['no_requests', 'early_checkin', 'late_checkout', 'extra_amenities']
          };
        }
      }

      // Handle additional requests step
      if (currentStep === 'additional_requests') {
        const hasRequests = !message.toLowerCase().includes('no') && !message.toLowerCase().includes('nothing');
        if (hasRequests && message.length > 10) {
          context.bookingContext.additionalRequests = message;
        }
        context.bookingContext.qualificationScore = (context.bookingContext.qualificationScore || 0) + 10;
        context.bookingContext.currentStep = 'payment_details';

        // Check if qualification score is high enough
        if ((context.bookingContext.qualificationScore || 0) >= 50) {
          return {
            response: `Perfect! I have all your requirements noted. To secure your booking, please send an advance payment:\n\n💳 **Payment Details:**\n• Account Title: Abdullah Sultan\n• Bank: EasyPaisa\n• Account Number: 0311-5197087\n• Amount: PKR 500-2000\n\nOnce you've made the payment, please take a screenshot and we'll provide you with our WhatsApp contact for confirmation.`,
            quickActions: ['payment_done', 'payment_questions', 'need_help']
          };
        } else {
          return {
            response: `Thank you for the information. For immediate booking assistance and to check real-time availability, please contact us directly on WhatsApp at 0311-5197087.`,
            quickActions: ['open_whatsapp', 'more_questions', 'check_availability']
          };
        }
      }

      // Handle payment confirmation step
      if (currentStep === 'payment_details') {
        if (message.toLowerCase().includes('done') || message.toLowerCase().includes('paid') || message.toLowerCase().includes('sent')) {
          context.bookingContext.currentStep = 'whatsapp_contact';
          context.bookingContext.qualificationScore = (context.bookingContext.qualificationScore || 0) + 25;

          return {
            response: `Excellent! Thank you for the payment. Please share your payment screenshot on WhatsApp for verification:\n\n📱 **WhatsApp: 0311-5197087**\n\nOur team will verify your payment and confirm your booking within a few hours. You'll receive check-in details and any additional instructions via WhatsApp.`,
            quickActions: ['open_whatsapp', 'more_questions', 'booking_confirmed']
          };
        } else {
          return {
            response: `Please complete the payment and let me know once it's done. If you have any questions about the payment process, I'm here to help!`,
            quickActions: ['payment_done', 'payment_questions', 'need_help']
          };
        }
      }


    }

    switch (intent) {
      case 'greeting':
        return {
          response: "Hello! Welcome to SiteNest. I'm your intelligent booking assistant. I can help you find and book the perfect luxury apartment in Islamabad. How can I assist you today?",
          quickActions: ['check_availability', 'view_rooms', 'pricing', 'contact_whatsapp']
        };

      case 'booking_inquiry':
        if (entities.roomNumber) {
          const apartment = await this.getApartmentByRoomNumber(entities.roomNumber);
          if (apartment) {
            context.bookingContext!.roomId = entities.roomNumber;
            return {
              response: `Excellent choice! Room ${entities.roomNumber} - ${apartment.title} is available. This ${apartment.bedrooms}-bedroom apartment features ${apartment.amenities.slice(0, 3).join(', ')} and costs PKR ${apartment.finalPrice}/night. When would you like to stay with us?`,
              quickActions: ['check_availability', 'pricing', 'book_now']
            };
          } else {
            return {
              response: `I couldn't find Room ${entities.roomNumber}. Let me show you our available apartments instead!`,
              quickActions: ['check_availability', 'pricing']
            };
          }
        }

        // Show real available apartments
        const availableApartments = await this.getAvailableApartments();
        const apartmentButtons = availableApartments.slice(0, 4).map(apt =>
          `room_${apt.roomNumber}`
        );

        return {
          response: `I'd be happy to help you with booking! We have ${availableApartments.length} beautiful apartments available. Here are some of our popular options:`,
          quickActions: ['check_availability', 'pricing', 'open_whatsapp']
        };

      case 'pricing_inquiry':
        const allApartments = await this.getRealApartmentData();
        if (allApartments.length > 0) {
          const prices = allApartments.map(apt => apt.finalPrice);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);

          return {
            response: `Our apartments range from PKR ${minPrice.toLocaleString()} to PKR ${maxPrice.toLocaleString()} per night. Here's our current pricing:`,
            quickActions: ['check_availability', 'book_now', 'open_whatsapp'],
            bookingData: {
              type: 'pricing_carousel',
              apartments: allApartments.map(apt => ({
                roomNumber: apt.roomNumber,
                title: apt.title,
                price: apt.finalPrice,
                originalPrice: apt.price,
                discount: apt.discountPercentage,
                bedrooms: apt.bedrooms,
                amenities: apt.amenities.slice(0, 3)
              }))
            }
          };
        }
        return {
          response: "Let me get you the latest pricing information. Please contact us on WhatsApp at 0311-5197087 for current rates and special offers.",
          quickActions: ['open_whatsapp', 'check_availability']
        };

      case 'room_selection':
        if (entities.roomNumber) {
          const apartment = await this.getApartmentByRoomNumber(entities.roomNumber);
          if (apartment) {
            context.bookingContext!.roomId = entities.roomNumber;
            context.bookingContext!.currentStep = 'dates';
            return {
              response: `Excellent choice! Room ${entities.roomNumber} - ${apartment.title} is a ${apartment.bedrooms}-bedroom apartment with ${apartment.amenities.slice(0, 3).join(', ')}. The rate is PKR ${apartment.finalPrice}/night. When would you like to stay with us?`,
              quickActions: ['check_availability', 'pricing', 'book_now']
            };
          } else {
            return {
              response: `I couldn't find Room ${entities.roomNumber}. Let me show you our available apartments instead!`,
              quickActions: ['check_availability', 'pricing']
            };
          }
        }
        break;

      case 'availability_check':
        // Extract dates from the message if not in entities
        if (!entities.checkIn && !entities.checkOut) {
          const extractedDates = this.extractDatesFromMessage(message);
          if (extractedDates.checkIn) {
            entities.checkIn = extractedDates.checkIn;
          }
          if (extractedDates.checkOut) {
            entities.checkOut = extractedDates.checkOut;
          }
          if (extractedDates.date && !entities.checkIn) {
            entities.checkIn = extractedDates.date;
          }
        }

        if (entities.checkIn) {
          // If only check-in date provided, assume 1 night stay
          if (!entities.checkOut) {
            const checkInDate = new Date(entities.checkIn);
            checkInDate.setDate(checkInDate.getDate() + 1);
            entities.checkOut = checkInDate.toISOString().split('T')[0];
          }

          const guestCount = entities.guestCount || context.userPreferences?.guestCount;
          const budgetRange = context.userPreferences?.budgetRange;

          const availableApartments = await this.getAvailableApartments(
            entities.checkIn,
            entities.checkOut,
            guestCount,
            budgetRange
          );

          if (availableApartments.length > 0) {
            // Store the dates in booking context
            context.bookingContext!.checkIn = entities.checkIn;
            context.bookingContext!.checkOut = entities.checkOut;
            context.bookingContext!.currentStep = 'guests';

            return {
              response: `Great news! I found ${availableApartments.length} available apartments for ${entities.checkIn} to ${entities.checkOut}. How many guests will be staying?`,
              quickActions: ['1_person', '2_people', '3_people', '4_people'],
              bookingData: {
                type: 'availability_carousel',
                checkIn: entities.checkIn,
                checkOut: entities.checkOut,
                apartments: availableApartments.map(apt => ({
                  id: apt.id,
                  roomNumber: apt.roomNumber,
                  title: apt.title,
                  price: apt.finalPrice,
                  bedrooms: apt.bedrooms,
                  amenities: apt.amenities.slice(0, 3),
                  imageUrl: apt.imageUrl
                }))
              }
            };
          } else {
            return {
              response: `I'm sorry, no apartments are available for ${entities.checkIn} to ${entities.checkOut}. Would you like to try different dates or get notified when something becomes available?`,
              quickActions: ['check_availability', 'open_whatsapp', 'pricing']
            };
          }
        }
        return {
          response: "I'd be happy to check real-time availability for you! Please let me know your preferred check-in and check-out dates.",
          quickActions: ['check_availability', 'pricing', 'open_whatsapp']
        };

      case 'date_selection':
        // Extract dates from message
        const dateMatch = message.match(/(\w+\s+\d{1,2}|\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/gi);
        if (dateMatch || entities.date || message.toLowerCase().includes('june') || message.toLowerCase().includes('july')) {
          context.bookingContext!.checkIn = dateMatch ? dateMatch[0] : entities.date;
          context.bookingContext!.checkOut = dateMatch && dateMatch[1] ? dateMatch[1] : entities.date;
          context.bookingContext!.currentStep = 'guests';
          return {
            response: "Perfect! I have your dates noted. How many guests will be staying?",
            quickActions: ['1_person', '2_people', '3_people', '4_people']
          };
        }
        break;

      case 'guest_count':
        if (entities.guestCount) {
          context.bookingContext!.guests = entities.guestCount;
          context.bookingContext!.currentStep = 'parking';
          context.bookingContext!.qualificationScore = (context.bookingContext!.qualificationScore || 0) + 20;
          return {
            response: `Perfect! ${entities.guestCount} guests noted. Do you need parking space for your vehicle during your stay?`,
            quickActions: ['yes_parking', 'no_parking', 'not_sure']
          };
        }
        break;



      case 'contact_inquiry':
        // Only share WhatsApp if customer seems serious (has booking context or high engagement)
        const hasBookingContext = context.bookingContext && (context.bookingContext.roomId || context.bookingContext.checkIn);
        const qualificationScore = context.bookingContext?.qualificationScore || 0;

        if (hasBookingContext || qualificationScore >= 30) {
          return {
            response: "You can reach us at:\n📞 WhatsApp: 0311-5197087\n📍 Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad\n💳 Payments: Easypaisa to 0311-5197087",
            quickActions: ['open_whatsapp', 'get_directions', 'payment_info']
          };
        } else {
          return {
            response: "I'd be happy to help you with your inquiry! Let me first understand what you're looking for. Are you interested in booking a room or checking availability?",
            quickActions: ['check_availability', 'pricing', 'location']
          };
        }

      case 'location_inquiry':
        return {
          response: "We are located at Cube Apartments Tower 2, Bahria Enclave Sector A, Islamabad. Our luxury apartments offer premium amenities in a prime location. Would you like to check availability or get directions?",
          quickActions: ['check_availability', 'open_whatsapp', 'pricing']
        };

      case 'booking_procedure':
        return {
          response: `📋 **SiteNest Booking Procedure:**

**Step 1:** Browse & Select Room
• View available apartments
• Choose your preferred room
• Check amenities and pricing

**Step 2:** Submit Booking Request
• Select check-in/check-out dates
• Fill booking form
• Submit request

**Step 3:** Qualification Questions
• Number of guests
• Parking requirements
• Refreshment preferences
• Special requests

**Step 4:** Advance Payment
• Send PKR 500-2000 via EasyPaisa
• Account: Abdullah Sultan (0311-5197087)
• Take payment screenshot

**Step 5:** WhatsApp Confirmation
• Share screenshot on WhatsApp: 0311-5197087
• Get booking confirmation
• Receive check-in details

Ready to start your booking?`,
          quickActions: ['check_availability', 'book_now', 'open_whatsapp', 'pricing']
        };

      default:
        // Check if user is providing guest count as a response without booking context
        const guestCount = this.extractGuestCountFromMessage(message);
        if (guestCount && !context.bookingContext) {
          // User provided guest count without context - start booking flow
          context.bookingContext = {
            currentStep: 'parking',
            guestCount: guestCount,
            qualificationScore: 20
          };
          return {
            response: `Perfect! ${guestCount} guest${guestCount > 1 ? 's' : ''} noted. Do you need parking space for your vehicle during your stay?`,
            quickActions: ['yes_parking', 'no_parking', 'not_sure']
          };
        }

        // Check if user is asking about guest count without context - START BOOKING FLOW
        if (/how many.*guest|guest.*count|number.*guest|people.*stay/i.test(message) ||
            message.toLowerCase().includes('guest')) {
          // Initialize booking context if not exists
          if (!context.bookingContext) {
            context.bookingContext = {
              currentStep: 'guests',
              qualificationScore: 10 // Start with some points for engagement
            };
          }
          return {
            response: "How many guests will be staying? Please let me know the number of people.",
            quickActions: ['1_person', '2_people', '3_people', '4_people']
          };
        }

        return {
          response: "I'm here to help you with room bookings at SiteNest. For detailed assistance with availability, pricing, or reservations, please contact us on WhatsApp at 0311-5197087.",
          quickActions: ['open_whatsapp', 'check_availability', 'pricing']
        };
    }

    return {
      response: "I understand. How else can I assist you with your booking?",
      quickActions: ['open_whatsapp', 'check_availability', 'pricing']
    };
  }

  /**
   * Store conversation message in database
   */
  private static async storeConversationMessage(sessionId: string, message: Message): Promise<void> {
    try {
      await db.insert(chatConversations).values({
        sessionId,
        messageId: `${sessionId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: message.role,
        content: message.content,
        intent: message.intent || null,
        entities: message.entities || null,
        confidence: message.confidence || null,
        timestamp: message.timestamp
      });
    } catch (error) {
      console.error('Failed to store conversation message:', error);
    }
  }

  /**
   * Get conversation analytics
   */
  static async getConversationAnalytics(sessionId: string): Promise<any> {
    const messages = await db
      .select()
      .from(chatConversations)
      .where(eq(chatConversations.sessionId, sessionId));

    const intents = messages
      .filter(m => m.intent)
      .map(m => m.intent);

    const uniqueIntents = Array.from(new Set(intents));
    
    return {
      messageCount: messages.length,
      intentsDetected: uniqueIntents,
      conversationLength: messages.length,
      lastActivity: messages[messages.length - 1]?.timestamp
    };
  }
}
