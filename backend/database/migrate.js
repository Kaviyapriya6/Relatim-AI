const db = require('../src/config/database');

const createTables = async () => {
  try {
    console.log('Starting database migration...');

    // Enable UUID extension
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // Create ENUM types
    await db.query(`
      DO $$ BEGIN
        CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'seen');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await db.query(`
      DO $$ BEGIN
        CREATE TYPE call_status AS ENUM ('initiated', 'ringing', 'connected', 'ended', 'missed');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone_number VARCHAR(20) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        profile_photo TEXT,
        is_online BOOLEAN DEFAULT false,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create contacts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        nickname VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, contact_id)
      );
    `);

    // Create messages table
    await db.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT,
        file_url TEXT,
        file_type VARCHAR(50),
        file_name VARCHAR(255),
        file_size INTEGER,
        status message_status DEFAULT 'sent',
        is_deleted_for_sender BOOLEAN DEFAULT false,
        is_deleted_for_receiver BOOLEAN DEFAULT false,
        is_deleted_for_everyone BOOLEAN DEFAULT false,
        reply_to_message_id UUID REFERENCES messages(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create ai_chats table
    await db.query(`
      CREATE TABLE IF NOT EXISTS ai_chats (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        prompt TEXT NOT NULL,
        response TEXT NOT NULL,
        conversation_context JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create message_status table for tracking delivery and seen status
    await db.query(`
      CREATE TABLE IF NOT EXISTS message_read_status (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        delivered_at TIMESTAMP,
        seen_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(message_id, user_id)
      );
    `);

    // Create typing_indicators table
    await db.query(`
      CREATE TABLE IF NOT EXISTS typing_indicators (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_typing BOOLEAN DEFAULT false,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, contact_id)
      );
    `);

    // Create calls table for LiveKit integration
    await db.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        call_type VARCHAR(10) NOT NULL CHECK (call_type IN ('voice', 'video')),
        status call_status DEFAULT 'initiated',
        room_id VARCHAR(255),
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        duration INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create user_settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        dark_mode BOOLEAN DEFAULT false,
        notifications_enabled BOOLEAN DEFAULT true,
        message_preview BOOLEAN DEFAULT true,
        last_backup TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id)
      );
    `);

    // Create indexes for better performance
    await db.query(`CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_ai_chats_user_id ON ai_chats(user_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_message_status_message_id ON message_read_status(message_id);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_calls_participants ON calls(caller_id, receiver_id);`);

    // Create triggers for updated_at timestamps
    await db.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await db.query(`DROP TRIGGER IF EXISTS update_users_updated_at ON users;`);
    await db.query(`CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`);

    await db.query(`DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;`);
    await db.query(`CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`);

    await db.query(`DROP TRIGGER IF EXISTS update_user_settings_updated_at ON user_settings;`);
    await db.query(`CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();`);

    console.log('Database migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('Migration finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = createTables;