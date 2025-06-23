import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import dotenv from 'dotenv';

// Configure Neon
neonConfig.webSocketConstructor = ws;

// Load environment variables
dotenv.config();

async function seedChatIntents() {
  console.log('🌱 Seeding chat intents...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Insert default intents
    const intents = [
      {
        name: 'greeting',
        description: 'User greets the chatbot',
        patterns: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
        responses: ['Hello! Welcome to SiteNest. How can I help you today?', 'Hi there! I\'m here to help you find the perfect apartment.'],
        actions: ['show_welcome_options']
      },
      {
        name: 'room_inquiry',
        description: 'User asks about available rooms',
        patterns: ['show rooms', 'available apartments', 'what rooms do you have', 'room options'],
        responses: ['I\'d be happy to show you our available rooms. Let me get the latest information for you.'],
        actions: ['fetch_available_rooms']
      },
      {
        name: 'booking_intent',
        description: 'User wants to make a booking',
        patterns: ['book room', 'make reservation', 'i want to book', 'reserve apartment'],
        responses: ['Great! I\'ll help you with your booking. Let me gather some details.'],
        actions: ['start_booking_flow']
      },
      {
        name: 'price_inquiry',
        description: 'User asks about pricing',
        patterns: ['how much', 'price', 'cost', 'rates', 'pricing'],
        responses: ['I\'ll show you the pricing for our available rooms.'],
        actions: ['show_pricing']
      },
      {
        name: 'availability_check',
        description: 'User checks availability for specific dates',
        patterns: ['available on', 'check availability', 'free on', 'dates available'],
        responses: ['Let me check availability for your preferred dates.'],
        actions: ['check_availability']
      },
      {
        name: 'help',
        description: 'User needs assistance',
        patterns: ['help', 'assist', 'support', 'confused', 'don\'t understand'],
        responses: ['I\'m here to help! You can ask me about room availability, pricing, bookings, or any other questions about SiteNest.'],
        actions: ['show_help_options']
      },
      {
        name: 'goodbye',
        description: 'User says goodbye',
        patterns: ['bye', 'goodbye', 'see you', 'thanks', 'thank you'],
        responses: ['Thank you for choosing SiteNest! Feel free to reach out anytime if you need assistance.'],
        actions: ['end_conversation']
      }
    ];
    
    for (const intent of intents) {
      try {
        await pool.query(`
          INSERT INTO chat_intents (name, description, patterns, responses, actions, is_active)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (name) DO UPDATE SET
            description = EXCLUDED.description,
            patterns = EXCLUDED.patterns,
            responses = EXCLUDED.responses,
            actions = EXCLUDED.actions,
            is_active = EXCLUDED.is_active
        `, [
          intent.name,
          intent.description,
          intent.patterns,
          intent.responses,
          intent.actions,
          true
        ]);
        
        console.log(`✅ Intent '${intent.name}' seeded successfully`);
      } catch (error) {
        console.error(`❌ Failed to seed intent '${intent.name}':`, error.message);
      }
    }
    
    // Verify the seeding
    const countResult = await pool.query('SELECT COUNT(*) as count FROM chat_intents');
    console.log(`🎉 Total intents in database: ${countResult.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error seeding chat intents:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the seeding
seedChatIntents().then(() => {
  console.log('✅ Chat intents seeding completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Chat intents seeding failed:', error);
  process.exit(1);
});
