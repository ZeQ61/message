import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { FaSun, FaMoon } from 'react-icons/fa';

const ThemeToggle = () => {
  const { toggleTheme, isDarkMode } = useTheme();

  return (
    <button 
      className="theme-toggle" 
      onClick={toggleTheme} 
      aria-label={isDarkMode ? 'Gündüz moduna geç' : 'Gece moduna geç'}
      title={isDarkMode ? 'Gündüz moduna geç' : 'Gece moduna geç'}
    >
      {isDarkMode ? <FaSun /> : <FaMoon />}
    </button>
  );
};

export default ThemeToggle; 