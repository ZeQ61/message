import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaLock, FaUserShield, FaLockOpen } from 'react-icons/fa';
import { adminService } from '../services/api';
import '../styles/auth.scss';

const AdminRegister = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    // Şifre kontrolü
    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    setLoading(true);

    try {
      await adminService.register(username, password);
      // Başarılı kayıt sonrası login sayfasına yönlendir
      navigate('/admin-login', { state: { message: 'Kayıt başarılı. Lütfen giriş yapın.' } });
    } catch (err) {
      setError(err.response?.data || 'Kayıt sırasında bir hata oluştu');
      console.error('Kayıt hatası:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    navigate('/admin-login');
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
          Yeni Admin Kaydı
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

        <form onSubmit={handleRegister}>
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
              placeholder="Admin kullanıcı adınızı belirleyin"
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
              placeholder="Şifrenizi belirleyin"
              required
              minLength={6}
            />
          </motion.div>
          
          <motion.div 
            className="form-group"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <label htmlFor="passwordConfirm">
              <FaLockOpen className="input-icon" /> Şifre (Tekrar)
            </label>
            <input
              type="password"
              id="passwordConfirm"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Şifrenizi tekrar girin"
              required
              minLength={6}
            />
          </motion.div>
          
          <motion.button 
            type="submit" 
            className="btn-primary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.5 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
          >
            {loading ? 'Kaydediliyor...' : 'Kaydol'}
          </motion.button>
        </form>
        
        <motion.div 
          className="auth-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.5 }}
        >
          Zaten bir hesabınız var mı? <button onClick={handleLogin} className="text-link">Giriş Yap</button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AdminRegister; 