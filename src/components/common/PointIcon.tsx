import React, { useState } from 'react';

interface PointIconProps {
  className?: string;
  alt?: string;
}

export const PointIcon: React.FC<PointIconProps> = ({
  className = 'w-4 h-4',
  alt = 'Poin',
}) => {
  const [srcIndex, setSrcIndex] = useState(0);

  const sources = [
    'https://media.lordicon.com/icons/wired/lineal/290-coin.svg',
    '/coin.svg',
  ];

  if (srcIndex >= sources.length) {
    return (
      <svg
        className={`${className} inline-block shrink-0`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="12" cy="12" r="10" fill="#FFC738" stroke="#B26836" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="7.5" stroke="#B26836" strokeWidth="1" fill="none" />
        <path
          d="M12 6L13.8 9.8L18 10.3L14.8 13.3L15.7 17.5L12 15.3L8.3 17.5L9.2 13.3L6 10.3L10.2 9.8L12 6Z"
          fill="#FFFBEB"
        />
      </svg>
    );
  }

  return (
    <img
      src={sources[srcIndex]}
      alt={alt}
      onError={() => setSrcIndex((prev) => prev + 1)}
      className={`${className} object-contain inline-block shrink-0 select-none`}
      loading="eager"
      referrerPolicy="no-referrer"
    />
  );
};

