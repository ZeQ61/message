import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUser, FaEnvelope, FaLock, FaUserAlt, FaUserTag } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import '../styles/auth.scss';

const Register = () => {
  const [formData, setFormData] = useState({
    isim: '',
    soyad: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form doğrulama
    for (const key in formData) {
      if (!formData[key]) {
        setError('Lütfen tüm alanları doldurun.');
        return;
      }
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    
    // Şifre kontrolü
    if (formData.password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır.');
      return;
    }
    
    // RegisterRequest nesnesini oluştur
    const registerData = {
      isim: formData.isim,
      soyad: formData.soyad,
      username: formData.username,
      email: formData.email,
      password: formData.password,
    };
    
    const success = await register(registerData);
    if (success) {
      // Başarılı kayıttan sonra giriş sayfasına yönlendir
      navigate('/login');
    }
  };

  const formVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (custom) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.2 + custom * 0.1, duration: 0.5 }
    })
  };

  return (
    <div className="auth-container">
      <ThemeToggle />
      <motion.div 
        className="auth-form-container"
        variants={formVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h2 
          variants={itemVariants} 
          custom={0}
          initial="hidden"
          animate="visible"
        >
          Chat Uygulaması
        </motion.h2>
        <motion.h3
          variants={itemVariants}
          custom={1}
          initial="hidden"
          animate="visible"
        >
          Kayıt Ol
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

        <form onSubmit={handleSubmit}>
          <motion.div 
            className="form-row"
            variants={itemVariants}
            custom={2}
            initial="hidden"
            animate="visible"
          >
            <div className="form-group">
              <label htmlFor="isim">
                <FaUserAlt className="input-icon" /> İsim
              </label>
              <input
                type="text"
                id="isim"
                name="isim"
                value={formData.isim}
                onChange={handleChange}
                placeholder="İsminizi girin"
              />
            </div>

            <div className="form-group">
              <label htmlFor="soyad">
                <FaUserAlt className="input-icon" /> Soyad
              </label>
              <input
                type="text"
                id="soyad"
                name="soyad"
                value={formData.soyad}
                onChange={handleChange}
                placeholder="Soyadınızı girin"
              />
            </div>
          </motion.div>
          
          <motion.div 
            className="form-group"
            variants={itemVariants}
            custom={3}
            initial="hidden"
            animate="visible"
          >
            <label htmlFor="username">
              <FaUserTag className="input-icon" /> Kullanıcı Adı
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Kullanıcı adınızı girin"
            />
          </motion.div>
          
          <motion.div 
            className="form-group"
            variants={itemVariants}
            custom={4}
            initial="hidden"
            animate="visible"
          >
            <label htmlFor="email">
              <FaEnvelope className="input-icon" /> E-posta
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="E-posta adresinizi girin"
            />
          </motion.div>

          <motion.div 
            className="form-group"
            variants={itemVariants}
            custom={5}
            initial="hidden"
            animate="visible"
          >
            <label htmlFor="password">
              <FaLock className="input-icon" /> Şifre
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Şifrenizi girin"
            />
          </motion.div>
          
          <motion.div 
            className="form-group"
            variants={itemVariants}
            custom={6}
            initial="hidden"
            animate="visible"
          >
            <label htmlFor="confirmPassword">
              <FaLock className="input-icon" /> Şifre Tekrar
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Şifrenizi tekrar girin"
            />
          </motion.div>

          <motion.button 
            type="submit" 
            className="btn-primary"
            variants={itemVariants}
            custom={7}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            Kayıt Ol
          </motion.button>
        </form>

        <motion.div 
          className="auth-footer"
          variants={itemVariants}
          custom={8}
          initial="hidden"
          animate="visible"
        >
          Zaten hesabınız var mı? <Link to="/login">Giriş Yap</Link>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Register; 