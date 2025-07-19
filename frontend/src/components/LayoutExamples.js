import React from 'react';
import { Heart, Star, Eye, User, Calendar, BookOpen } from 'lucide-react';

// 기본 카드 레이아웃 예시들
const LayoutExamples = () => {
  return (
    <div className="container py-16 space-y-16">
      
      {/* 1. 기본 카드 그리드 예시 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">1. 기본 카드 그리드 (3열)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="card">
            <div className="flex items-center mb-4">
              <Heart className="w-8 h-8 text-emerald-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">카드 제목 1</h3>
            </div>
            <p className="text-gray-600 mb-4">이것은 기본 카드 레이아웃의 예시입니다. 깔끔하고 간단한 디자인입니다.</p>
            <button className="btn btn-primary w-full">자세히 보기</button>
          </div>
          
          <div className="card">
            <div className="flex items-center mb-4">
              <Star className="w-8 h-8 text-emerald-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">카드 제목 2</h3>
            </div>
            <p className="text-gray-600 mb-4">각 카드는 독립적인 컨텐츠 영역을 가지고 있으며 호버 효과가 있습니다.</p>
            <button className="btn btn-secondary w-full">자세히 보기</button>
          </div>
          
          <div className="card">
            <div className="flex items-center mb-4">
              <Eye className="w-8 h-8 text-emerald-600 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">카드 제목 3</h3>
            </div>
            <p className="text-gray-600 mb-4">반응형 디자인으로 모바일에서는 1열, 태블릿에서는 2열로 표시됩니다.</p>
            <button className="btn btn-outline w-full">자세히 보기</button>
          </div>
        </div>
      </section>

      {/* 2. 호버 효과가 있는 카드 예시 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">2. 호버 효과 카드 (4열)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
            <div key={item} className="card-hover text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">아이템 {item}</h3>
              <p className="text-sm text-gray-600">호버 시 살짝 위로 올라가는 효과</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 2열 레이아웃 예시 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">3. 2열 레이아웃</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card">
            <h3 className="text-xl font-bold text-gray-900 mb-4">왼쪽 콘텐츠</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="text-gray-700">사용자 1</span>
                </div>
                <span className="text-emerald-600 font-medium">활성</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="text-gray-700">사용자 2</span>
                </div>
                <span className="text-emerald-600 font-medium">활성</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <User className="w-5 h-5 text-gray-500 mr-3" />
                  <span className="text-gray-700">사용자 3</span>
                </div>
                <span className="text-gray-400 font-medium">비활성</span>
              </div>
            </div>
          </div>
          
          <div className="card">
            <h3 className="text-xl font-bold text-gray-900 mb-4">오른쪽 콘텐츠</h3>
            <div className="space-y-4">
              <div className="flex items-start p-4 border border-gray-200 rounded-lg">
                <Calendar className="w-5 h-5 text-emerald-600 mr-3 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">이벤트 1</h4>
                  <p className="text-sm text-gray-600 mb-2">이것은 이벤트에 대한 설명입니다.</p>
                  <span className="text-xs text-gray-500">2024년 1월 15일</span>
                </div>
              </div>
              <div className="flex items-start p-4 border border-gray-200 rounded-lg">
                <Calendar className="w-5 h-5 text-emerald-600 mr-3 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">이벤트 2</h4>
                  <p className="text-sm text-gray-600 mb-2">또 다른 이벤트에 대한 설명입니다.</p>
                  <span className="text-xs text-gray-500">2024년 1월 20일</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 통계 카드 예시 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">4. 통계 카드</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 p-3 bg-blue-100 text-blue-600 rounded-lg">
              <User className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">1,234</div>
            <div className="text-gray-600">총 사용자</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 p-3 bg-emerald-100 text-emerald-600 rounded-lg">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">567</div>
            <div className="text-gray-600">총 게시물</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 p-3 bg-purple-100 text-purple-600 rounded-lg">
              <Eye className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">89K</div>
            <div className="text-gray-600">총 조회수</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-4 p-3 bg-red-100 text-red-600 rounded-lg">
              <Heart className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">12K</div>
            <div className="text-gray-600">총 좋아요</div>
          </div>
        </div>
      </section>

      {/* 5. 플렉스 레이아웃 예시 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">5. 플렉스 레이아웃</h2>
        
        {/* 플렉스 - 양쪽 정렬 */}
        <div className="card mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">제목</h3>
            <button className="text-emerald-600 text-sm font-medium hover:text-emerald-700">
              더 보기 →
            </button>
          </div>
          <p className="text-gray-600">플렉스 레이아웃을 사용한 제목과 버튼의 양쪽 정렬 예시입니다.</p>
        </div>
        
        {/* 플렉스 - 중앙 정렬 */}
        <div className="card">
          <div className="flex items-center justify-center space-x-4 py-8">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <Heart className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">중앙 정렬 콘텐츠</h3>
              <p className="text-gray-600">플렉스를 사용한 중앙 정렬 예시입니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. 코드 예시 */}
      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">6. 기본 Tailwind CSS 클래스</h2>
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">주요 클래스들:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">그리드 레이아웃:</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3</code></li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">gap-4</code> (간격)</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">gap-6</code> (더 큰 간격)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">카드 스타일:</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">bg-white rounded-lg shadow-sm</code></li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">border border-gray-200</code></li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">p-6</code> (패딩)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">플렉스 레이아웃:</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">flex items-center justify-between</code></li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">flex-col sm:flex-row</code></li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">space-x-4</code> (가로 간격)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">반응형:</h4>
              <ul className="space-y-1 text-gray-600">
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">md:</code> (768px 이상)</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">lg:</code> (1024px 이상)</li>
                <li><code className="bg-gray-100 px-2 py-1 rounded text-xs">xl:</code> (1280px 이상)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default LayoutExamples; 