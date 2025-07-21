import { useState, useCallback } from 'react';
import { authAPI } from '../services/api';

const useAuth = () => {
  const register = async (formData) => {
    console.log('[회원가입 요청]', formData);
    try {
      const res = await authAPI.register(formData);
      console.log('[회원가입 응답]', res.data);
      return { success: true };
    } catch (error) {
      console.log('[회원가입 실패]', error.response?.data || error.message);
      return {
        success: false,
        message: error.response?.data?.message || '회원가입 실패',
      };
    }
  };

  return {
    register
  };
};

export default useAuth; 