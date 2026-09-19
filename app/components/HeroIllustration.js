// app/components/HeroIllustration.js
import React from 'react';

export default function HeroIllustration({ className = "w-48 h-36" }) {
  return (
    <div className={`relative flex items-end justify-center select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 320 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-contain overflow-visible"
      >
        <defs>
          <linearGradient id="treeGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="treeGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="groundGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#fde68a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fed7aa" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="coatGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          <linearGradient id="pantsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#3730a3" />
          </linearGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Soft Background Clouds */}
        <path
          d="M30 65 Q45 45 65 55 Q85 40 105 55 Q125 50 135 65 Q135 75 30 75 Z"
          fill="#fffbeb"
          opacity="0.6"
        />
        <path
          d="M200 45 Q215 30 235 40 Q250 25 270 40 Q285 35 295 50 Q295 60 200 60 Z"
          fill="#fffbeb"
          opacity="0.5"
        />

        {/* Rolling Hills / Ground */}
        <ellipse cx="160" cy="235" rx="190" ry="45" fill="url(#groundGrad)" />
        <ellipse cx="270" cy="225" rx="90" ry="30" fill="#fde68a" opacity="0.6" />

        {/* Autumn / Warm Trees in Background */}
        <g opacity="0.85">
          {/* Tree 1 (Far right) */}
          <rect x="294" y="150" width="4" height="40" rx="2" fill="#b45309" />
          <path d="M296 115 C285 115 280 135 285 155 C290 162 302 162 307 155 C312 135 307 115 296 115 Z" fill="url(#treeGrad1)" />

          {/* Tree 2 (Middle right) */}
          <rect x="272" y="158" width="3" height="32" rx="1.5" fill="#b45309" />
          <path d="M273.5 130 C265 130 260 145 264 160 C268 166 279 166 283 160 C287 145 282 130 273.5 130 Z" fill="url(#treeGrad2)" />

          {/* Small Bush */}
          <ellipse cx="250" cy="188" rx="14" ry="9" fill="#f59e0b" opacity="0.7" />
          <ellipse cx="238" cy="191" rx="9" ry="6" fill="#fbbf24" opacity="0.8" />
        </g>

        {/* Person Walking */}
        <g filter="url(#softShadow)">
          {/* Back leg */}
          <path d="M165 140 L155 178 L146 182" stroke="#312e81" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          {/* Back shoe */}
          <ellipse cx="144" cy="183" rx="6" ry="3" fill="#dc2626" />

          {/* Front leg */}
          <path d="M172 138 L184 172 L196 179" stroke="url(#pantsGrad)" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Front shoe */}
          <ellipse cx="198" cy="180" rx="7" ry="3.5" fill="#ef4444" />

          {/* Torso / Yellow-Cream Shirt */}
          <path d="M162 90 L174 90 L178 135 L160 135 Z" fill="#fef3c7" />

          {/* Red/Coral Jacket / Scarf flowing */}
          <path
            d="M156 82 C156 82 170 78 180 84 C184 88 184 96 176 100 C166 104 154 98 156 82 Z"
            fill="url(#coatGrad)"
          />
          {/* Flowing Scarf tail */}
          <path
            d="M178 84 C190 85 204 90 208 97 C204 100 190 95 178 92 Z"
            fill="#dc2626"
          />

          {/* Head & Hair */}
          <circle cx="168" cy="68" r="8" fill="#fed7aa" />
          {/* Hair Bun / Cap */}
          <path
            d="M163 67 C162 60 172 58 175 62 C178 66 174 72 167 72 C164 72 163 70 163 67 Z"
            fill="#1e1b4b"
          />
          {/* Ponytail / Bun detail */}
          <circle cx="178" cy="62" r="4.5" fill="#1e1b4b" />

          {/* Arm holding phone */}
          <path
            d="M166 90 L152 102 L144 94"
            stroke="#fed7aa"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Phone */}
          <rect x="140" y="88" width="5" height="9" rx="1.5" fill="#3b82f6" transform="rotate(-20 140 88)" />

          {/* Other arm holding leash */}
          <path
            d="M172 92 L164 115 L155 125"
            stroke="#fed7aa"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Leash to Dog */}
          <path
            d="M155 125 Q135 155 118 165"
            stroke="#475569"
            strokeWidth="1.5"
            strokeDasharray="3 2"
            fill="none"
          />
        </g>

        {/* Small Pet Dog */}
        <g filter="url(#softShadow)">
          {/* Dog Body */}
          <ellipse cx="106" cy="174" rx="14" ry="9" fill="#ea580c" />
          {/* Dog Head */}
          <circle cx="118" cy="166" r="7" fill="#ea580c" />
          {/* Dog Ears */}
          <path d="M116 161 Q113 154 119 157 Z" fill="#9a3412" />
          <path d="M121 162 Q126 156 123 160 Z" fill="#9a3412" />
          {/* Dog Snout */}
          <ellipse cx="123" cy="168" rx="4" ry="3" fill="#f97316" />
          <circle cx="125" cy="167" r="1" fill="#431407" />
          {/* Dog Collar */}
          <rect x="114" y="169" width="4" height="3" rx="1" fill="#06b6d4" />
          {/* Dog Legs */}
          <line x1="97" y1="178" x2="95" y2="190" stroke="#c2410c" strokeWidth="3" strokeLinecap="round" />
          <line x1="103" y1="180" x2="103" y2="191" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          <line x1="112" y1="180" x2="114" y2="191" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" />
          <line x1="117" y1="178" x2="120" y2="189" stroke="#c2410c" strokeWidth="3" strokeLinecap="round" />
          {/* Dog Tail */}
          <path d="M94 172 Q86 163 92 158" stroke="#ea580c" strokeWidth="3" strokeLinecap="round" fill="none" />
        </g>
      </svg>
    </div>
  );
}
