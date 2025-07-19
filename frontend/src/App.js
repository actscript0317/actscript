import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  return (
    <AuthProvider>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true
        }}
      >
        <div className="min-h-screen flex flex-col bg-gray-50">
          {/* 네비게이션 */}
          <Navbar />
          
          {/* 메인 콘텐츠 */}
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/scripts" element={<Scripts />} />
              <Route path="/scripts/:id" element={<ScriptDetail />} />
              <Route path="/add-script" element={<AddScript />} />
              <Route path="/ai-script" element={<AIScript />} />
              <Route 
                path="/script-vault" 
                element={
                  <PrivateRoute>
                    <ScriptVault />
                  </PrivateRoute>
                } 
              />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route 
                path="/mypage" 
                element={
                  <PrivateRoute>
                    <MyPage />
                  </PrivateRoute>
                } 
              />
            </Routes>
          </main>
          
          {/* 푸터 */}
          <Footer />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App; 