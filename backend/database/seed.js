const bcrypt = require('bcryptjs');
const db = require('../src/config/database');

const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');

    // Create AI Assistant user
    const hashedPassword = await bcrypt.hash('ai_assistant_password_secure', 12);
    
    const aiAssistant = await db.query(`
      INSERT INTO users (
        first_name, 
        last_name, 
        email, 
        phone_number, 
        password_hash, 
        profile_photo
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, [
      'AI',
      'Assistant',
      'ai.assistant@relatim-ai.com',
      '+1000000000',
      hashedPassword,
      null
    ]);

    console.log('AI Assistant user created/verified');

    // Create some demo users for development
    const demoUsers = [
      {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john.doe@gmail.com',
        phone_number: '+1234567890',
        password: 'password123'
      },
      {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@gmail.com',
        phone_number: '+1234567891',
        password: 'password123'
      },
      {
        first_name: 'Bob',
        last_name: 'Johnson',
        email: 'bob.johnson@gmail.com',
        phone_number: '+1234567892',
        password: 'password123'
      }
    ];

    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 12);
      await db.query(`
        INSERT INTO users (
          first_name, 
          last_name, 
          email, 
          phone_number, 
          password_hash
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
      `, [
        user.first_name,
        user.last_name,
        user.email,
        user.phone_number,
        hashedPassword
      ]);
    }

    console.log('Demo users created');

    // Get all users for creating default settings
    const users = await db.query('SELECT id FROM users');
    
    for (const user of users.rows) {
      await db.query(`
        INSERT INTO user_settings (user_id)
        VALUES ($1)
        ON CONFLICT (user_id) DO NOTHING
      `, [user.id]);
    }

    console.log('Default user settings created');
    console.log('Database seeding completed successfully');

  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;