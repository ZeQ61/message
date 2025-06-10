import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaComments, FaUserFriends, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import '../styles/home.scss';

const Home = () => {
  const { 
    user, 
    logout
  } = useAuth();
  
  const navigate = useNavigate();

  useEffect(() => {
    // Kullanıcı giriş yapmamışsa giriş sayfasına yönlendir
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Kullanıcı giriş yapmamışsa boş sayfa göster
  if (!user) {
    return null;
  }

  // Animasyon varyantları
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  return (
    <Layout>
        <motion.div 
          className="welcome-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.h1 variants={itemVariants}>Hoş Geldiniz, {user.isim}!</motion.h1>
          <motion.p variants={itemVariants}>Chat uygulamasına hoş geldiniz. Soldaki menüden istediğiniz sayfaya gidebilirsiniz.</motion.p>
          
          <motion.div className="feature-cards" variants={containerVariants}>
            <motion.div 
              className="feature-card" 
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/messages')}
            >
              <FaComments className="feature-icon" />
              <h3>Mesajlar</h3>
              <p>Arkadaşlarınızla mesajlaşın</p>
            </motion.div>
            
            <motion.div 
              className="feature-card" 
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/friends')}
            >
              <FaUserFriends className="feature-icon" />
              <h3>Arkadaşlar</h3>
              <p>Arkadaşlarınızı yönetin ve yeni arkadaşlar ekleyin</p>
            </motion.div>
            
            <motion.div 
              className="feature-card" 
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              onClick={() => navigate('/profile')}
            >
              <FaUser className="feature-icon" />
              <h3>Profil</h3>
              <p>Profil bilgilerinizi düzenleyin</p>
            </motion.div>
          </motion.div>
        </motion.div>
    </Layout>
  );
};

export default Home;