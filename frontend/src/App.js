import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import Home from './pages/Home';
import Scripts from './pages/Scripts';
import ScriptDetail from './pages/ScriptDetail';
import AddScript from './pages/AddScript';
import AIScript from './pages/AIScript';
import ScriptVault from './pages/ScriptVault';
import Login from './pages/Login';
import Register from './pages/Register';
import MyPage from './pages/MyPage';
import NotFound from './pages/NotFound';
import { Toaster } from 'react-hot-toast';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 초기 로딩 상태 처리
    const initializeApp = async () => {
      try {
        // 필요한 초기화 작업 수행
        await Promise.all([
          // 여기에 필요한 초기 데이터 로딩 추가
        ]);
      } catch (error) {
        console.error('앱 초기화 중 오류:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, []);

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* 공개 라우트 */}
              <Route path="/" element={<Home />} />
              <Route path="/scripts" element={<Scripts />} />
              <Route path="/scripts/:id" element={<ScriptDetail />} />
              
              {/* 인증이 필요한 사용자만 접근 가능한 라우트 */}
              <Route path="/add-script" element={
                <PrivateRoute>
                  <AddScript />
                </PrivateRoute>
              } />
              <Route path="/ai-script" element={
                <PrivateRoute>
                  <AIScript />
                </PrivateRoute>
              } />
              <Route path="/script-vault" element={
                <PrivateRoute>
                  <ScriptVault />
                </PrivateRoute>
              } />
              <Route path="/mypage" element={
                <PrivateRoute>
                  <MyPage />
                </PrivateRoute>
              } />

              {/* 비로그인 사용자만 접근 가능한 라우트 */}
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/register" element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              } />

              {/* 404 페이지 */}
              <Route path="/404" element={<NotFound />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
            </Routes>
          </main>
          <Footer />
          <Toaster 
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                duration: 3000,
                style: {
                  background: '#059669',
                },
              },
              error: {
                duration: 4000,
                style: {
                  background: '#DC2626',
                },
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 