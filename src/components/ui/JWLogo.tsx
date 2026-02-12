'use client';

import { cn } from '@/lib/utils';

interface JWLogoProps {
  className?: string;
  size?: number;
  status?: 'working' | 'thinking' | 'sleeping';
}

export function JWLogo({ className, size = 40, status = 'sleeping' }: JWLogoProps) {
  const isThinking = status === 'thinking';
  const isWorking = status === 'working';
  const showWater = isThinking || isWorking;
  
  // Generate unique IDs to avoid conflicts when multiple logos are rendered
  const uniqueId = Math.random().toString(36).substr(2, 9);
  
  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background circle */}
        <circle cx="50" cy="50" r="48" className="fill-zinc-800" />
        
        {/* JW Logo paths - stylized based on the actual logo */}
        {/* Left J stroke */}
        <path
          d="M22 20 L22 55 Q22 72 35 72 Q42 72 46 68"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Center V/W shape */}
        <path
          d="M35 20 L50 58 L65 20"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Right stroke */}
        <path
          d="M58 20 L78 72"
          stroke="white"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        
        {/* Waterdrop - positioned in the V */}
        <defs>
          <clipPath id={`dropClip-${uniqueId}`}>
            <path d="M50 48 Q43 62 50 75 Q57 62 50 48 Z" />
          </clipPath>
          <linearGradient id={`waterGradient-${uniqueId}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        
        {/* Waterdrop outline */}
        <path
          d="M50 48 Q43 62 50 75 Q57 62 50 48 Z"
          stroke="white"
          strokeWidth="2"
          fill="none"
          className="opacity-60"
        />
        
        {/* Animated water fill */}
        <g clipPath={`url(#dropClip-${uniqueId})`}>
          <rect
            x="42"
            y="48"
            width="16"
            height="28"
            fill={`url(#waterGradient-${uniqueId})`}
            className={cn(
              'origin-bottom transition-transform',
              isThinking && 'animate-water-fill',
              isWorking && 'scale-y-100',
              !showWater && 'scale-y-0'
            )}
            style={{
              transformOrigin: '50px 76px',
            }}
          />
        </g>
      </svg>
    </div>
  );
}
