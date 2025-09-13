const db = require('../src/config/database');

const addSettingsColumns = async () => {
  try {
    console.log('Adding missing settings columns...');

    // Add columns for sound settings
    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS sound_enabled BOOLEAN DEFAULT true
    `);

    // Add columns for privacy settings
    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS read_receipts BOOLEAN DEFAULT true
    `);

    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS last_seen_enabled BOOLEAN DEFAULT true
    `);

    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS online_status_enabled BOOLEAN DEFAULT true
    `);

    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS typing_indicators BOOLEAN DEFAULT true
    `);

    // Add columns for media and general settings
    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS auto_download VARCHAR(20) DEFAULT 'wifi'
    `);

    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en'
    `);

    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS font_size VARCHAR(10) DEFAULT 'medium'
    `);

    // Add columns for 2FA settings
    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false
    `);

    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS two_factor_secret TEXT
    `);

    await db.query(`
      ALTER TABLE user_settings 
      ADD COLUMN IF NOT EXISTS backup_codes TEXT[]
    `);

    console.log('Settings columns added successfully');

  } catch (error) {
    console.error('Error adding settings columns:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  addSettingsColumns()
    .then(() => {
      console.log('Settings migration finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Settings migration failed:', error);
      process.exit(1);
    });
}

module.exports = addSettingsColumns;