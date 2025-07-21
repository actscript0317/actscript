import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // 이미 로그인한 사용자는 홈페이지로 리다이렉트
  if (isAuthenticated) {
    // 이전 페이지가 있으면 그곳으로, 없으면 홈으로
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  return children;
};

export default PublicRoute; 