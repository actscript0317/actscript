const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  postType: {
    type: String,
    enum: ['actor_profile', 'actor_recruitment', 'model_recruitment', 'actor_info', 'community_post'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// 같은 사용자가 같은 게시글에 중복 좋아요 방지
likeSchema.index({ userId: 1, postId: 1, postType: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema); 