// migrations/fixPhoneIndex.js
require('dotenv').config(); // Load environment variables
const mongoose = require('mongoose');
const User = require('../src/models/User');
// const User = require('../models/User');

async function fixPhoneIndex() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    // Use the same connection string from your .env file
    const conn = await mongoose.connect(process.env.MONGO_URI);
    
    console.log(`✅ Connected to MongoDB: ${conn.connection.host}`);
    console.log('📊 Database:', conn.connection.name);
    
    // Step 1: Drop the old phone index
    console.log('\n🗑️  Dropping old phone index...');
    try {
      await User.collection.dropIndex('phone_1');
      console.log('✅ Old phone_1 index dropped successfully');
    } catch (err) {
      if (err.code === 27) {
        console.log('⚠️  Index "phone_1" does not exist (this is okay)');
      } else {
        console.log('⚠️  Could not drop index:', err.message);
      }
    }

    // Step 2: Create new sparse index
    console.log('\n🔨 Creating new sparse index for phone field...');
    await User.collection.createIndex(
      { phone: 1 }, 
      { 
        unique: true, 
        sparse: true,
        name: 'phone_1' // Keep same index name
      }
    );
    console.log('✅ New sparse index created successfully');

    // Step 3: List all indexes to verify
    console.log('\n📋 Current indexes on User collection:');
    const indexes = await User.collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, JSON.stringify(index.key), 
                  index.unique ? '(unique)' : '', 
                  index.sparse ? '(sparse)' : '');
    });

    console.log('\n🎉 Migration completed successfully!');
    console.log('👉 You can now use Google/Facebook login without duplicate key errors');
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the migration
fixPhoneIndex();