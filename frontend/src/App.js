import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import PublicRoute from './components/PublicRoute';
import Home from './pages/Home';
import AIScript from './pages/AIScript';
import GeneralScript from './pages/GeneralScript';
import AIScriptMain from './pages/AIScriptMain';
// ChildrenTheater는 AnimalSelection으로 대체됨
import AnimalSelection from './pages/ai-script/AnimalSelection';
import ScriptVault from './pages/ScriptVault';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MyPage from './pages/MyPage';
import NotFound from './pages/NotFound';
// 새로운 배우 관련 페이지들
import ActorProfile from './pages/comunity/ActorProfile';
import ActorRecruitment from './pages/comunity/ActorRecruitment';
import ModelRecruitment from './pages/ModelRecruitment';
import ActorInfo from './pages/comunity/ActorInfo';
// 새로운 게시글 관련 페이지들
import CreatePost from './pages/comunity/CreatePost';
import PostDetail from './pages/PostDetail';
// 결제 관련 페이지들
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFail from './pages/PaymentFail';
import Pricing from './pages/Pricing';
import SupabaseTest from './pages/SupabaseTest';
import FileUploadDemo from './pages/FileUploadDemo';
import { Toaster } from 'react-hot-toast';

function App() {
  // 404 페이지에서 리다이렉트된 URL 복원
  useEffect(() => {
    const restoreUrl = () => {
      const l = window.location;
      if (l.search[1] === '/' ) {
        const decoded = l.search.slice(1).split('&').map(function(s) { 
          return s.replace(/~and~/g, '&')
        }).join('?');
        
        const newUrl = l.pathname.slice(0, -1) + decoded + l.hash;
        console.log('🔄 URL 복원:', newUrl);
        
        window.history.replaceState(null, null, newUrl);
      }
    };
    
    restoreUrl();
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              {/* 공개 라우트 */}
              <Route path="/" element={<Home />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/supabase-test" element={<SupabaseTest />} />
              <Route path="/file-upload-demo" element={<FileUploadDemo />} />
              
              {/* 배우 관련 페이지 - 임시 비활성화 */}
              {/*
              <Route path="/actor-profile" element={<ActorProfile />} />
              <Route path="/actor-recruitment" element={<ActorRecruitment />} />
              <Route path="/model-recruitment" element={<ModelRecruitment />} />
              <Route path="/actor-info" element={<ActorInfo />} />
              */}
              
              {/* 게시글 관련 페이지 - 임시 비활성화 */}
              {/*
              <Route path="/posts/:id" element={<PostDetail />} />
              */}
              
              {/* 인증이 필요한 사용자만 접근 가능한 라우트 */}
              <Route path="/ai-script" element={
                <PrivateRoute>
                  <AIScriptMain />
                </PrivateRoute>
              } />
              <Route path="/ai-script/general" element={
                <PrivateRoute>
                  <GeneralScript />
                </PrivateRoute>
              } />
              <Route path="/ai-script/children" element={
                <PrivateRoute>
                  <AnimalSelection />
                </PrivateRoute>
              } />
              <Route path="/ai-script/children/animal-friends" element={
                <PrivateRoute>
                  <AnimalSelection />
                </PrivateRoute>
              } />
              <Route path="/ai-script/children/magic-adventure" element={
                <PrivateRoute>
                  <AnimalSelection />
                </PrivateRoute>
              } />
              <Route path="/ai-script/children/friendship" element={
                <PrivateRoute>
                  <AnimalSelection />
                </PrivateRoute>
              } />
              <Route path="/ai-script/children/school-life" element={
                <PrivateRoute>
                  <AnimalSelection />
                </PrivateRoute>
              } />
              <Route path="/ai-script/children/dreams-imagination" element={
                <PrivateRoute>
                  <AnimalSelection />
                </PrivateRoute>
              } />
              <Route path="/ai-script/school" element={
                <PrivateRoute>
                  <AIScript />
                </PrivateRoute>
              } />
              <Route path="/ai-script/family" element={
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
              {/* 
              <Route path="/posts/new" element={
                <PrivateRoute>
                  <CreatePost />
                </PrivateRoute>
              } />
              */}
              
              {/* 결제 관련 라우트 */}
              <Route path="/payment" element={
                <PrivateRoute>
                  <Payment />
                </PrivateRoute>
              } />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/fail" element={<PaymentFail />} />

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
              <Route path="/forgot-password" element={
                <PublicRoute>
                  <ForgotPassword />
                </PublicRoute>
              } />
              <Route path="/reset-password/:token" element={
                <PublicRoute>
                  <ResetPassword />
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