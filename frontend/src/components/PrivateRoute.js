import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

const PrivateRoute = ({ children }) => {
  const { user, checkAuth } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
          // 인증 실패 시 localStorage 초기화
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } finally {
        setIsChecking(false);
      }
    };

    verifyAuth();
  }, [checkAuth]);

  if (isChecking) {
    return <LoadingSpinner />;
  }

  if (!user) {
    // 현재 경로를 state로 전달하여 로그인 후 리다이렉트할 수 있도록 함
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute; 