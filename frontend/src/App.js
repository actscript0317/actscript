import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Scripts from './pages/Scripts';
import ScriptDetail from './pages/ScriptDetail';
import AddScript from './pages/AddScript';
import AIScript from './pages/AIScript';
import ScriptVault from './pages/ScriptVault';
import Login from './pages/Login';
import Register from './pages/Register';
import MyPage from './pages/MyPage';
import { Toaster } from 'react-hot-toast';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 초기 로딩 상태 처리
    const token = localStorage.getItem('token');
    if (!token) {
      setIsInitializing(false);
    } else {
      // 토큰이 있으면 잠시 후 초기화 완료
      const timer = setTimeout(() => {
        setIsInitializing(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (isInitializing) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/scripts" element={<Scripts />} />
          <Route path="/scripts/:id" element={<ScriptDetail />} />
          <Route path="/add-script" element={<PrivateRoute><AddScript /></PrivateRoute>} />
          <Route path="/ai-script" element={<PrivateRoute><AIScript /></PrivateRoute>} />
          <Route path="/script-vault" element={<PrivateRoute><ScriptVault /></PrivateRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/mypage" element={<PrivateRoute><MyPage /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </Router>
  );
}

export default App; 