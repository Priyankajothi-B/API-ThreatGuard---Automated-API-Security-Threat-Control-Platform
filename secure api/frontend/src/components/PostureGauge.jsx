import React from 'react';

export default function PostureGauge({ score = 100 }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let strokeColor = '#10B981'; // Emerald
  let glowColor = 'rgba(16, 185, 129, 0.4)';
  let label = 'SECURE';

  if (score < 60) {
    strokeColor = '#EF4444'; // Crimson
    glowColor = 'rgba(239, 68, 68, 0.5)';
    label = 'CRITICAL';
  } else if (score < 80) {
    strokeColor = '#F59E0B'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.4)';
    label = 'DEGRADED';
  }

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
        {/* Background Track Circle */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#1E293B"
          strokeWidth="10"
          fill="transparent"
        />
        {/* Animated Score Progress Arc */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke={strokeColor}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          style={{
            transition: 'stroke-dashoffset 1s ease-in-out, stroke 0.5s ease',
            filter: `drop-shadow(0 0 8px ${glowColor})`
          }}
        />
      </svg>
      {/* Center Text Display */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-extrabold font-mono text-white tracking-tighter">
          {score}
        </span>
        <span className="text-[10px] font-mono font-bold tracking-widest uppercase mt-0.5" style={{ color: strokeColor }}>
          {label}
        </span>
      </div>
    </div>
  );
}
