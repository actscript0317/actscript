import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, LogIn, UserPlus, Sparkles, Archive } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { toast } from 'react-hot-toast';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, loading, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    setIsUserMenuOpen(false);
    toast.success('로그아웃되었습니다.');
    navigate('/');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setIsUserMenuOpen(false); // 모바일 메뉴 열 때 사용자 메뉴 닫기
  };

  const toggleUserMenu = () => {
    setIsUserMenuOpen(!isUserMenuOpen);
    setIsMenuOpen(false); // 사용자 메뉴 열 때 모바일 메뉴 닫기
  };

  const closeMenus = () => {
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  return (
    <>
      <nav className="bg-white shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* 로고 및 메인 메뉴 */}
            <div className="flex">
              <Link to="/" className="flex-shrink-0 flex items-center" onClick={closeMenus}>
                <span className="text-xl font-bold text-primary">ActScript</span>
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link to="/scripts" className="nav-link" onClick={closeMenus}>
                  대본 라이브러리
                </Link>
                <Link to="/ai-script" className="nav-link" onClick={closeMenus}>
                  <Sparkles className="w-4 h-4 mr-1" />
                  AI 대본 생성
                </Link>
                {user && (
                  <Link to="/script-vault" className="nav-link" onClick={closeMenus}>
                    <Archive className="w-4 h-4 mr-1" />
                    내 대본 보관함
                  </Link>
                )}
              </div>
            </div>

            {/* 사용자 메뉴 */}
            <div className="hidden sm:ml-6 sm:flex sm:items-center">
              {loading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-24 rounded"></div>
              ) : user ? (
                <div className="relative">
                  <button
                    onClick={toggleUserMenu}
                    className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md"
                  >
                    <User className="w-5 h-5" />
                    <span>{user.name}</span>
                  </button>
                  {isUserMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={closeMenus}
                      ></div>
                      <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20">
                        <div className="py-1">
                          <div className="px-4 py-2 text-sm text-gray-500 border-b">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-xs truncate">{user.email}</div>
                          </div>
                          <Link
                            to="/mypage"
                            onClick={closeMenus}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            마이페이지
                          </Link>
                          <button
                            onClick={handleLogout}
                            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="w-4 h-4 mr-2 inline-block" />
                            로그아웃
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/login" className="nav-link" onClick={closeMenus}>
                    <LogIn className="w-4 h-4 mr-1" />
                    로그인
                  </Link>
                  <Link to="/register" className="nav-link" onClick={closeMenus}>
                    <UserPlus className="w-4 h-4 mr-1" />
                    회원가입
                  </Link>
                </div>
              )}
            </div>

            {/* 모바일 메뉴 버튼 */}
            <div className="flex items-center sm:hidden">
              <button
                onClick={toggleMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-40 overflow-hidden">
            {/* 배경 오버레이 */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={closeMenus}
            ></div>
            {/* 메뉴 컨텐츠 */}
            <div className="absolute inset-y-0 right-0 max-w-xs w-full bg-white shadow-xl overflow-y-auto">
              <div className="pt-2 pb-3 space-y-1 px-4">
                <Link
                  to="/scripts"
                  onClick={closeMenus}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  대본 라이브러리
                </Link>
                <Link
                  to="/ai-script"
                  onClick={closeMenus}
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                >
                  <Sparkles className="w-4 h-4 mr-1 inline-block" />
                  AI 대본 생성
                </Link>
                {user && (
                  <Link
                    to="/script-vault"
                    onClick={closeMenus}
                    className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  >
                    <Archive className="w-4 h-4 mr-1 inline-block" />
                    내 대본 보관함
                  </Link>
                )}
              </div>
              <div className="pt-4 pb-3 border-t border-gray-200 px-4">
                {user ? (
                  <div className="space-y-1">
                    <div className="px-3 py-2 text-sm text-gray-500">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-xs truncate">{user.email}</div>
                    </div>
                    <Link
                      to="/mypage"
                      onClick={closeMenus}
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    >
                      마이페이지
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4 mr-2 inline-block" />
                      로그아웃
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Link
                      to="/login"
                      onClick={closeMenus}
                      className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                    >
                      <LogIn className="w-4 h-4 mr-1 inline-block" />
                      로그인
                    </Link>
                    <Link
                      to="/register"
                      onClick={closeMenus}
                      className="block px-3 py-2 rounded-md text-base font-medium text-primary hover:text-primary-dark hover:bg-primary-50"
                    >
                      <UserPlus className="w-4 h-4 mr-1 inline-block" />
                      회원가입
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar; 