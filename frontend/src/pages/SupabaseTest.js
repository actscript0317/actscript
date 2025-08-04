import React, { useState, useEffect } from 'react';
import { Search, Users, Eye, Filter, RefreshCw, Database, CheckCircle, XCircle, Clock, Activity, Upload } from 'lucide-react';
import supabaseAPI from '../services/supabaseAPI';
import RealtimeDemo from '../components/RealtimeDemo';
import FileUploader from '../components/FileUploader';

const SupabaseTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState([]);
  const [emotions, setEmotions] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('tests'); // 'tests' 또는 'realtime'
  
  // 테스트 상태
  const [tests, setTests] = useState({
    connection: { status: 'pending', message: '', data: null },
    emotions: { status: 'pending', message: '', data: null },
    scripts: { status: 'pending', message: '', data: null },
    search: { status: 'pending', message: '', data: null },
    auth: { status: 'pending', message: '', data: null }
  });

  // 개별 테스트 실행 함수들
  const runConnectionTest = async () => {
    setTests(prev => ({ ...prev, connection: { status: 'loading', message: '연결 테스트 중...', data: null } }));
    
    try {
      const result = await supabaseAPI.emotions.getAll();
      if (result.success) {
        setTests(prev => ({ 
          ...prev, 
          connection: { 
            status: 'success', 
            message: 'Supabase 연결 성공!', 
            data: `${result.data.emotions.length}개 감정 데이터 확인` 
          } 
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setTests(prev => ({ 
        ...prev, 
        connection: { 
          status: 'error', 
          message: '연결 실패: ' + error.message, 
          data: null 
        } 
      }));
    }
  };

  const runEmotionsTest = async () => {
    setTests(prev => ({ ...prev, emotions: { status: 'loading', message: '감정 데이터 로딩 중...', data: null } }));
    
    try {
      const result = await supabaseAPI.emotions.getAll();
      if (result.success) {
        setEmotions(result.data.emotions);
        setTests(prev => ({ 
          ...prev, 
          emotions: { 
            status: 'success', 
            message: '감정 데이터 로드 성공!', 
            data: result.data.emotions 
          } 
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setTests(prev => ({ 
        ...prev, 
        emotions: { 
          status: 'error', 
          message: '감정 데이터 로드 실패: ' + error.message, 
          data: null 
        } 
      }));
    }
  };

  const runScriptsTest = async () => {
    setTests(prev => ({ ...prev, scripts: { status: 'loading', message: '스크립트 데이터 로딩 중...', data: null } }));
    
    try {
      const result = await supabaseAPI.scripts.getAll({ page: 1, limit: 5 });
      if (result.success) {
        setScripts(result.data.scripts);
        setTests(prev => ({ 
          ...prev, 
          scripts: { 
            status: 'success', 
            message: '스크립트 데이터 로드 성공!', 
            data: result.data.scripts 
          } 
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setTests(prev => ({ 
        ...prev, 
        scripts: { 
          status: 'error', 
          message: '스크립트 데이터 로드 실패: ' + error.message, 
          data: null 
        } 
      }));
    }
  };

  const runSearchTest = async () => {
    if (!searchTerm.trim()) {
      alert('검색어를 입력해주세요.');
      return;
    }

    setTests(prev => ({ ...prev, search: { status: 'loading', message: '검색 테스트 중...', data: null } }));
    
    try {
      const result = await supabaseAPI.scripts.getAll({ 
        page: 1, 
        limit: 10, 
        search: searchTerm 
      });
      
      if (result.success) {
        setTests(prev => ({ 
          ...prev, 
          search: { 
            status: 'success', 
            message: `"${searchTerm}" 검색 완료!`, 
            data: result.data.scripts 
          } 
        }));
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setTests(prev => ({ 
        ...prev, 
        search: { 
          status: 'error', 
          message: '검색 실패: ' + error.message, 
          data: null 
        } 
      }));
    }
  };

  const runAuthTest = async () => {
    setTests(prev => ({ ...prev, auth: { status: 'loading', message: '인증 상태 확인 중...', data: null } }));
    
    try {
      const result = await supabaseAPI.auth.checkAuthStatus();
      if (result.success) {
        if (result.isAuthenticated) {
          const userResult = await supabaseAPI.auth.getCurrentUser();
          if (userResult.success) {
            setCurrentUser(userResult.data.user);
            setTests(prev => ({ 
              ...prev, 
              auth: { 
                status: 'success', 
                message: '로그인 상태 확인됨!', 
                data: userResult.data.user 
              } 
            }));
          } else {
            throw new Error(userResult.error);
          }
        } else {
          setTests(prev => ({ 
            ...prev, 
            auth: { 
              status: 'success', 
              message: '로그인되지 않음 (정상)', 
              data: null 
            } 
          }));
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      setTests(prev => ({ 
        ...prev, 
        auth: { 
          status: 'error', 
          message: '인증 상태 확인 실패: ' + error.message, 
          data: null 
        } 
      }));
    }
  };

  // 전체 테스트 실행
  const runAllTests = async () => {
    setLoading(true);
    
    await runConnectionTest();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await runEmotionsTest();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await runScriptsTest();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await runAuthTest();
    
    setLoading(false);
  };

  // 페이지 로드 시 자동 테스트
  useEffect(() => {
    runAllTests();
  }, []);

  // 상태별 아이콘 반환
  const getStatusIcon = (status) => {
    switch (status) {
      case 'loading':
        return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  // 상태별 색상 반환
  const getStatusColor = (status) => {
    switch (status) {
      case 'loading':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Database className="w-8 h-8 text-blue-600" />
                Supabase 연동 테스트
              </h1>
              <p className="text-gray-600 mt-2">
                MongoDB에서 Supabase로의 마이그레이션 테스트 페이지
              </p>
            </div>
            <button
              onClick={runAllTests}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? '테스트 중...' : '전체 테스트 재실행'}
            </button>
          </div>

          {/* 탭 메뉴 */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('tests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Database className="w-4 h-4 inline mr-2" />
                API 테스트
              </button>
              <button
                onClick={() => setActiveTab('realtime')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'realtime'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-2" />
                실시간 기능
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'upload'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                파일 업로드
              </button>
            </nav>
          </div>
        </div>

        {/* 컨텐츠 */}
        {activeTab === 'tests' ? (
          <>
            {/* 테스트 상태 카드들 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* 연결 테스트 */}
          <div className={`p-6 rounded-lg border-2 ${getStatusColor(tests.connection.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">연결 테스트</h3>
              {getStatusIcon(tests.connection.status)}
            </div>
            <p className="text-sm text-gray-600 mb-3">{tests.connection.message}</p>
            {tests.connection.data && (
              <p className="text-xs text-gray-500">{tests.connection.data}</p>
            )}
            <button
              onClick={runConnectionTest}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              다시 테스트
            </button>
          </div>

          {/* 감정 데이터 테스트 */}
          <div className={`p-6 rounded-lg border-2 ${getStatusColor(tests.emotions.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">감정 데이터</h3>
              {getStatusIcon(tests.emotions.status)}
            </div>
            <p className="text-sm text-gray-600 mb-3">{tests.emotions.message}</p>
            {tests.emotions.data && (
              <div className="flex flex-wrap gap-1">
                {tests.emotions.data.slice(0, 3).map((emotion, index) => (
                  <span key={index} className="text-xs bg-white px-2 py-1 rounded">
                    {emotion.name}
                  </span>
                ))}
                {tests.emotions.data.length > 3 && (
                  <span className="text-xs text-gray-500">+{tests.emotions.data.length - 3}개</span>
                )}
              </div>
            )}
            <button
              onClick={runEmotionsTest}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              다시 테스트
            </button>
          </div>

          {/* 스크립트 데이터 테스트 */}
          <div className={`p-6 rounded-lg border-2 ${getStatusColor(tests.scripts.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">스크립트 데이터</h3>
              {getStatusIcon(tests.scripts.status)}
            </div>
            <p className="text-sm text-gray-600 mb-3">{tests.scripts.message}</p>
            {tests.scripts.data && (
              <p className="text-xs text-gray-500">
                {tests.scripts.data.length}개 스크립트 로드됨
              </p>
            )}
            <button
              onClick={runScriptsTest}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              다시 테스트
            </button>
          </div>

          {/* 검색 테스트 */}
          <div className={`p-6 rounded-lg border-2 ${getStatusColor(tests.search.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">검색 기능</h3>
              {getStatusIcon(tests.search.status)}
            </div>
            <div className="mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="검색어 입력..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <p className="text-sm text-gray-600 mb-3">{tests.search.message}</p>
            {tests.search.data && (
              <p className="text-xs text-gray-500">
                {tests.search.data.length}개 검색 결과
              </p>
            )}
            <button
              onClick={runSearchTest}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              검색 테스트
            </button>
          </div>

          {/* 인증 테스트 */}
          <div className={`p-6 rounded-lg border-2 ${getStatusColor(tests.auth.status)}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">인증 상태</h3>
              {getStatusIcon(tests.auth.status)}
            </div>
            <p className="text-sm text-gray-600 mb-3">{tests.auth.message}</p>
            {tests.auth.data && (
              <div className="text-xs text-gray-500">
                <p>사용자: {tests.auth.data.username}</p>
                <p>이메일: {tests.auth.data.email}</p>
              </div>
            )}
            <button
              onClick={runAuthTest}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              다시 확인
            </button>
          </div>
        </div>

        {/* 데이터 미리보기 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 감정 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>😊</span> 감정 목록
            </h3>
            {emotions.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {emotions.map((emotion, index) => (
                  <div key={index} className="bg-gray-50 px-3 py-2 rounded text-sm">
                    {emotion.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">감정 데이터를 불러오는 중...</p>
            )}
          </div>

          {/* 스크립트 목록 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <span>📝</span> 최신 스크립트
            </h3>
            {scripts.length > 0 ? (
              <div className="space-y-3">
                {scripts.map((script, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <h4 className="font-medium text-sm">{script.title}</h4>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {script.character_count}인
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {script.views}
                      </span>
                      <span>{script.mood}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">스크립트 데이터를 불러오는 중...</p>
            )}
          </div>
        </div>

        {/* 검색 결과 */}
        {tests.search.data && tests.search.data.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Search className="w-5 h-5" />
              검색 결과: "{searchTerm}"
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tests.search.data.map((script, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">{script.title}</h4>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {script.situation}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{script.character_count}인</span>
                    <span>{script.mood}</span>
                    <span>{script.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
            </>
        ) : activeTab === 'realtime' ? (
          /* 실시간 기능 데모 */
          <RealtimeDemo />
        ) : (
          /* 파일 업로드 기능 데모 */
          <div className="max-w-4xl mx-auto">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                <Upload className="w-6 h-6 text-blue-500" />
                파일 업로드 테스트
              </h2>
              <p className="text-gray-600">
                Supabase Storage를 활용한 파일 업로드 기능을 테스트해보세요.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* 프로필 사진 업로드 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">프로필 사진</h3>
                <FileUploader
                  type="avatar"
                  userId="test_user_123"
                  onUploadComplete={(file) => {
                    console.log('프로필 사진 업로드 완료:', file);
                  }}
                  onUploadError={(error) => {
                    console.error('프로필 사진 업로드 실패:', error);
                  }}
                />
              </div>

              {/* 포트폴리오 이미지 업로드 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">포트폴리오</h3>
                <FileUploader
                  type="portfolio"
                  userId="test_user_123"
                  multiple={true}
                  onUploadComplete={(files) => {
                    console.log('포트폴리오 업로드 완료:', files);
                  }}
                  onUploadError={(error) => {
                    console.error('포트폴리오 업로드 실패:', error);
                  }}
                />
              </div>

              {/* 데모 릴 업로드 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">데모 릴</h3>
                <FileUploader
                  type="demo-reel"
                  userId="test_user_123"
                  onUploadComplete={(file) => {
                    console.log('데모 릴 업로드 완료:', file);
                  }}
                  onUploadError={(error) => {
                    console.error('데모 릴 업로드 실패:', error);
                  }}
                />
              </div>

              {/* 문서 업로드 */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">문서</h3>
                <FileUploader
                  type="document"
                  userId="test_user_123"
                  multiple={true}
                  onUploadComplete={(files) => {
                    console.log('문서 업로드 완료:', files);
                  }}
                  onUploadError={(error) => {
                    console.error('문서 업로드 실패:', error);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupabaseTest;