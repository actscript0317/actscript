import React from 'react';

// 페이지 래퍼 컴포넌트
export const PageWrapper = ({ children, className = '' }) => {
  return (
    <div className={`min-h-screen ${className}`}>
      {children}
    </div>
  );
};

// 컨테이너 컴포넌트
export const Container = ({ children, size = 'default', className = '' }) => {
  const sizeClasses = {
    sm: 'max-w-4xl',
    default: 'max-w-7xl',
    lg: 'max-w-none',
  };
  
  return (
    <div className={`container ${sizeClasses[size]} ${className}`}>
      {children}
    </div>
  );
};

// 섹션 컴포넌트
export const Section = ({ children, className = '', padding = 'default' }) => {
  const paddingClasses = {
    none: '',
    sm: 'py-8',
    default: 'py-16',
    lg: 'py-24',
  };
  
  return (
    <section className={`${paddingClasses[padding]} ${className}`}>
      {children}
    </section>
  );
};

// 그리드 컴포넌트
export const Grid = ({ children, cols = 3, gap = '6', className = '' }) => {
  const colClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  };
  
  return (
    <div className={`grid ${colClasses[cols]} gap-${gap} ${className}`}>
      {children}
    </div>
  );
};

// 카드 컴포넌트
export const Card = ({ children, hover = false, className = '' }) => {
  const cardClass = hover ? 'card-hover' : 'card';
  
  return (
    <div className={`${cardClass} ${className}`}>
      {children}
    </div>
  );
};

// 플렉스 컴포넌트
export const Flex = ({ children, align = 'center', justify = 'start', className = '' }) => {
  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
  };
  
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };
  
  return (
    <div className={`flex ${alignClasses[align]} ${justifyClasses[justify]} ${className}`}>
      {children}
    </div>
  );
};

// 스페이스 컴포넌트
export const Stack = ({ children, space = '4', className = '' }) => {
  return (
    <div className={`space-y-${space} ${className}`}>
      {children}
    </div>
  );
};

export default {
  PageWrapper,
  Container,
  Section,
  Grid,
  Card,
  Flex,
  Stack,
}; 