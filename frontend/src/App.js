import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  const { checkAuth } = useAuth();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
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
        </Routes>
      </main>
      <Footer />
      <Toaster position="top-center" />
    </Router>
  );
}

export default App; 