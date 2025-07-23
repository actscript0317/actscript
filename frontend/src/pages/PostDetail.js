import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Eye, MessageCircle, Heart, Bookmark, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);

  // 더미 데이터 (실제로는 API에서 가져올 예정)
  const getDummyPost = (postId) => {
    const dummyPosts = {
      1: {
        id: 1,
        title: '소속사 오디션 정보 공유',
        author: '정보공유',
        category: '매니지먼트',
        categoryColor: 'bg-blue-100 text-blue-700',
        content: `이번 달에 있는 소속사 오디션 정보들을 정리해서 공유드립니다. 도움이 되길 바랍니다.

1. A엔터테인먼트
- 일시: 1월 25일 오후 2시
- 대상: 20~30세 남녀
- 준비물: 자유연기 1분
- 장소: 강남구 테헤란로 123
- 문의: 02-1234-5678

2. B프로덕션
- 일시: 1월 28일 오전 10시
- 대상: 전 연령
- 준비물: 지정 대본 (홈페이지 다운로드)
- 장소: 서초구 서초대로 456
- 문의: info@bproduction.com

3. C엔터테인먼트
- 일시: 2월 1일 오후 3시
- 대상: 25~35세 여성
- 준비물: 프로필 사진, 자유연기
- 장소: 마포구 홍대로 789
- 문의: casting@center.co.kr

자세한 내용은 각 소속사 홈페이지를 확인하시고, 오디션 준비에 도움이 되시길 바랍니다.

질문이 있으시면 댓글로 남겨주세요!`,
        createdAt: '2024-01-11',
        views: 445,
        comments: 23,
        likes: 89,
        bookmarks: 156,
        board: 'actor-info',
        boardName: '연기자 정보방',
        tags: ['오디션', '소속사', '정보공유']
      },
      2: {
        id: 2,
        title: '아이돌 뮤직비디오 출연자 모집',
        author: '뮤직비디오팀',
        category: '뮤직비디오',
        categoryColor: 'bg-pink-100 text-pink-700',
        recruitmentField: '뮤직비디오 모델',
        applicationMethod: '이메일: mv@example.com',
        content: `케이팝 아이돌 그룹의 뮤직비디오에 출연할 모델을 모집합니다.

📍 촬영 정보
- 촬영 일정: 2024년 2월 말 (2일간)
- 촬영 장소: 서울 스튜디오 + 야외 로케이션
- 뮤직비디오 장르: 팝/댄스

👥 모집 조건
- 20~30세 여성
- 키 160cm 이상
- 카메라 앞에서 자연스러운 분
- 댄스 경험자 우대 (필수 아님)

💰 페이 및 혜택
- 출연료: 협의 후 결정
- 식사 및 교통비 제공
- 포트폴리오용 사진 제공

📝 지원 방법
- 이메일: mv@example.com
- 제목: [뮤직비디오 모델 지원] 이름
- 첨부: 프로필 사진, 전신 사진, 간단한 자기소개

📅 지원 마감: 2월 15일까지

많은 관심과 지원 부탁드립니다!`,
        createdAt: '2024-01-15',
        views: 342,
        comments: 12,
        likes: 67,
        bookmarks: 43,
        board: 'model-recruitment',
        boardName: '모델/출연자 모집',
        tags: ['뮤직비디오', '모델', '아이돌']
      }
    };

    return dummyPosts[postId] || null;
  };

  // 게시판별 뒤로가기 경로
  const getBackPath = (board) => {
    switch (board) {
      case 'actor-recruitment': return '/actor-recruitment';
      case 'model-recruitment': return '/model-recruitment';
      case 'actor-info': return '/actor-info';
      case 'actor-profile': return '/actor-profile';
      default: return '/';
    }
  };

  useEffect(() => {
    // 실제로는 API 호출
    const fetchPost = async () => {
      try {
        setLoading(true);
        const postData = getDummyPost(parseInt(id));
        if (postData) {
          setPost(postData);
          // 조회수 증가 (실제로는 API 호출)
          postData.views += 1;
        }
      } catch (error) {
        console.error('게시글 불러오기 실패:', error);
        toast.error('게시글을 불러올 수 없습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    setPost(prev => ({
      ...prev,
      likes: prev.likes + 1
    }));
    toast.success('좋아요를 눌렀습니다!');
  };

  const handleBookmark = () => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다.');
      return;
    }
    
    setPost(prev => ({
      ...prev,
      bookmarks: prev.bookmarks + 1
    }));
    toast.success('게시글이 저장되었습니다!');
  };

  const handleEdit = () => {
    // 수정 페이지로 이동 (추후 구현)
    toast.info('수정 기능은 준비 중입니다.');
  };

  const handleDelete = () => {
    if (window.confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
      // 실제로는 API 호출
      toast.success('게시글이 삭제되었습니다.');
      navigate(getBackPath(post.board));
    }
  };

  const handleBack = () => {
    navigate(getBackPath(post?.board));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">게시글을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">삭제되었거나 존재하지 않는 게시글입니다.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            목록으로 돌아가기
          </button>
        </div>

        {/* 게시글 내용 */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* 헤더 */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${post.categoryColor}`}>
                  {post.category}
                </span>
                <span className="text-sm text-gray-500">
                  {post.boardName}
                </span>
              </div>
              
              {/* 수정/삭제 버튼 (작성자만 보임) */}
              {isAuthenticated && user?.name === post.author && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleEdit}
                    className="flex items-center px-3 py-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    수정
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex items-center px-3 py-1 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </button>
                </div>
              )}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {post.title}
            </h1>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
              <span className="flex items-center">
                <User className="w-4 h-4 mr-1" />
                {post.author}
              </span>
              <span className="flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                {formatDate(post.createdAt)}
              </span>
              <span className="flex items-center">
                <Eye className="w-4 h-4 mr-1" />
                {post.views}
              </span>
              <span className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-1" />
                {post.comments}
              </span>
            </div>

            {/* 추가 정보 (모집 글인 경우) */}
            {post.recruitmentField && (
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>모집분야:</strong> {post.recruitmentField}
                  </div>
                  {post.applicationMethod && (
                    <div>
                      <strong>지원방법:</strong> {post.applicationMethod}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 태그 */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 본문 */}
          <div className="p-6">
            <div className="prose max-w-none">
              <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {post.content}
              </div>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLike}
                  className="flex items-center px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Heart className="w-5 h-5 mr-2" />
                  좋아요 {post.likes}
                </button>
                <button
                  onClick={handleBookmark}
                  className="flex items-center px-4 py-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Bookmark className="w-5 h-5 mr-2" />
                  저장하기 {post.bookmarks}
                </button>
              </div>
              
              <button
                onClick={handleBack}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                목록으로
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail; 