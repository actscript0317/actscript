import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, User, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isActorMenuOpen, setIsActorMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold text-primary">ActScript</span>
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-primary"
              >
                홈
              </Link>
              <Link
                to="/scripts"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary"
              >
                대본 목록
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center px-1 pt-1 text-sm font-medium text-blue-600 hover:text-blue-800 font-semibold"
              >
                💎 프리미엄 플랜
              </Link>
              
              {/* 저는 배우입니다 드롭다운 메뉴 */}
              <div className="relative">
                <button
                  onClick={() => setIsActorMenuOpen(!isActorMenuOpen)}
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary h-16"
                >
                  저는 배우입니다
                  <ChevronDown className="ml-1 h-4 w-4" />
                </button>
                {isActorMenuOpen && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <Link
                        to="/actor-profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsActorMenuOpen(false)}
                      >
                        배우 프로필
                      </Link>
                      <Link
                        to="/actor-recruitment"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsActorMenuOpen(false)}
                      >
                        배우 모집
                      </Link>
                      <Link
                        to="/model-recruitment"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsActorMenuOpen(false)}
                      >
                        모델/출연자 모집
                      </Link>
                      <Link
                        to="/actor-info"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsActorMenuOpen(false)}
                      >
                        연기자 정보방
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              {!loading && isAuthenticated && (
                <>
                  <Link
                    to="/add-script"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary"
                  >
                    대본 등록
                  </Link>
                  <Link
                    to="/ai-script"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary"
                  >
                    AI 대본
                  </Link>
                  <Link
                    to="/script-vault"
                    className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-primary"
                  >
                    내 대본함
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {loading ? (
              <div className="animate-pulse">
                <div className="w-20 h-8 bg-gray-200 rounded"></div>
              </div>
            ) : isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link
                  to="/mypage"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <User className="w-4 h-4 mr-2" />
                  마이페이지
                </Link>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary hover:text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-primary hover:text-white hover:bg-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  로그인
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            >
              <span className="sr-only">메뉴 열기</span>
              {isOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      <div className={`${isOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          <Link
            to="/"
            className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
            onClick={() => setIsOpen(false)}
          >
            홈
          </Link>
          <Link
            to="/scripts"
            className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
            onClick={() => setIsOpen(false)}
          >
            대본 목록
          </Link>
          <Link
            to="/pricing"
            className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 hover:border-blue-300 font-semibold"
            onClick={() => setIsOpen(false)}
          >
            💎 프리미엄 플랜
          </Link>
          
          {/* 저는 배우입니다 모바일 메뉴 */}
          <div className="pl-3 pr-4 py-2">
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
              저는 배우입니다
            </div>
            <div className="space-y-1">
              <Link
                to="/actor-profile"
                className="block pl-3 pr-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                onClick={() => setIsOpen(false)}
              >
                배우 프로필
              </Link>
              <Link
                to="/actor-recruitment"
                className="block pl-3 pr-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                onClick={() => setIsOpen(false)}
              >
                배우 모집
              </Link>
              <Link
                to="/model-recruitment"
                className="block pl-3 pr-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                onClick={() => setIsOpen(false)}
              >
                모델 모집
              </Link>
              <Link
                to="/actor-info"
                className="block pl-3 pr-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                onClick={() => setIsOpen(false)}
              >
                커뮤니티
              </Link>
              <Link
                to="/create-post"
                className="block pl-3 pr-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded"
                onClick={() => setIsOpen(false)}
              >
                게시글 작성
              </Link>
            </div>
          </div>

          {!loading && isAuthenticated && (
            <>
              <Link
                to="/add-script"
                className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => setIsOpen(false)}
              >
                대본 등록
              </Link>
              <Link
                to="/ai-script"
                className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => setIsOpen(false)}
              >
                AI 대본
              </Link>
              <Link
                to="/script-vault"
                className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => setIsOpen(false)}
              >
                내 대본함
              </Link>
            </>
          )}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          {loading ? (
            <div className="animate-pulse">
              <div className="w-20 h-8 bg-gray-200 rounded"></div>
            </div>
          ) : isAuthenticated ? (
            <div className="space-y-1">
              <Link
                to="/mypage"
                className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => setIsOpen(false)}
              >
                마이페이지
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setIsOpen(false);
                }}
                className="block w-full text-left pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <Link
                to="/login"
                className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => setIsOpen(false)}
              >
                로그인
              </Link>
              <Link
                to="/register"
                className="block pl-3 pr-4 py-2 border-l-4 text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300"
                onClick={() => setIsOpen(false)}
              >
                회원가입
              </Link>
            </div>
          )}
        </div>
      </div>
      
    </nav>
  );
};

export default Navbar; 