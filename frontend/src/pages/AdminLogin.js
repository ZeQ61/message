import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaUserShield } from 'react-icons/fa';
import { adminService } from '../services/api';
import '../styles/auth.scss';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenDebug, setTokenDebug] = useState('');
  const navigate = useNavigate();
  
  // Sayfa yüklendiğinde localStorage'ı temizle (debug için)
  useEffect(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdmin');
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await adminService.login(username, password);
      console.log('Login response:', response);
      
      // JWT token'ı localStorage'a kaydet
      localStorage.setItem('adminToken', response.data);
      localStorage.setItem('isAdmin', 'true');
      
      // Debug için token bilgisini göster
      setTokenDebug(`Token: ${response.data.substring(0, 20)}...`);
      
      // Kısa bir beklemeden sonra yönlendir (token'ın localStorage'a yazılması için)
      setTimeout(() => {
        // Admin paneline yönlendir
        navigate('/admin-panel');
      }, 500);
    } catch (err) {
      console.error('Giriş hatası:', err);
      if (err.response) {
        console.log('Hata Detayı:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });
        setError(err.response.data || 'Giriş sırasında bir hata oluştu');
      } else {
        setError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    navigate('/admin-register');
  };

  return (
    <div className="auth-container">
      <motion.div 
        className="auth-form-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h2 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <FaUserShield style={{ marginRight: '10px' }} />
          Admin Paneli
        </motion.h2>
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Yönetici Girişi
        </motion.h3>

        {error && (
          <motion.div 
            className="error-message"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            {error}
          </motion.div>
        )}
        
        {tokenDebug && (
          <div style={{padding: '10px', background: 'rgba(46, 204, 113, 0.1)', borderRadius: '8px', marginBottom: '15px', fontSize: '12px'}}>
            <strong>Debug:</strong> {tokenDebug}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <motion.div 
            className="form-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <label htmlFor="username">
              <FaUser className="input-icon" /> Kullanıcı Adı
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Admin kullanıcı adınızı girin"
              required
            />
          </motion.div>
          
          <motion.div 
            className="form-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <label htmlFor="password">
              <FaLock className="input-icon" /> Şifre
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Şifrenizi girin"
              required
            />
          </motion.div>
          
          <motion.button 
            type="submit" 
            className="btn-primary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </motion.button>
        </form>
        
        <motion.div 
          className="auth-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Admin hesabı yok mu? <button onClick={handleRegister} className="text-link">Yeni Admin Kaydı Oluştur</button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminLogin; 