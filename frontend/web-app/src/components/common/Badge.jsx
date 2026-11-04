import React from 'react';

export default function Badge({ children, variant = 'brand', size = 'sm', className = '' }) {
  const sizeStyles = {
    xs: 'text-[10px] px-2 py-0.5',
    sm: 'text-xs px-2.5 py-1',
    md: 'text-sm px-3 py-1.5',
  };

  const variantStyles = {
    brand: 'bg-brand-50 text-brand-700 border border-brand-200/70',
    accent: 'bg-accent-50 text-accent-700 border border-accent-200/70',
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    navy: 'bg-navy-900 text-white border border-navy-800',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
