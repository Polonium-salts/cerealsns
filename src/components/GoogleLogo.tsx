import React from 'react';

interface NexusLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showAiBadge?: boolean;
  className?: string;
  onClick?: () => void;
}

export const NexusLogo: React.FC<NexusLogoProps> = ({
  size = 'md',
  showAiBadge = true,
  className = '',
  onClick,
}) => {
  const sizeClasses = {
    sm: 'text-xl sm:text-2xl',
    md: 'text-2xl sm:text-3xl',
    lg: 'text-4xl sm:text-5xl',
    xl: 'text-5xl sm:text-6xl font-extrabold',
  };

  const iconSizes = {
    sm: 'h-7 w-7',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-20 w-20',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center space-x-3 select-none ${
        onClick ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''
      } ${className}`}
    >
      {/* Clean & Intuitive Search + AI Sparkle Logo Icon */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        {/* Soft Ambient Glow */}
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-amber-500 opacity-40 blur-md group-hover:opacity-75 transition-opacity" />
        
        {/* Modern Icon Badge Container */}
        <div className="relative w-full h-full rounded-2xl bg-[#0f172a] p-2 border border-blue-500/30 shadow-lg flex items-center justify-center">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <defs>
              <linearGradient id="lensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#60A5FA" />
                <stop offset="100%" stopColor="#6366F1" />
              </linearGradient>
              <linearGradient id="sparkleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#F59E0B" />
              </linearGradient>
            </defs>

            {/* Intuitive Search Ring & Handle */}
            <circle cx="44" cy="44" r="28" stroke="url(#lensGrad)" strokeWidth="10" strokeLinecap="round" />
            <path d="M64 64 L84 84" stroke="url(#lensGrad)" strokeWidth="10" strokeLinecap="round" />

            {/* AI Core Sparkle inside Search Lens */}
            <path
              d="M44 26 C44 35 35 44 26 44 C35 44 44 53 44 62 C44 53 53 44 62 44 C53 44 44 35 44 26 Z"
              fill="url(#sparkleGrad)"
            />
          </svg>
        </div>
      </div>

      {/* Brand Name Typography */}
      <div className={`font-sans tracking-tight ${sizeClasses[size]} flex items-center`}>
        <span className="text-white font-black tracking-tight">Cereals</span>
        <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent font-extrabold ml-1">
          NS
        </span>
      </div>

      {showAiBadge && (
        <span className="rounded-full bg-slate-900/90 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-500/30 shadow-sm flex items-center space-x-1.5 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>AI Engine</span>
        </span>
      )}
    </div>
  );
};

export const GoogleLogo = NexusLogo;



