import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaInfoCircle, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import Layout from '../components/Layout';
import { userService } from '../services/api';
import '../styles/home.scss';
import '../styles/responsive.scss';

const Profile = () => {
  const { 
    user, 
    updateProfile, 
    uploadProfileImage,
    loading,
    setLoading,
    setUser
  } = useAuth();
  
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState(null);
  const [profileForm, setProfileForm] = useState({
    bio: '',
    password: '',
    confirmPassword: '',
    selectedFile: null
  });
  const [formError, setFormError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    // Kullanıcı giriş yapmamışsa giriş sayfasına yönlendir
    if (!user) {
      navigate('/login');
    } else {
      // Mevcut kullanıcı bilgilerini forma doldur
      setProfileForm({
        bio: user.bio || '',
        password: '',
        confirmPassword: '',
        selectedFile: null
      });
    }
  }, [user, navigate]);

  // Sayfa yüklenirken kullanıcı bilgilerini forma yükle
  useEffect(() => {
    if (user) {
      // Mevcut kullanıcı bilgilerini forma doldur
      setProfileForm({
        bio: user.bio || '',
        password: '',
        confirmPassword: '',
        selectedFile: null
      });
      console.log("Profil verilerini forma yükledim:", user.bio);
    }
  }, [user]);
  
  // Kullanıcı giriş yapmamışsa boş sayfa göster
  if (!user) {
    return null;
  }
  
  // Toast bildirimi göster
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Toast'ı kapat
  const closeToast = () => {
    setToast(null);
  };

  // Profil düzenleme formunu göster/gizle
  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    setFormError('');
  };

  // Form alanlarını güncelle
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Dosya yükleme için onChange işleyicisi
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log("Dosya seçildi:", file.name, file.type, file.size);
      
      // Dosya türünü kontrol et
      if (!file.type.startsWith('image/')) {
        setFormError('Lütfen bir resim dosyası seçin (JPEG, PNG, GIF, vb.)');
        return;
      }
      
      // Dosya boyutunu kontrol et (10MB'tan büyük olmamalı)
      if (file.size > 10 * 1024 * 1024) {
        setFormError('Dosya boyutu 10MB\'tan küçük olmalıdır');
        return;
      }
      
      // Dosyayı state'e kaydet
      setProfileForm(prev => ({
        ...prev,
        selectedFile: file
      }));
      
      // Dosya önizlemesi için URL oluştur
      const fileReader = new FileReader();
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result);
        console.log("Önizleme oluşturuldu");
      };
      fileReader.readAsDataURL(file);
    }
  };

  // Profil güncelleme formunu gönder
  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setFormError('');

    try {
      // Şifre değiştiriliyorsa kontrol et
      if (profileForm.password || profileForm.confirmPassword) {
        if (profileForm.password !== profileForm.confirmPassword) {
          setFormError('Şifreler eşleşmiyor.');
          return;
        }
        if (profileForm.password.length < 6) {
          setFormError('Şifre en az 6 karakter olmalıdır.');
          return;
        }
      }

      let profileImageUrlToUse = user.profileImageUrl;
      
      // Dosya yükleme kontrolü
      if (profileForm.selectedFile) {
        try {
          setLoading(true);
          showToast('Profil resmi yükleniyor...', 'info');
          
          console.log("Profil resmi yükleme başlatılıyor...");
          const uploadResponse = await uploadProfileImage(profileForm.selectedFile);
          console.log("Yükleme yanıtı:", uploadResponse);
          
          if (!uploadResponse) {
            setFormError('Profil resmi yüklenirken bir hata oluştu.');
            return;
          }
          
          profileImageUrlToUse = uploadResponse;
          console.log("Profil resmi URL'si:", profileImageUrlToUse);
        } catch (error) {
          console.error("Profil resmi yükleme hatası:", error);
          setFormError('Profil resmi yüklenirken bir hata oluştu');
          return;
        } finally {
          setLoading(false);
        }
      }
      
      // Profil bilgilerini güncelle
      setLoading(true);
      showToast('Profil bilgileriniz güncelleniyor...', 'info');
      
      const updateData = {
        bio: profileForm.bio
      };
      
      // Şifre değiştiriliyorsa ekle
      if (profileForm.password) {
        updateData.password = profileForm.password;
      }
      
      // Profil resmi güncellendiyse ekle
      if (profileImageUrlToUse && profileImageUrlToUse !== user.profileImageUrl) {
        updateData.profileImageUrl = profileImageUrlToUse;
      }
      
      console.log("Profil güncelleme verileri:", updateData);
      
      const result = await updateProfile(updateData);
      
      if (result) {
        // Kullanıcı state'ini güncelle
        setUser({
          ...user,
          bio: profileForm.bio,
          profileImageUrl: profileImageUrlToUse
        });
        
        // Başarı mesajı göster
        showToast('Profil bilgileriniz başarıyla güncellendi', 'success');
        
        // Düzenleme modundan çık
        setIsEditing(false);
        
        // Form verilerini sıfırla
        setProfileForm(prev => ({
          ...prev,
          password: '',
          confirmPassword: '',
          selectedFile: null
        }));
        
        // Önizleme URL'sini temizle
        setPreviewUrl(null);
      } else {
        setFormError('Profil güncellenirken bir hata oluştu');
      }
    } catch (error) {
      console.error("Profil güncelleme hatası:", error);
      setFormError('Profil güncellenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  // Profil güncelleme işlemini iptal et
  const handleCancelEdit = () => {
    // Forma orijinal değerleri tekrar yükle
    setProfileForm({
      bio: user.bio || '',
      password: '',
      confirmPassword: '',
      selectedFile: null
    });
    
    // Önizlemeyi temizle
    setPreviewUrl(null);
    
    // Hata mesajını temizle
    setFormError('');
    
    // Düzenleme modundan çık
    setIsEditing(false);
  };

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

  const tabVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  // Profil görüntüsünü göster
  const renderProfileImage = (url) => {
    // Avatar gösterimi için kullanılacak içerik
    const avatarContent = user && user.username ? user.username.charAt(0).toUpperCase() : '?';
    
    // Profil resmi yoksa sadece avatar göster
    if (!url) {
      console.log("Profil resmi URL'si yok, avatar gösteriliyor");
      return (
        <div className="avatar-fallback" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#3498db',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          {avatarContent}
        </div>
      );
    }
    
    console.log("Profil resmi URL'si:", url);
    
    // Önizleme varsa onu göster
    if (previewUrl && isEditing) {
      return <img src={previewUrl} alt="Profil önizleme" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
    }
    
    // URL tipi kontrolü
    let imageUrl = url;
    
    // URL başlangıcını kontrol et - Backend URL'si
    if (url.includes('/user/images/')) {
      // URL tam değilse ekle (https://backend-gq5v.onrender.com)
      if (!url.startsWith('http')) {
        imageUrl = `https://backend-gq5v.onrender.com${url}`;
        console.log("Backend URL düzeltildi:", imageUrl);
      }
    }
    
    // CORS sorunu yaşamamak için
    return (
      <img 
        src={imageUrl} 
        alt="Profil resmi" 
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        crossOrigin="anonymous"
        onError={(e) => {
          console.error("Profil resmi yüklenemedi:", imageUrl);
          e.target.onerror = null;
          e.target.style.display = 'none';
          // Yerine varsayılan avatar göster
          e.target.parentNode.innerHTML = `
            <div class="avatar-fallback" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background-color: #3498db; color: white; font-size: 1.5rem; font-weight: bold;">${avatarContent}</div>
          `;
        }}
      />
    );
  };

  return (
    <Layout>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={closeToast} 
        />
      )}
      
      <motion.div 
        className="profile-container"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
      <motion.h3 variants={tabVariants}>Profil Bilgileriniz</motion.h3>
      
      {!isEditing ? (
        // Profil Görüntüleme Modu
        <motion.div className="profile-card" variants={tabVariants}>
          <div className="profile-header">
            <div className="profile-avatar">
              {renderProfileImage(user.profileImageUrl)}
            </div>
            <div className="profile-name">
              <h4>{user.isim} {user.soyad}</h4>
              <p>@{user.username}</p>
            </div>
          </div>
          
          <div className="profile-details">
            <div className="profile-detail-item">
              <span className="detail-label">E-posta:</span>
              <span className="detail-value">{user.email}</span>
            </div>
            
            <div className="profile-detail-item">
              <span className="detail-label">Bio:</span>
              <span className="detail-value">{user.bio || 'Bio bilgisi eklenmemiş.'}</span>
            </div>
            
            <div className="profile-detail-item">
              <span className="detail-label">Durum:</span>
              <div className="status-toggle">
                <span className={`status-badge ${user.online ? 'online' : 'offline'}`}>
                  <i className="status-icon" style={{ 
                    backgroundColor: user.online ? '#2ecc71' : '#7f8c8d',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    display: 'inline-block',
                    marginRight: '5px'
                  }}></i>
                  <span style={{ fontWeight: 'bold' }}>
                    {user.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                  </span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="profile-actions">
            <motion.button 
              className="btn-secondary"
              onClick={toggleEditMode}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <FaEdit style={{ marginRight: '8px' }} /> Profili Düzenle
            </motion.button>
          </div>
        </motion.div>
      ) :
        // Profil Düzenleme Modu
        <motion.div 
          className="profile-card"
          variants={tabVariants}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="edit-profile-header">
            <h4>Profil Bilgilerini Düzenle</h4>
            <button className="btn-close" onClick={toggleEditMode}>
              <FaTimes />
            </button>
          </div>
          
          {formError && (
            <div className="error-message">
              {formError}
            </div>
          )}
          
          <form onSubmit={handleSubmitProfile}>
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={profileForm.bio}
                onChange={handleInputChange}
                placeholder="Kendiniz hakkında kısa bir açıklama yazın"
                rows="3"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="profileImage">Profil Resmi Yükle</label>
              <input
                type="file"
                id="profileImage"
                name="profileImage"
                accept="image/*"
                onChange={handleFileChange}
                className="file-input"
              />
              {profileForm.selectedFile && (
                <div className="selected-file-preview">
                  <p>Seçilen dosya: {profileForm.selectedFile.name}</p>
                  {previewUrl && (
                    <img 
                      src={previewUrl} 
                      alt="Profil resmi önizleme" 
                      className="image-preview" 
                    />
                  )}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Şifre</label>
              <input
                type="password"
                id="password"
                name="password"
                value={profileForm.password}
                onChange={handleInputChange}
                placeholder="Şifrenizi değiştirmek için yeni şifre girin"
              />
              <small>Şifrenizi değiştirmek istemiyorsanız boş bırakın</small>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Şifre Tekrar</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={profileForm.confirmPassword}
                onChange={handleInputChange}
                placeholder="Şifreyi tekrar girin"
              />
            </div>
            
            <div className="form-actions">
              <motion.button 
                type="button" 
                className="btn-secondary"
                onClick={handleCancelEdit}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaTimes style={{ marginRight: '8px' }} /> İptal
              </motion.button>
              <motion.button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {loading ? (
                  <span>Yükleniyor...</span>
                ) : (
                  <>
                    <FaSave style={{ marginRight: '8px' }} /> Kaydet
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}
      
      <motion.div 
        className="profile-info-box" 
        variants={tabVariants}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="info-icon">
          <FaInfoCircle />
        </div>
        <div className="info-content">
          <h4>Durum Bilgisi</h4>
          <p>Uygulamaya giriş yaptığınızda otomatik olarak çevrimiçi, çıkış yaptığınızda çevrimdışı görünürsünüz.</p>
        </div>
      </motion.div>
    </motion.div>
    </Layout>
  );
};

export default Profile;