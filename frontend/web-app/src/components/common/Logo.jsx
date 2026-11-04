import React from 'react';
import { Link } from 'react-router-dom';

export default function Logo({ size = 'md', to = '/', className = '' }) {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2.5 group focus:outline-none ${className}`}
    >
      {/* Brand Icon Mark */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-gradient-to-br from-navy-900 via-navy-800 to-brand-900 flex items-center justify-center shadow-sm group-hover:shadow transition-shadow border border-slate-700/20`}
      >
        <svg viewBox="0 0 32 32" fill="none" className="w-5/6 h-5/6">
          {/* Constellation Nodes and Routes */}
          <circle cx="10" cy="11" r="2.8" fill="#38BDF8" />
          <circle cx="22" cy="11" r="2.8" fill="#14B8A6" />
          <circle cx="16" cy="22" r="3.2" fill="#0C8DE9" />
          <path
            d="M10 11L16 22M22 11L16 22M10 11H22"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.9"
          />
        </svg>
      </div>

      {/* Brand Name Typography */}
      <div className={`font-bold tracking-tight text-navy-900 ${textSizes[size]}`}>
        <span>Logi</span>
        <span className="text-brand-600">Sphere</span>
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent-500 ml-0.5 align-baseline" />
      </div>
    </Link>
  );
}
