require('dotenv').config();
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// MongoDB Models
const User = require('../backend/models/User');
const Script = require('../backend/models/Script');
const AIScript = require('../backend/models/AIScript');
const Emotion = require('../backend/models/Emotion');
const ActorProfile = require('../backend/models/ActorProfile');
const ActorRecruitment = require('../backend/models/ActorRecruitment');
const ModelRecruitment = require('../backend/models/ModelRecruitment');
const CommunityPost = require('../backend/models/CommunityPost');
const Like = require('../backend/models/Like');
const Bookmark = require('../backend/models/Bookmark');
const Visitor = require('../backend/models/Visitor');

// Supabase Client (using service role key for admin operations)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase configuration missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migration status tracking
const migrationStats = {
  users: { total: 0, migrated: 0, errors: 0 },
  scripts: { total: 0, migrated: 0, errors: 0 },
  ai_scripts: { total: 0, migrated: 0, errors: 0 },
  emotions: { total: 0, migrated: 0, errors: 0 },
  actor_profiles: { total: 0, migrated: 0, errors: 0 },
  actor_recruitments: { total: 0, migrated: 0, errors: 0 },
  model_recruitments: { total: 0, migrated: 0, errors: 0 },
  community_posts: { total: 0, migrated: 0, errors: 0 },
  likes: { total: 0, migrated: 0, errors: 0 },
  bookmarks: { total: 0, migrated: 0, errors: 0 },
  visitors: { total: 0, migrated: 0, errors: 0 }
};

