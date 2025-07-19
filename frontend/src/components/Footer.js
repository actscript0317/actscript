import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer py-8">
      <div className="container">
        <div className="grid grid-4 gap-8">
          {/* 브랜드 섹션 */}
          <div className="lg:col-span-2">
            <h3 className="text-xl font-bold text-white mb-4">연기대본</h3>
            <p className="text-gray-300 mb-4 leading-relaxed">
              한국 최대의 연기 대본 플랫폼으로, 다양한 감정과 상황의 연기 대본을 제공합니다.
            </p>
          </div>

          {/* 빠른 링크 */}
          <div>
            <h4 className="text-lg font-medium text-white mb-4">빠른 링크</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-300 hover:text-white transition-colors">
                  홈
                </Link>
              </li>
              <li>
                <Link to="/scripts" className="text-gray-300 hover:text-white transition-colors">
                  대본 목록
                </Link>
              </li>
              <li>
                <Link to="/add-script" className="text-gray-300 hover:text-white transition-colors">
                  대본 등록
                </Link>
              </li>
            </ul>
          </div>

          {/* 고객 지원 */}
          <div>
            <h4 className="text-lg font-medium text-white mb-4">고객 지원</h4>
            <ul className="space-y-2">
              <li>
                <a href="/faq" className="text-gray-300 hover:text-white transition-colors">
                  자주 묻는 질문
                </a>
              </li>
              <li>
                <a href="/contact" className="text-gray-300 hover:text-white transition-colors">
                  문의하기
                </a>
              </li>
              <li>
                <a href="/terms" className="text-gray-300 hover:text-white transition-colors">
                  이용약관
                </a>
              </li>
              <li>
                <a href="/privacy" className="text-gray-300 hover:text-white transition-colors">
                  개인정보처리방침
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 하단 copyright */}
        <div className="border-t border-gray-700 mt-8 pt-6 text-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} 연기대본 라이브러리. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer; 