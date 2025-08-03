import React from 'react';
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
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import MyPage from './pages/MyPage';
import NotFound from './pages/NotFound';
// 새로운 배우 관련 페이지들
import ActorProfile from './pages/ActorProfile';
import ActorRecruitment from './pages/ActorRecruitment';
import ModelRecruitment from './pages/ModelRecruitment';
import ActorInfo from './pages/ActorInfo';
// 새로운 게시글 관련 페이지들
import CreatePost from './pages/CreatePost';
import PostDetail from './pages/PostDetail';
// 결제 관련 페이지들
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFail from './pages/PaymentFail';
import Pricing from './pages/Pricing';
import { Toaster } from 'react-hot-toast';

function App() {
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
              <Route path="/pricing" element={<Pricing />} />
              
              {/* 배우 관련 페이지 - 공개 접근 */}
              <Route path="/actor-profile" element={<ActorProfile />} />
              <Route path="/actor-recruitment" element={<ActorRecruitment />} />
              <Route path="/model-recruitment" element={<ModelRecruitment />} />
              <Route path="/actor-info" element={<ActorInfo />} />
              
              {/* 게시글 관련 페이지 */}
              <Route path="/posts/:id" element={<PostDetail />} />
              
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
              <Route path="/posts/new" element={
                <PrivateRoute>
                  <CreatePost />
                </PrivateRoute>
              } />
              
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
              <Route path="/verify-email/:token" element={
                <PublicRoute>
                  <VerifyEmail />
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