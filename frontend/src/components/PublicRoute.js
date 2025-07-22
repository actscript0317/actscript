import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (isAuthenticated) {
    // 이전 페이지가 있으면 그곳으로, 없으면 홈으로
    const from = location.state?.from || '/';
    return <Navigate to={from} replace />;
  }

  return children;
};

export default PublicRoute; 