const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema({
  // 날짜 (YYYY-MM-DD 형식)
  date: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // 일일 방문자 수
  count: {
    type: Number,
    default: 0
  },
  // 고유 방문자 IP 주소들 (중복 제거용)
  uniqueIPs: [{
    type: String
  }],
  // 페이지별 방문 통계
  pageViews: {
    home: { type: Number, default: 0 },
    scripts: { type: Number, default: 0 },
    aiScript: { type: Number, default: 0 },
    actorProfile: { type: Number, default: 0 },
    actorRecruitment: { type: Number, default: 0 },
    modelRecruitment: { type: Number, default: 0 },
    actorInfo: { type: Number, default: 0 },
    mypage: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  collection: 'visitors'
});

// 인덱스 설정
visitorSchema.index({ date: -1 });
visitorSchema.index({ createdAt: -1 });

// 방문자 추가 메서드
visitorSchema.statics.addVisitor = async function(ip, page = 'home') {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD 형식
  
  try {
    let visitor = await this.findOne({ date: today });
    
    if (!visitor) {
      // 새로운 날짜의 첫 방문자
      visitor = new this({
        date: today,
        count: 1,
        uniqueIPs: [ip],
        pageViews: {
          [page]: 1
        }
      });
    } else {
      // 기존 날짜에 방문자 추가
      if (!visitor.uniqueIPs.includes(ip)) {
        visitor.uniqueIPs.push(ip);
        visitor.count += 1;
      }
      
      // 페이지 방문 수 증가
      if (visitor.pageViews[page] !== undefined) {
        visitor.pageViews[page] += 1;
      } else {
        visitor.pageViews.other += 1;
      }
    }
    
    await visitor.save();
    return visitor;
  } catch (error) {
    console.error('방문자 추가 오류:', error);
    throw error;
  }
};

// 기간별 방문자 통계 조회
visitorSchema.statics.getStats = async function(startDate, endDate) {
  try {
    const stats = await this.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: null,
          totalVisitors: { $sum: '$count' },
          totalPageViews: {
            $sum: {
              $add: [
                '$pageViews.home',
                '$pageViews.scripts',
                '$pageViews.aiScript',
                '$pageViews.actorProfile',
                '$pageViews.actorRecruitment',
                '$pageViews.modelRecruitment',
                '$pageViews.actorInfo',
                '$pageViews.mypage',
                '$pageViews.other'
              ]
            }
          },
          avgVisitorsPerDay: { $avg: '$count' }
        }
      }
    ]);
    
    return stats[0] || {
      totalVisitors: 0,
      totalPageViews: 0,
      avgVisitorsPerDay: 0
    };
  } catch (error) {
    console.error('방문자 통계 조회 오류:', error);
    throw error;
  }
};

module.exports = mongoose.model('Visitor', visitorSchema);