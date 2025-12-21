import { useEffect, useState } from 'react';
import foxerLogo from '@/assets/foxer-logo.png';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="animate-scale-in">
        <div className="relative w-40 h-40 sm:w-48 sm:h-48">
          <img 
            src={foxerLogo} 
            alt="Foxer Logo" 
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </div>
  );
}
