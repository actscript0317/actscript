import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, LogIn, UserPlus, Sparkles, Archive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, loading } = useAuth();

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <nav className="header">
      <div className="container">
        <div className="flex-between py-4">
          {/* 로고 */}
          <div>
            <Link 
              to="/" 
              className="text-xl font-bold text-primary"
              onClick={closeMenus}
            >
              연기대본
            </Link>
          </div>

          {/* 데스크톱 메뉴 */}
          <div className="hidden md:flex items-center space-x-1">
            <Link to="/" className="nav-link">홈</Link>
            <Link to="/scripts" className="nav-link">대본 목록</Link>
            <Link to="/add-script" className="nav-link">대본 등록</Link>
            <Link 
              to="/script-vault" 
              className="flex items-center space-x-1 nav-link hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-600"
            >
              <Archive className="w-4 h-4" />
              <span>대본함</span>
            </Link>
            <Link 
              to="/ai-script" 
              className="flex items-center space-x-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-4 h-4" />
              <span className="font-medium">나만의 대본 만들기</span>
            </Link>

            {/* 인증 상태에 따른 메뉴 */}
            {loading ? (
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            ) : isAuthenticated ? (
              <div className="relative ml-4">
                <button
                  onClick={toggleUserMenu}
                  className="flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg"
                >
                  <User className="w-4 h-4" />
                  <span className="hidden sm:block">{user?.name || user?.username}</span>
                </button>
                
                {/* 사용자 드롭다운 메뉴 */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                    <div className="px-4 py-2 text-sm text-gray-500 border-b">
                      <div className="font-medium">{user?.name || user?.username}</div>
                      <div className="text-xs">{user?.email}</div>
                    </div>
                    <Link
                      to="/mypage"
                      onClick={closeMenus}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      <User className="w-4 h-4 mr-2" />
                      마이페이지
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 ml-4">
                <Link 
                  to="/login" 
                  className="flex items-center space-x-1 text-gray-600 hover:text-primary px-3 py-2 rounded"
                >
                  <LogIn className="w-4 h-4" />
                  <span>로그인</span>
                </Link>
                <Link 
                  to="/register" 
                  className="btn btn-primary flex items-center space-x-1"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>회원가입</span>
                </Link>
              </div>
            )}
          </div>

          {/* 모바일 메뉴 버튼 */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="p-2 rounded text-gray-600 hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="space-y-2">
              <Link 
                to="/" 
                className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
                onClick={closeMenus}
              >
                홈
              </Link>
              <Link 
                to="/scripts" 
                className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
                onClick={closeMenus}
              >
                대본 목록
              </Link>
              <Link 
                to="/add-script" 
                className="block px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
                onClick={closeMenus}
              >
                대본 등록
              </Link>
              <Link 
                to="/script-vault" 
                className="flex items-center space-x-2 px-3 py-2 rounded text-gray-700 hover:bg-gray-100"
                onClick={closeMenus}
              >
                <Archive className="w-4 h-4" />
                <span>대본함</span>
              </Link>
              <Link 
                to="/ai-script" 
                className="flex items-center space-x-2 px-3 py-2 rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-md"
                onClick={closeMenus}
              >
                <Sparkles className="w-4 h-4" />
                <span>나만의 대본 만들기</span>
              </Link>

              {/* 모바일 인증 메뉴 */}
              {loading ? (
                <div className="px-3 py-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : isAuthenticated ? (
                <div className="border-t pt-2 mt-2">
                  <div className="px-3 py-2 text-sm text-gray-500">
                    <div className="font-medium">{user?.name || user?.username}</div>
                    <div className="text-xs">{user?.email}</div>
                  </div>
                  <Link
                    to="/mypage"
                    onClick={closeMenus}
                    className="w-full text-left flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded"
                  >
                    <User className="w-4 h-4 mr-2" />
                    마이페이지
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      closeMenus();
                    }}
                    className="w-full text-left flex items-center px-3 py-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    로그아웃
                  </button>
                </div>
              ) : (
                <div className="border-t pt-2 mt-2 space-y-2">
                  <Link 
                    to="/login" 
                    className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-100 rounded"
                    onClick={closeMenus}
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    로그인
                  </Link>
                  <Link 
                    to="/register" 
                    className="flex items-center px-3 py-2 bg-primary text-white rounded"
                    onClick={closeMenus}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    회원가입
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 배경 클릭 시 메뉴 닫기 */}
      {(isUserMenuOpen || isMenuOpen) && (
        <div 
          className="fixed inset-0 z-40 bg-gray-800 bg-opacity-50" 
          onClick={closeMenus}
        ></div>
      )}
    </nav>
  );
};

export default Navbar; 