import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaComments, FaUserFriends, FaUser, FaSignOutAlt, FaInfoCircle, FaEdit, FaSave, FaTimes, FaBars } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import ThemeToggle from '../components/ThemeToggle';
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
    setUser,
    logout
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          
          // Sunucunun döndürdüğü URL'yi kullan
          if (uploadResponse && uploadResponse.data && uploadResponse.data.profileImageUrl) {
            profileImageUrlToUse = uploadResponse.data.profileImageUrl;
            console.log("Yeni profil resmi URL'si:", profileImageUrlToUse);
            
            // Kullanıcı nesnesini doğrudan güncelle
            setUser(prevUser => ({
              ...prevUser,
              profileImageUrl: profileImageUrlToUse
            }));
            
            showToast('Profil resmi başarıyla yüklendi.', 'success');
            
            // Resim yükleme başarılı ise, diğer güncellemelere gerek kalmayabilir
            // Ancak bio ve şifre gibi alanlar varsa onları da güncelleyeceğiz
            setIsEditing(false);
            setProfileForm(prev => ({
              ...prev,
              selectedFile: null
            }));
            setPreviewUrl(null);
            return;
          }
        } catch (error) {
          console.error("Resim yükleme hatası:", error);
          setFormError('Profil resmi yüklenirken bir hata oluştu: ' + error.message);
          return;
        } finally {
          setLoading(false);
        }
      }
      
      // Bio veya şifre güncellemesi varsa
      const updateData = {
        bio: profileForm.bio
      };

      // Şifre değiştiriliyorsa ekle
      if (profileForm.password) {
        updateData.password = profileForm.password;
      }

      // Güncelleme verisi boş değilse
      if (Object.keys(updateData).length > 0) {
        // Güncelleme işlemini gerçekleştir
        setLoading(true);
        const updateSuccess = await updateProfile(updateData);
        
        if (updateSuccess) {
          // Profil bilgilerini tekrar getir
          try {
            const profileResponse = await userService.getProfile();
            if (profileResponse && profileResponse.data) {
              // Kullanıcı bilgilerini doğrudan API yanıtından güncelle
              setUser(profileResponse.data);
              
              // Düzenleme modunu kapat
              setIsEditing(false);
              
              // Form state'ini güncellenmiş kullanıcı bilgileriyle eşleştir
              setProfileForm(prev => ({
                ...prev,
                bio: profileResponse.data.bio || '',
                password: '',
                confirmPassword: '',
                selectedFile: null
              }));
              
              setPreviewUrl(null);
              showToast('Profil bilgileriniz başarıyla güncellendi.', 'success');
            }
          } catch (refreshError) {
            console.error("Profil bilgileri yenilenirken hata:", refreshError);
            // Hata olsa bile düzenleme modunu kapatalım ve kullanıcıya başarılı olduğunu söyleyelim
            setIsEditing(false);
            showToast('Profil bilgileriniz güncellendi, ancak yeni bilgileri yüklerken hata oluştu.', 'warning');
          }
        } else {
          setFormError('Profil bilgileri güncellenemedi. Lütfen tekrar deneyin.');
        }
      }
    } catch (error) {
      console.error("Profil güncelleme hatası:", error);
      setFormError('Profil güncellenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
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
    
    // Cloudinary URL kontrolü
    if (url.includes('cloudinary.com')) {
      // Cloudinary URL'sini olduğu gibi kullan, hiçbir değişiklik yapma
      imageUrl = url;
      console.log("Cloudinary URL kullanılıyor:", imageUrl);
    }
    
    // Resim ve avatar fallback bileşenini birlikte render ediyoruz
    return (
      <div className="profile-image-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Fallback avatar, imaj yüklenemezse görünecek */}
        <div className="avatar-fallback" style={{ 
          position: 'absolute',
          top: 0,
          left: 0,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#3498db',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          zIndex: 1
        }}>
          {avatarContent}
        </div>
        
        {/* Profil resmi */}
        <img 
          src={imageUrl} 
          alt="Profil fotoğrafı"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%', 
            height: '100%', 
            objectFit: 'cover',
            zIndex: 2
          }}
          onLoad={(e) => {
            // Resim başarıyla yüklendiğinde
            console.log("Resim başarıyla yüklendi:", imageUrl);
          }}
          onError={(e) => {
            console.error("Resim yüklenemedi:", imageUrl);
            e.target.onerror = null;
            e.target.style.display = 'none'; // Sadece resmi gizle, altındaki avatar görünecek
          }} 
        />
      </div>
    );
  };

  return (
    <div className="home-container">
      <ThemeToggle />
      
      {/* Mobil menü toggle butonu */}
      <button 
        className="mobile-menu-toggle" 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle mobile menu"
      >
        <FaBars />
      </button>

      {/* Mobil overlay */}
      <div 
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      <motion.aside 
        className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="sidebar-header">
          <h2>Chat App</h2>
          {window.innerWidth <= 767 && (
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
            >
              <button onClick={() => navigate('/messages')}>
                <FaComments style={{ marginRight: '10px' }} /> Mesajlar
              </button>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <button onClick={() => navigate('/friends')}>
                <FaUserFriends style={{ marginRight: '10px' }} /> Arkadaşlar
              </button>
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.3 }}
              className="active"
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
                <div className="profile-image-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
                  {/* Fallback avatar */}
                  <div className="avatar-fallback" style={{ 
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#3498db',
                    color: 'white',
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    zIndex: 1
                  }}>
                    {user && user.username ? user.username.charAt(0).toUpperCase() : '?'}
                  </div>
                  
                  {/* Profil resmi - URL manipülasyonu yapmıyoruz */}
                  <img 
                    src={user.profileImageUrl}
                    alt={`${user.username || 'Kullanıcı'} profil fotoğrafı`}
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover',
                      zIndex: 2
                    }}
                    onLoad={() => {
                      console.log("Sidebar profil resmi başarıyla yüklendi");
                    }}
                    onError={(e) => {
                      console.error("Sidebar profil resmi yüklenemedi:", user.profileImageUrl);
                      e.target.onerror = null;
                      e.target.style.display = 'none'; // Sadece resmi gizle, altındaki avatar görünecek
                    }}
                  />
                </div>
              ) : (
                <div className="avatar-fallback" style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#3498db',
                  color: 'white',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}>
                  {user && user.username ? user.username.charAt(0).toUpperCase() : '?'}
                </div>
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
        ) : (
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
                <label htmlFor="password">Yeni Şifre (Opsiyonel)</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={profileForm.password}
                  onChange={handleInputChange}
                  placeholder="Yeni şifrenizi girin"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="confirmPassword">Şifre Tekrar</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={profileForm.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Yeni şifrenizi tekrar girin"
                />
              </div>
              
              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-cancel"
                  onClick={toggleEditMode}
                >
                  <FaTimes style={{ marginRight: '5px' }} /> İptal
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                >
                  <FaSave style={{ marginRight: '5px' }} /> Kaydet
                </button>
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
      </motion.main>
    </div>
  );
};

export default Profile;