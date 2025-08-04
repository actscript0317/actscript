#!/usr/bin/env node

/**
 * MongoDB to Supabase Data Migration Script
 * 
 * This script migrates data from MongoDB to Supabase PostgreSQL
 * Run with: node migration/data-migration.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { supabaseAdmin } = require('../backend/config/supabase');

// MongoDB Models
const User = require('../backend/models/User');
const Script = require('../backend/models/Script');
const Emotion = require('../backend/models/Emotion');

// Migration statistics
const stats = {
  users: { total: 0, migrated: 0, errors: 0 },
  scripts: { total: 0, migrated: 0, errors: 0 },
  emotions: { total: 0, migrated: 0, errors: 0 }
};

// Helper function to log progress
const log = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`, data);
};

// Connect to MongoDB
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    log('✅ MongoDB 연결 성공');
  } catch (error) {
    log('❌ MongoDB 연결 실패:', { error: error.message });
    throw error;
  }
};

// Check Supabase connection
const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('emotions')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    log('✅ Supabase 연결 성공');
  } catch (error) {
    log('❌ Supabase 연결 실패:', { error: error.message });
    throw error;
  }
};

// Migrate Users
const migrateUsers = async () => {
  try {
    log('👥 사용자 마이그레이션 시작...');
    
    const users = await User.find({}).lean();
    stats.users.total = users.length;
    
    log(`총 ${users.length}명의 사용자 발견`);
    
    for (const user of users) {
      try {
        // Transform MongoDB user to PostgreSQL format
        const supabaseUser = {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          name: user.name,
          role: user.role || 'user',
          is_active: user.isActive !== false,
          login_attempts: user.loginAttempts || 0,
          lock_until: user.lockUntil || null,
          last_login: user.lastLogin || null,
          is_email_verified: user.isEmailVerified || false,
          
          // Convert subscription object to JSONB
          subscription: JSON.stringify({
            plan: user.subscription?.plan || 'free',
            status: user.subscription?.status || 'inactive',
            startDate: user.subscription?.startDate || null,
            endDate: user.subscription?.endDate || null,
            paymentHistory: user.subscription?.paymentHistory || []
          }),
          
          // Convert usage object to JSONB
          usage: JSON.stringify({
            currentMonth: user.usage?.currentMonth || 0,
            lastResetDate: user.usage?.lastResetDate || null,
            totalGenerated: user.usage?.totalGenerated || 0
          }),
          
          created_at: user.createdAt || new Date(),
          updated_at: user.updatedAt || new Date()
        };
        
        const { error } = await supabaseAdmin
          .from('users')
          .insert(supabaseUser);
        
        if (error) {
          // Skip if user already exists
          if (error.code === '23505') {
            log(`⚠️ 사용자 ${user.username} 이미 존재함 (스킵)`);
          } else {
            throw error;
          }
        } else {
          stats.users.migrated++;
          log(`✅ 사용자 ${user.username} 마이그레이션 완료`);
        }
        
      } catch (error) {
        stats.users.errors++;
        log(`❌ 사용자 ${user.username} 마이그레이션 실패:`, { error: error.message });
      }
    }
    
    log(`👥 사용자 마이그레이션 완료: ${stats.users.migrated}/${stats.users.total} (오류: ${stats.users.errors})`);
    
  } catch (error) {
    log('❌ 사용자 마이그레이션 중 치명적 오류:', { error: error.message });
    throw error;
  }
};

// Migrate Scripts
const migrateScripts = async () => {
  try {
    log('📝 스크립트 마이그레이션 시작...');
    
    const scripts = await Script.find({}).lean();
    stats.scripts.total = scripts.length;
    
    log(`총 ${scripts.length}개의 스크립트 발견`);
    
    for (const script of scripts) {
      try {
        // Transform MongoDB script to PostgreSQL format
        const supabaseScript = {
          id: script._id.toString(),
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
          author_name: script.author?.name || 'Unknown',
          author_username: script.author?.username || 'unknown',
          author_id: null, // Will be linked after user migration
          created_at: script.createdAt || new Date(),
          updated_at: script.updatedAt || new Date()
        };
        
        const { error } = await supabaseAdmin
          .from('scripts')
          .insert(supabaseScript);
        
        if (error) {
          if (error.code === '23505') {
            log(`⚠️ 스크립트 ${script.title} 이미 존재함 (스킵)`);
          } else {
            throw error;
          }
        } else {
          stats.scripts.migrated++;
          log(`✅ 스크립트 "${script.title}" 마이그레이션 완료`);
        }
        
      } catch (error) {
        stats.scripts.errors++;
        log(`❌ 스크립트 "${script.title}" 마이그레이션 실패:`, { error: error.message });
      }
    }
    
    log(`📝 스크립트 마이그레이션 완료: ${stats.scripts.migrated}/${stats.scripts.total} (오류: ${stats.scripts.errors})`);
    
  } catch (error) {
    log('❌ 스크립트 마이그레이션 중 치명적 오류:', { error: error.message });
    throw error;
  }
};

// Migrate Emotions
const migrateEmotions = async () => {
  try {
    log('😊 감정 마이그레이션 시작...');
    
    const emotions = await Emotion.find({}).lean();
    stats.emotions.total = emotions.length;
    
    log(`총 ${emotions.length}개의 감정 발견`);
    
    for (const emotion of emotions) {
      try {
        const supabaseEmotion = {
          id: emotion._id.toString(),
          name: emotion.name,
          created_at: emotion.createdAt || new Date()
        };
        
        const { error } = await supabaseAdmin
          .from('emotions')
          .insert(supabaseEmotion);
        
        if (error) {
          if (error.code === '23505') {
            log(`⚠️ 감정 ${emotion.name} 이미 존재함 (스킵)`);
          } else {
            throw error;
          }
        } else {
          stats.emotions.migrated++;
          log(`✅ 감정 "${emotion.name}" 마이그레이션 완료`);
        }
        
      } catch (error) {
        stats.emotions.errors++;
        log(`❌ 감정 "${emotion.name}" 마이그레이션 실패:`, { error: error.message });
      }
    }
    
    log(`😊 감정 마이그레이션 완료: ${stats.emotions.migrated}/${stats.emotions.total} (오류: ${stats.emotions.errors})`);
    
  } catch (error) {
    log('❌ 감정 마이그레이션 중 치명적 오류:', { error: error.message });
    throw error;
  }
};

// Link author IDs after user migration
const linkAuthorIds = async () => {
  try {
    log('🔗 작성자 ID 연결 시작...');
    
    // Get all users to create username -> id mapping
    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, username');
    
    if (userError) throw userError;
    
    const userMap = {};
    users.forEach(user => {
      userMap[user.username] = user.id;
    });
    
    // Update scripts with author_id
    const { data: scripts, error: scriptError } = await supabaseAdmin
      .from('scripts')
      .select('id, author_username');
    
    if (scriptError) throw scriptError;
    
    let linkedCount = 0;
    
    for (const script of scripts) {
      if (userMap[script.author_username]) {
        const { error } = await supabaseAdmin
          .from('scripts')
          .update({ author_id: userMap[script.author_username] })
          .eq('id', script.id);
        
        if (!error) {
          linkedCount++;
        }
      }
    }
    
    log(`🔗 작성자 ID 연결 완료: ${linkedCount}개 스크립트`);
    
  } catch (error) {
    log('❌ 작성자 ID 연결 중 오류:', { error: error.message });
  }
};

// Main migration function
const runMigration = async () => {
  try {
    log('🚀 데이터 마이그레이션 시작');
    
    // Check connections
    await connectMongoDB();
    await checkSupabaseConnection();
    
    // Run migrations in order
    await migrateEmotions();
    await migrateUsers();
    await migrateScripts();
    await linkAuthorIds();
    
    // Print final statistics
    log('📊 마이그레이션 완료 통계:', {
      users: stats.users,
      scripts: stats.scripts,
      emotions: stats.emotions
    });
    
    log('✅ 데이터 마이그레이션 완료!');
    
  } catch (error) {
    log('💥 마이그레이션 실패:', { error: error.message });
    process.exit(1);
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    log('🔌 MongoDB 연결 종료');
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration, stats };