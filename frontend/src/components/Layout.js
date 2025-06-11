import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaHome, FaUsers, FaUserFriends, FaUserCircle, FaSignOutAlt, FaCog, FaChevronRight, FaBars } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import '../styles/layout.scss';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) {
      setIsMenuOpen(false);
    }
  }, [location, isMobile]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMenuOpen(!isMenuOpen);
    } else {
      setSidebarCollapsed(!isSidebarCollapsed);
    }
  };

  const mainClass = isSidebarCollapsed ? 'main-content-expanded' : 'main-content';

  return (
    <div className="layout-container">
      {isMobile && (
        <div className="mobile-header">
          <button className="menu-toggle" onClick={toggleSidebar}>
            <FaBars />
          </button>
          <div className="app-title">Chat App</div>
          {user && (
            <div className="user-avatar-mobile">
              {user.profileImageUrl ? (
                <img src={user.profileImageUrl} alt={user.username} />
              ) : (
                <div className="default-avatar">{user.username?.charAt(0).toUpperCase()}</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''} ${isMobile && isMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <h1 className="app-title">Chat App</h1>
          {!isMobile && (
            <button className="collapse-btn" onClick={toggleSidebar}>
              <FaChevronRight />
            </button>
          )}
        </div>

        {user && (
          <>
            <div className="user-info">
              <div className="user-avatar">
                {user.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user.username} />
                ) : (
                  <div className="default-avatar">{user.username?.charAt(0).toUpperCase()}</div>
                )}
              </div>
              {!isSidebarCollapsed && (
                <div className="user-details">
                  <h3>{user.username}</h3>
                  <div className={`status ${user.online ? 'online' : 'offline'}`}>
                    {user.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                  </div>
                </div>
              )}
            </div>

            <nav className="sidebar-nav">
              <ul>
                <li>
                  <NavLink to="/home" className={({ isActive }) => isActive ? 'active' : ''}>
                    <FaHome />
                    {!isSidebarCollapsed && <span>Ana Sayfa</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/message" className={({ isActive }) => isActive ? 'active' : ''}>
                    <FaUserFriends />
                    {!isSidebarCollapsed && <span>Mesajlar</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/groups" className={({ isActive }) => isActive ? 'active' : ''}>
                    <FaUsers />
                    {!isSidebarCollapsed && <span>Gruplar</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/friends" className={({ isActive }) => isActive ? 'active' : ''}>
                    <FaUserFriends />
                    {!isSidebarCollapsed && <span>Arkadaşlar</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/profile" className={({ isActive }) => isActive ? 'active' : ''}>
                    <FaUserCircle />
                    {!isSidebarCollapsed && <span>Profil</span>}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
                    <FaCog />
                    {!isSidebarCollapsed && <span>Ayarlar</span>}
                  </NavLink>
                </li>
              </ul>
            </nav>

            <div className="sidebar-footer">
              <button className="logout-btn" onClick={handleLogout}>
                <FaSignOutAlt />
                {!isSidebarCollapsed && <span>Çıkış Yap</span>}
              </button>
            </div>
          </>
        )}
      </div>

      <main className={mainClass} style={{ width: '100%', maxWidth: '100%', flex: 1 }}>
        {isMobile && isMenuOpen && (
          <div className="mobile-overlay" onClick={toggleSidebar}></div>
        )}
        <motion.div 
          className="content-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ width: '100%', maxWidth: '100%', flex: 1 }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
