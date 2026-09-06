import React from 'react';

interface LoginHeaderProps {
  schoolName?: string;
  classNameLabel?: string;
  academicYear?: string;
}

export const LoginHeader: React.FC<LoginHeaderProps> = ({
  schoolName = 'SD Negeri Harapan Bangsa',
}) => {
  return (
    <header className="w-full flex items-center justify-between py-3 sm:py-5 px-4 sm:px-6 lg:px-8 z-20">
      {/* School Name only */}
      <div className="flex items-center">
        <p className="text-xs sm:text-sm font-semibold text-[#EEF4FF]/80 tracking-wide">
          {schoolName}
        </p>
      </div>
    </header>
  );
};

export default LoginHeader;
