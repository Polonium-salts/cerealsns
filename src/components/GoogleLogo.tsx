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
    md: 'text-3xl sm:text-4xl',
    lg: 'text-5xl sm:text-6xl',
    xl: 'text-5xl sm:text-6xl font-extrabold',
  };

  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center space-x-2 select-none ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
    >
      <div className={`font-sans tracking-tight ${sizeClasses[size]} flex items-center`}>
        <span className="text-white font-black tracking-tight">Cereals</span>
        <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-slate-200 bg-clip-text text-transparent font-bold ml-0.5">
          NS
        </span>
      </div>

      {showAiBadge && (
        <span className="rounded-full bg-[#1e2432] px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-slate-700 shadow-sm">
          AI
        </span>
      )}
    </div>
  );
};

export const GoogleLogo = NexusLogo;

