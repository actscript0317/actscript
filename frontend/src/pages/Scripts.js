import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Users, Eye, Filter, ChevronDown, Bookmark, X, Heart } from 'lucide-react';
import { scriptAPI } from '../services/api';
import { filterOptions } from '../data/dummyData';

const Scripts = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filteredScripts, setFilteredScripts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  // 필터 상태
  const [filters, setFilters] = useState({
    gender: '',
    characterCount: '',
    mood: '',
    duration: '',
    ageGroup: '',
    purpose: '',
    scriptType: ''
  });

  // 정렬 상태
  const [sortBy, setSortBy] = useState('newest');

  // URL 파라미터에서 초기 필터 상태 설정
  useEffect(() => {
    const initialFilters = {
      gender: searchParams.get('gender') || '',
      characterCount: searchParams.get('characters') || '',
      mood: searchParams.get('mood') || '',
      duration: searchParams.get('duration') || '',
      ageGroup: searchParams.get('ageGroup') || '',
      purpose: searchParams.get('purpose') || '',
      scriptType: searchParams.get('scriptType') || ''
    };
    
    const initialSearch = searchParams.get('search') || '';
    const initialSort = searchParams.get('sort') || 'newest';
    
    setFilters(initialFilters);
    setSearchTerm(initialSearch);
    setSortBy(initialSort);
  }, [searchParams]);

  useEffect(() => {
    const fetchScripts = async () => {
    try {
      setLoading(true);
        
      // API 파라미터 구성
      const params = new URLSearchParams();
        
      if (searchTerm) params.append('search', searchTerm);
      if (filters.gender) params.append('gender', filters.gender);
      if (filters.characterCount) params.append('characters', filters.characterCount);
      if (filters.mood) params.append('mood', filters.mood);
      if (filters.duration) params.append('duration', filters.duration);
      if (filters.ageGroup) params.append('ageGroup', filters.ageGroup);
      if (filters.purpose) params.append('purpose', filters.purpose);
      if (filters.scriptType) params.append('scriptType', filters.scriptType);
      if (sortBy) params.append('sort', sortBy);

      console.log('Fetching scripts with params:', Object.fromEntries(params));
      const response = await scriptAPI.getAll(params);
      console.log('API Response:', response);

      // response.data가 배열인 경우와 객체인 경우 모두 처리
      const scripts = Array.isArray(response.data) ? response.data : 
                     response.data.scripts ? response.data.scripts : [];
      
      console.log('Processed scripts:', scripts);
      setFilteredScripts(scripts);
        
    } catch (error) {
      console.error('대본 목록 조회 실패:', error);
      setFilteredScripts([]);
    } finally {
      setLoading(false);
    }
    };

    fetchScripts();
  }, [searchTerm, filters, sortBy]);

  const updateURL = (newFilters, newSearchTerm, newSortBy) => {
    const params = new URLSearchParams();
    
    if (newSearchTerm) params.set('search', newSearchTerm);
    if (newFilters.gender) params.set('gender', newFilters.gender);
    if (newFilters.characterCount) params.set('characters', newFilters.characterCount);
    if (newFilters.mood) params.set('mood', newFilters.mood);
    if (newFilters.duration) params.set('duration', newFilters.duration);
    if (newFilters.ageGroup) params.set('ageGroup', newFilters.ageGroup);
    if (newFilters.purpose) params.set('purpose', newFilters.purpose);
    if (newFilters.scriptType) params.set('scriptType', newFilters.scriptType);
    if (newSortBy && newSortBy !== 'newest') params.set('sort', newSortBy);
    
    setSearchParams(params);
  };

  const handleFilterChange = (filterType, value) => {
    const newFilters = {
      ...filters,
      [filterType]: value
    };
    setFilters(newFilters);
    updateURL(newFilters, searchTerm, sortBy);
  };

  const removeFilter = (filterType) => {
    const newFilters = {
      ...filters,
      [filterType]: ''
    };
    setFilters(newFilters);
    updateURL(newFilters, searchTerm, sortBy);
  };

  const clearAllFilters = () => {
    const newFilters = {
      gender: '',
      characterCount: '',
      mood: '',
      duration: '',
      ageGroup: '',
      purpose: '',
      scriptType: ''
    };
    setFilters(newFilters);
    setSearchTerm('');
    setSortBy('newest');
    updateURL(newFilters, '', 'newest');
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    updateURL(filters, value, sortBy);
  };

  const handleSortChange = (value) => {
    setSortBy(value);
    updateURL(filters, searchTerm, value);
  };

  // 활성 필터 개수 계산
  const activeFiltersCount = Object.values(filters).filter(value => value !== '').length + (searchTerm ? 1 : 0);

  // 활성 필터 태그 생성
  const getActiveFilterTags = () => {
    const tags = [];

    if (searchTerm) {
      tags.push({
        type: 'search',
        label: `검색: ${searchTerm}`,
        onRemove: () => setSearchTerm('')
      });
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        const option = filterOptions[key]?.find(opt => opt.value === value);
        if (option) {
          tags.push({
            type: key,
            label: option.label,
            onRemove: () => removeFilter(key)
          });
        }
      }
    });

    return tags;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">대본 라이브러리</h1>
          <p className="text-gray-600">원하는 조건으로 대본을 찾아보세요</p>
        </div>

        {/* 검색 및 필터 토글 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            {/* 검색바 */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="제목, 상황, 감정, 작가명으로 검색..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-6 py-3 rounded-lg border transition-colors ${
                  !showFilters 
                    ? 'bg-emerald-500 text-white border-emerald-500' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-5 h-5 mr-2" />
                {showFilters ? '필터 접기' : '필터 펼치기'} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* 필터 패널 */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
                  {/* 성별 필터 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
                    <select
                      value={filters.gender}
                      onChange={(e) => handleFilterChange('gender', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {filterOptions.gender.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 인원수 필터 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">인원수</label>
                    <select
                      value={filters.characterCount}
                      onChange={(e) => handleFilterChange('characterCount', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {filterOptions.characterCount.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 분위기/장르 필터 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">분위기/장르</label>
                    <select
                      value={filters.mood}
                      onChange={(e) => handleFilterChange('mood', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {filterOptions.mood.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 길이 필터 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">길이</label>
                    <select
                      value={filters.duration}
                      onChange={(e) => handleFilterChange('duration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {filterOptions.duration.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 연령대 필터 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">연령대</label>
                    <select
                      value={filters.ageGroup}
                      onChange={(e) => handleFilterChange('ageGroup', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {filterOptions.ageGroup.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 사용 목적 필터 */}
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">사용 목적</label>
                <select
                      value={filters.purpose}
                      onChange={(e) => handleFilterChange('purpose', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {filterOptions.purpose.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                    </option>
                  ))}
                </select>
              </div>

                  {/* 대본 형태 필터 */}
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">대본 형태</label>
                <select
                      value={filters.scriptType}
                      onChange={(e) => handleFilterChange('scriptType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      {filterOptions.scriptType.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 정렬 */}
              <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">정렬</label>
                <select
                      value={sortBy}
                      onChange={(e) => handleSortChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="newest">최신순</option>
                  <option value="popular">인기순</option>
                      <option value="title">제목순</option>
                  <option value="oldest">등록순</option>
                </select>
              </div>
            </div>

                {/* 필터 초기화 버튼 */}
                {activeFiltersCount > 0 && (
                  <div className="flex justify-end">
              <button
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                      모든 필터 초기화
              </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 활성 필터 태그 */}
        {getActiveFilterTags().length > 0 && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              {getActiveFilterTags().map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-emerald-100 text-emerald-800 border border-emerald-200"
                >
                  {tag.label}
                  <button
                    onClick={tag.onRemove}
                    className="ml-2 hover:text-emerald-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
              </span>
              ))}
            </div>
          </div>
        )}

        {/* 결과 정보 */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            총 <span className="font-semibold text-emerald-600">{filteredScripts.length}</span>개의 대본
          </p>
        </div>

        {/* 대본 목록 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">로딩 중...</p>
          </div>
        ) : filteredScripts && filteredScripts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {filteredScripts.map((script) => {
              console.log('Rendering script:', script);
              return <ScriptCard key={script._id} script={script} />;
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="mb-4">
              <Search className="w-16 h-16 text-gray-300 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-gray-600 mb-4">
              다른 조건으로 검색해보시거나 필터를 조정해보세요
            </p>
            {Object.values(filters).some(Boolean) && (
              <button
                onClick={() => {
                  setFilters({
                    gender: '',
                    characterCount: '',
                    mood: '',
                    duration: '',
                    ageGroup: '',
                    purpose: '',
                    scriptType: ''
                  });
                  setSearchTerm('');
                  setSortBy('newest');
                }}
                className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                모든 필터 초기화
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 대본 카드 컴포넌트
const ScriptCard = ({ script }) => {
  if (!script) {
    console.warn('Script object is undefined or null');
    return null;
  }

  console.log('ScriptCard rendering with script:', script);

  return (
    <Link
      to={`/scripts/${script._id}`}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all hover:shadow-md hover:border-emerald-200 h-full flex flex-col"
    >
      {/* 헤더 */}
      <div className="mb-4">
        <h3 className="text-xl font-semibold mb-2 text-gray-800 overflow-hidden">
          <span className="block truncate">{script.title || '제목 없음'}</span>
        </h3>
        <p className="text-gray-600 text-sm overflow-hidden h-10">
          <span className="block truncate">{script.situation || '상황 설명 없음'}</span>
        </p>
      </div>

      {/* 메타 정보 */}
      <div className="mb-4 space-y-2">
        <div className="flex flex-wrap gap-2">
          {script.scriptType && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {script.scriptType}
            </span>
          )}
          {script.mood && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {script.mood}
            </span>
          )}
        </div>
        
        <div className="flex items-center text-sm text-gray-600 flex-wrap gap-4">
          {script.characterCount && (
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{script.characterCount}명</span>
            </div>
          )}
        
          {typeof script.views === 'number' && (
            <div className="flex items-center">
              <Eye className="w-4 h-4 mr-1" />
              <span>{script.views}</span>
            </div>
          )}
          
          <div className="flex items-center">
            <Heart className="w-4 h-4 mr-1 text-red-500" />
            <span>{script.likes || 0}</span>
          </div>
          
          <div className="flex items-center">
            <Bookmark className="w-4 h-4 mr-1 text-emerald-500" />
            <span>{script.saves || 0}</span>
          </div>
        </div>
      </div>

      {/* 태그 */}
      {script.emotions && script.emotions.length > 0 && (
        <div className="mt-auto pt-4 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {script.emotions.map((emotion, index) => (
              <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                #{emotion}
              </span>
            ))}
          </div>
        </div>
      )}
    </Link>
  );
};

export default Scripts; 