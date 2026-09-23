'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 'md', href = '/cuadernillos' }) => {
  const sizeClasses = {
    sm: 'h-8 sm:h-9',
    md: 'h-9 sm:h-10 md:h-11',
    lg: 'h-11 sm:h-12 md:h-14',
  };

  return (
    <Link href={href} className={`inline-flex items-center group transition-transform active:scale-95 py-0.5 ${className}`}>
      <img
        src="/logo.png"
        alt="AVEND ESCALA - Plataforma Docente"
        className={`${sizeClasses[size]} w-auto object-contain drop-shadow-xs group-hover:scale-105 transition-transform duration-200`}
      />
    </Link>
  );
};
