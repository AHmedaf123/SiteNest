const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

// Configure Neon
neonConfig.webSocketConstructor = ws;

// Load environment variables
require('dotenv').config();

async function createChatTables() {
  console.log('🔧 Starting database setup...');
  console.log('Database URL:', process.env.DATABASE_URL ? 'Found' : 'Missing');

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔧 Creating missing chat tables...');
    
    // Create chat_conversations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "chat_conversations" (
        "id" serial PRIMARY KEY NOT NULL,
        "session_id" text NOT NULL,
        "message_id" text NOT NULL,
        "role" text NOT NULL,
        "content" text NOT NULL,
        "intent" text,
        "entities" jsonb,
        "confidence" integer,
        "timestamp" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "chat_conversations_message_id_unique" UNIQUE("message_id")
      );
    `);
    console.log('✅ chat_conversations table created');
    
    // Create chat_intents table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "chat_intents" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "patterns" text[],
        "responses" text[],
        "actions" text[],
        "is_active" boolean DEFAULT true,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "chat_intents_name_unique" UNIQUE("name")
      );
    `);
    console.log('✅ chat_intents table created');
    
    // Create chat_analytics table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "chat_analytics" (
        "id" serial PRIMARY KEY NOT NULL,
        "session_id" text NOT NULL,
        "user_id" text,
        "conversation_length" integer,
        "intents_satisfied" text[],
        "booking_completed" boolean DEFAULT false,
        "satisfaction_score" integer,
        "feedback_text" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `);
    console.log('✅ chat_analytics table created');
    
    // Add indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "chat_conversations_session_id_idx" ON "chat_conversations" ("session_id");
      CREATE INDEX IF NOT EXISTS "chat_conversations_role_idx" ON "chat_conversations" ("role");
      CREATE INDEX IF NOT EXISTS "chat_conversations_intent_idx" ON "chat_conversations" ("intent");
      CREATE INDEX IF NOT EXISTS "chat_conversations_timestamp_idx" ON "chat_conversations" ("timestamp");
      
      CREATE INDEX IF NOT EXISTS "chat_intents_name_idx" ON "chat_intents" ("name");
      CREATE INDEX IF NOT EXISTS "chat_intents_is_active_idx" ON "chat_intents" ("is_active");
      
      CREATE INDEX IF NOT EXISTS "chat_analytics_session_id_idx" ON "chat_analytics" ("session_id");
      CREATE INDEX IF NOT EXISTS "chat_analytics_user_id_idx" ON "chat_analytics" ("user_id");
      CREATE INDEX IF NOT EXISTS "chat_analytics_booking_completed_idx" ON "chat_analytics" ("booking_completed");
      CREATE INDEX IF NOT EXISTS "chat_analytics_created_at_idx" ON "chat_analytics" ("created_at");
    `);
    console.log('✅ Indexes created');
    
    // Insert default intents
    await pool.query(`
      INSERT INTO "chat_intents" ("name", "description", "patterns", "responses", "actions", "is_active") 
      VALUES
      ('greeting', 'User greets the chatbot', 
       ARRAY['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'],
       ARRAY['Hello! Welcome to SiteNest. How can I help you today?', 'Hi there! I''m here to help you find the perfect apartment.'],
       ARRAY['show_welcome_options'],
       true),
      
      ('room_inquiry', 'User asks about available rooms',
       ARRAY['show rooms', 'available apartments', 'what rooms do you have', 'room options'],
       ARRAY['I''d be happy to show you our available rooms. Let me get the latest information for you.'],
       ARRAY['fetch_available_rooms'],
       true),
      
      ('booking_intent', 'User wants to make a booking',
       ARRAY['book room', 'make reservation', 'i want to book', 'reserve apartment'],
       ARRAY['Great! I''ll help you with your booking. Let me gather some details.'],
       ARRAY['start_booking_flow'],
       true),
      
      ('help', 'User needs assistance',
       ARRAY['help', 'assist', 'support', 'confused', 'don''t understand'],
       ARRAY['I''m here to help! You can ask me about room availability, pricing, bookings, or any other questions about SiteNest.'],
       ARRAY['show_help_options'],
       true)
      ON CONFLICT (name) DO NOTHING;
    `);
    console.log('✅ Default intents inserted');
    
    console.log('🎉 Database setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error setting up database:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the script
console.log('🚀 Starting script...');
createChatTables().then(() => {
  console.log('✅ Script completed successfully');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed to create chat tables:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
});
