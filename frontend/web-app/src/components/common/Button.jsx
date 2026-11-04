import React from 'react';
import { Link } from 'react-router-dom';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  to,
  href,
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  icon: Icon,
  iconPosition = 'right',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5 shadow-sm',
  };

  const variantStyles = {
    primary:
      'bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow focus:ring-brand-500 border border-transparent',
    secondary:
      'bg-navy-900 hover:bg-navy-800 text-white shadow-sm hover:shadow focus:ring-navy-700 border border-transparent',
    outline:
      'bg-white hover:bg-slate-50 text-slate-700 hover:text-navy-900 border border-slate-300 hover:border-slate-400 focus:ring-brand-500',
    accent:
      'bg-accent-600 hover:bg-accent-700 text-white shadow-sm hover:shadow focus:ring-accent-500 border border-transparent',
    ghost:
      'bg-transparent hover:bg-slate-100/80 text-slate-600 hover:text-navy-900 border border-transparent focus:ring-slate-300',
    subtle:
      'bg-brand-50 hover:bg-brand-100 text-brand-700 hover:text-brand-800 border border-brand-200/60 focus:ring-brand-400',
  };

  const combinedStyles = `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`;

  const content = (
    <>
      {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
      <span>{children}</span>
      {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={combinedStyles} {...props}>
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a href={href} className={combinedStyles} {...props}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={combinedStyles} {...props}>
      {content}
    </button>
  );
}
