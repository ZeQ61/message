import React, { createContext, useState, useEffect, useContext } from 'react';

// Tema context'ini oluştur
const ThemeContext = createContext();

// Context provider bileşeni
export const ThemeProvider = ({ children }) => {
  // localStorage'dan kayıtlı tema tercihini kontrol et, yoksa 'light' kullan
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || 'light';
  });
  
  // Tema değiştiğinde localStorage'a kaydet ve body class'ını güncelle
  useEffect(() => {
    localStorage.setItem('theme', theme);
    
    // Vücut sınıfını ayarlamadan önce geçiş animasyonunu etkinleştir
    document.body.classList.add('theme-transition');
    document.body.className = `${theme} theme-transition`;
    
    // Animasyonu temizle (geçişten sonra)
    const timer = setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 500);

    return () => clearTimeout(timer);
  }, [theme]);

  // Gece/gündüz modunu değiştiren fonksiyon
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  const value = {
    theme,
    toggleTheme,
    isDarkMode: theme === 'dark'
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook - Tema context'i kullanmak için
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme hook must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext; 