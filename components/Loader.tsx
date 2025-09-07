
import React, { useState, useEffect } from 'react';

const loadingMessages = [
  "Our AI artist is sketching your portrait...",
  "Adding elegant details and traditional attire...",
  "Perfecting the celebratory colors...",
  "Blending styles for a seamless look...",
  "Finalizing your beautiful illustration..."
];

export const Loader: React.FC = () => {
  const [message, setMessage] = useState(loadingMessages[0]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setMessage(prevMessage => {
        const currentIndex = loadingMessages.indexOf(prevMessage);
        const nextIndex = (currentIndex + 1) % loadingMessages.length;
        return loadingMessages[nextIndex];
      });
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 backdrop-blur-sm">
      <div className="w-16 h-16 border-4 border-t-4 border-gray-200 border-t-[#C19A6B] rounded-full animate-spin"></div>
      <p className="text-white text-xl mt-6 font-semibold animate-pulse">{message}</p>
    </div>
  );
};
