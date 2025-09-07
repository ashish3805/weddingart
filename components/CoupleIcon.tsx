
import React from 'react';

export const CoupleIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 100"
    {...props}
  >
    <g transform="translate(0, -2)">
      <path
        fill="currentColor"
        d="M50 20 C 35 20, 25 35, 25 50 C 25 65, 35 80, 50 80 C 65 80, 75 65, 75 50 C 75 35, 65 20, 50 20 Z M 50 25 C 61 25, 70 34, 70 45 C 70 47, 68 47, 65 47 C 60 47, 58 43, 58 40 C 58 35, 54 30, 50 30 C 46 30, 42 35, 42 40 C 42 43, 40 47, 35 47 C 32 47, 30 47, 30 45 C 30 34, 39 25, 50 25 Z"
      />
      <path
        fill="currentColor"
        d="M50 10 C 55 10, 58 15, 58 20 C 58 25, 55 30, 50 30 C 45 30, 42 25, 42 20 C 42 15, 45 10, 50 10 Z"
      />
      <circle fill="currentColor" cx="50" cy="8" r="4" />
    </g>
  </svg>
);
