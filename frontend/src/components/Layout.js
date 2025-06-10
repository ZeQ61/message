import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaComments, FaUserFriends, FaUser, FaSignOutAlt, FaBars, FaTimes, FaUsers } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import '../styles/home.scss';
import '../styles/responsive.scss';

const Layout = ({ children }) => {
  const { 
    user, 
    logout
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 767);

  // Ekran boyutu değişikliklerini takip et
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 767);
      if (window.innerWidth > 767) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sayfa değiştiğinde mobil menüyü kapat
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Kullanıcı giriş yapmamışsa boş sayfa göster
  if (!user) {
    return children;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <div className="home-container">
      <ThemeToggle />

      {/* Mobil menü toggle butonu */}
      <button 
        className="mobile-menu-toggle" 
        onClick={toggleMobileMenu}
        aria-label="Toggle mobile menu"
      >
        {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Mobil overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      <motion.aside 
        className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        initial={{ x: isMobile ? -300 : -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="sidebar-header">
          <h2>Chat App</h2>
          {isMobile && (
            <button 
              className="close-mobile-menu" 
              onClick={() => setIsMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <FaTimes />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          <ul>
            <motion.li 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className={location.pathname === '/messages' ? 'active' : ''}
            >
              <button onClick={() => navigate('/messages')}>
                <FaComments style={{ marginRight: '10px' }} /> Mesajlar
              </button>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className={location.pathname === '/groups' ? 'active' : ''}
            >
              <button onClick={() => navigate('/groups')}>
                <FaUsers style={{ marginRight: '10px' }} /> Gruplar
              </button>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className={location.pathname === '/friends' ? 'active' : ''}
            >
              <button onClick={() => navigate('/friends')}>
                <FaUserFriends style={{ marginRight: '10px' }} /> Arkadaşlar
              </button>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.3 }}
              className={location.pathname === '/profile' ? 'active' : ''}
            >
              <button onClick={() => navigate('/profile')}>
                <FaUser style={{ marginRight: '10px' }} /> Profil
              </button>
            </motion.li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {user.profileImageUrl ? (
                <img 
                  src={user.profileImageUrl.startsWith('http') ? user.profileImageUrl : `https://backend-gq5v.onrender.com${user.profileImageUrl}`} 
                  alt={`${user.username || 'Kullanıcı'} profil fotoğrafı`}
                  crossOrigin="anonymous"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.style.display = 'none';
                    e.target.parentNode.innerHTML = user && user.username ? user.username.charAt(0).toUpperCase() : '?';
                  }}
                />
              ) : (
                user && user.username ? user.username.charAt(0).toUpperCase() : '?'
              )}
            </div>
            <div className="user-name">{user.isim} {user.soyad}</div>
          </div>
          <motion.button 
            className="logout-btn" 
            onClick={logout}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaSignOutAlt style={{ marginRight: '8px' }} /> Çıkış Yap
          </motion.button>
        </div>
      </motion.aside>

      <motion.main 
        className="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        {children}
      </motion.main>
    </div>
  );
};

export default Layout;
