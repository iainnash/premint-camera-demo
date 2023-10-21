import React from "react";

export function PhotoButton() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="65"
      height="65"
      fill="none"
      viewBox="0 0 65 65"
    >
      <circle
        cx="32.5"
        cy="32.5"
        r="32.5"
        fill="url(#paint0_linear_2_8)"
      ></circle>
      <path
        fill="#fff"
        fillOpacity="0.46"
        fillRule="evenodd"
        d="M50 33.266c0-4.864-3.472-8.916-8.072-9.815A7.195 7.195 0 0035.276 19h-5.109c-2.97 0-5.52 1.8-6.617 4.37-4.836.703-8.55 4.865-8.55 9.896v3.974c0 5.523 4.477 10 10 10h15c5.523 0 10-4.477 10-10v-3.974zM38.047 34.38c0 3.022-2.468 5.5-5.547 5.5-3.079 0-5.547-2.478-5.547-5.5s2.468-5.5 5.547-5.5c3.079 0 5.547 2.478 5.547 5.5zm3 0c0 4.694-3.827 8.5-8.547 8.5-4.72 0-8.547-3.806-8.547-8.5 0-4.695 3.827-8.5 8.547-8.5 4.72 0 8.547 3.805 8.547 8.5z"
        clipRule="evenodd"
      ></path>
      <defs>
        <linearGradient
          id="paint0_linear_2_8"
          x1="32.5"
          x2="32.5"
          y1="0"
          y2="65"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#D05757"></stop>
          <stop offset="1" stopColor="#5F52F3"></stop>
        </linearGradient>
      </defs>
    </svg>
  );
}