// Helper function to convert MongoDB ObjectId to UUID
function objectIdToUuid(objectId) {
  if (!objectId) return null;
  // Use a consistent method to convert ObjectId to UUID
  const hex = objectId.toString();
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-4${hex.substring(13, 16)}-8${hex.substring(17, 20)}-${hex.substring(20, 24)}000000`;
}

// Helper function to safely get field value
function safeGet(obj, field, defaultValue = null) {
  try {
    return obj[field] !== undefined ? obj[field] : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

// Migration functions
async function migrateUsers() {
  console.log('\n📤 Migrating Users...');
  
  try {
    const users = await User.find({}).lean();
    migrationStats.users.total = users.length;
    
    for (const user of users) {
      try {
        // First create user in Supabase Auth
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: 'TempPassword123!', // Users will need to reset
          email_confirm: user.isEmailVerified || false,
          user_metadata: {
            name: user.name,
            username: user.username,
            role: user.role || 'user'
          }
        });

        if (authError) {
          console.error(`❌ Auth user creation failed for ${user.email}:`, authError.message);
          migrationStats.users.errors++;
          continue;
        }

        // Then create extended profile
        const userData = {
          id: authUser.user.id,
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          is_active: user.isActive !== false,
          login_attempts: user.loginAttempts || 0,
          lock_until: user.lockUntil ? new Date(user.lockUntil).toISOString() : null,
          last_login: user.lastLogin ? new Date(user.lastLogin).toISOString() : null,
          is_email_verified: user.isEmailVerified || false,
          subscription: user.subscription || { plan: 'free', status: 'inactive', paymentHistory: [] },
          usage: user.usage || { currentMonth: 0, totalGenerated: 0, lastResetDate: null },
          created_at: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
          updated_at: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString()
        };

        const { error: profileError } = await supabase
          .from('users')
          .insert(userData);

        if (profileError) {
          console.error(`❌ Profile creation failed for ${user.email}:`, profileError.message);
          migrationStats.users.errors++;
        } else {
          migrationStats.users.migrated++;
          console.log(`✅ User migrated: ${user.email}`);
        }
      } catch (error) {
        console.error(`❌ Error migrating user ${user.email}:`, error.message);
        migrationStats.users.errors++;
      }
    }
    
    console.log(`📊 Users: ${migrationStats.users.migrated}/${migrationStats.users.total} migrated`);
  } catch (error) {
    console.error('❌ Error in user migration:', error.message);
  }
}

async function migrateScripts() {
  console.log('\n📤 Migrating Scripts...');
  
  try {
    const scripts = await Script.find({}).lean();
    migrationStats.scripts.total = scripts.length;
    
    for (const script of scripts) {
      try {
        const scriptData = {
          id: objectIdToUuid(script._id),
          title: script.title,
          character_count: script.characterCount,
          situation: script.situation,
          content: script.content,
          emotions: script.emotions || [],
          views: script.views || 0,
          gender: script.gender || '전체',
          mood: script.mood,
          duration: script.duration,
          age_group: script.ageGroup,
          purpose: script.purpose,
          script_type: script.scriptType,
          author: script.author || { name: 'Unknown', username: 'unknown' },
          created_at: script.createdAt ? new Date(script.createdAt).toISOString() : new Date().toISOString(),
          updated_at: script.updatedAt ? new Date(script.updatedAt).toISOString() : new Date().toISOString()
        };

        const { error } = await supabase
          .from('scripts')
          .insert(scriptData);

        if (error) {
          console.error(`❌ Script migration failed for ${script.title}:`, error.message);
          migrationStats.scripts.errors++;
        } else {
          migrationStats.scripts.migrated++;
        }
      } catch (error) {
        console.error(`❌ Error migrating script:`, error.message);
        migrationStats.scripts.errors++;
      }
    }
    
    console.log(`📊 Scripts: ${migrationStats.scripts.migrated}/${migrationStats.scripts.total} migrated`);
  } catch (error) {
    console.error('❌ Error in script migration:', error.message);
  }
}

async function migrateAIScripts() {
  console.log('\n📤 Migrating AI Scripts...');
  
  try {
    const aiScripts = await AIScript.find({}).lean();
    migrationStats.ai_scripts.total = aiScripts.length;
    
    for (const script of aiScripts) {
      try {
        // Map user ID to new UUID
        const userData = await supabase
          .from('users')
          .select('id')
          .eq('email', script.userId) // Assuming we have the email
          .single();

        if (!userData.data) {
          console.warn(`⚠️ User not found for AI script: ${script.title}`);
          migrationStats.ai_scripts.errors++;
          continue;
        }

        const scriptData = {
          id: objectIdToUuid(script._id),
          title: script.title,
          content: script.content,
          character_count: script.characterCount,
          genre: script.genre,
          emotions: script.emotions || [],
          length: script.length,
          gender: script.gender,
          age: script.age,
          situation: script.situation,
          style: script.style,
          user_id: userData.data.id,
          metadata: script.metadata || {},
          is_saved: script.isSaved || false,
          saved_at: script.savedAt ? new Date(script.savedAt).toISOString() : null,
          created_at: script.createdAt ? new Date(script.createdAt).toISOString() : new Date().toISOString(),
          updated_at: script.updatedAt ? new Date(script.updatedAt).toISOString() : new Date().toISOString()
        };

        const { error } = await supabase
          .from('ai_scripts')
          .insert(scriptData);

        if (error) {
          console.error(`❌ AI Script migration failed for ${script.title}:`, error.message);
          migrationStats.ai_scripts.errors++;
        } else {
          migrationStats.ai_scripts.migrated++;
        }
      } catch (error) {
        console.error(`❌ Error migrating AI script:`, error.message);
        migrationStats.ai_scripts.errors++;
      }
    }
    
    console.log(`📊 AI Scripts: ${migrationStats.ai_scripts.migrated}/${migrationStats.ai_scripts.total} migrated`);
  } catch (error) {
    console.error('❌ Error in AI script migration:', error.message);
  }
}

async function migrateEmotions() {
  console.log('\n📤 Migrating Emotions...');
  
  try {
    const emotions = await Emotion.find({}).lean();
    migrationStats.emotions.total = emotions.length;
    
    // Clear existing emotions first
    await supabase.from('emotions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    for (const emotion of emotions) {
      try {
        const emotionData = {
          id: objectIdToUuid(emotion._id),
          name: emotion.name,
          created_at: emotion.createdAt ? new Date(emotion.createdAt).toISOString() : new Date().toISOString(),
          updated_at: emotion.updatedAt ? new Date(emotion.updatedAt).toISOString() : new Date().toISOString()
        };

        const { error } = await supabase
          .from('emotions')
          .insert(emotionData);

        if (error) {
          console.error(`❌ Emotion migration failed for ${emotion.name}:`, error.message);
          migrationStats.emotions.errors++;
        } else {
          migrationStats.emotions.migrated++;
        }
      } catch (error) {
        console.error(`❌ Error migrating emotion:`, error.message);
        migrationStats.emotions.errors++;
      }
    }
    
    console.log(`📊 Emotions: ${migrationStats.emotions.migrated}/${migrationStats.emotions.total} migrated`);
  } catch (error) {
    console.error('❌ Error in emotion migration:', error.message);
  }
}

async function generateMigrationReport() {
  const report = {
    timestamp: new Date().toISOString(),
    migration_stats: migrationStats,
    total_records: Object.values(migrationStats).reduce((sum, stat) => sum + stat.total, 0),
    total_migrated: Object.values(migrationStats).reduce((sum, stat) => sum + stat.migrated, 0),
    total_errors: Object.values(migrationStats).reduce((sum, stat) => sum + stat.errors, 0)
  };

  // Save report to file
  const reportPath = path.join(__dirname, `migration-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log('\n📊 Migration Report:');
  console.log('==================');
  Object.entries(migrationStats).forEach(([table, stats]) => {
    const successRate = stats.total > 0 ? ((stats.migrated / stats.total) * 100).toFixed(1) : '0.0';
    console.log(`${table}: ${stats.migrated}/${stats.total} (${successRate}%) - ${stats.errors} errors`);
  });
  
  console.log(`\nTotal: ${report.total_migrated}/${report.total_records} records migrated`);
  console.log(`Report saved: ${reportPath}`);
}

async function runMigration() {
  console.log('🚀 Starting MongoDB to Supabase Migration');
  console.log('==========================================');
  
  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');
    
    // Test Supabase connection
    console.log('📡 Testing Supabase connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      throw new Error(`Supabase connection failed: ${error.message}`);
    }
    console.log('✅ Supabase connected');
    
    // Run migrations in order
    await migrateUsers();
    await migrateEmotions();
    await migrateScripts();
    await migrateAIScripts();
    // Add other migrations as needed
    
    // Generate report
    await generateMigrationReport();
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
  } finally {
    // Cleanup
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('📡 MongoDB disconnected');
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n⚡ Migration interrupted');
  if (mongoose.connection.readyState === 1) {
    await mongoose.disconnect();
  }
  process.exit(0);
});

// Run migration if this script is called directly
if (require.main === module) {
  runMigration();
}

module.exports = {
  runMigration,
  migrationStats
};