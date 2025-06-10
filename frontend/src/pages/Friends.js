import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaSearch, FaCheck, FaTimes, FaPlus, FaTrash, FaClock, FaUserPlus, FaUserClock, FaEnvelope, FaInfoCircle, FaUserFriends } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import Layout from '../components/Layout';

const Friends = () => {
  const { 
    user, 
    friendsList,
    searchResults,
    friendLoading,
    friendError,
    fetchFriendsList,
    searchUsers,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    removeFriend,
    logout
  } = useAuth();
  
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  
  // Arkadaş arama state'i
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  useEffect(() => {
    // Kullanıcı giriş yapmamışsa giriş sayfasına yönlendir
    if (!user) {
      navigate('/login');
    } else {
      // Arkadaş listesini getir
      fetchFriendsList();
    }
  }, [user, navigate]);
  
  // Arama sorgusu değiştiğinde
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (searchQuery.trim().length >= 2) {
      const timer = setTimeout(() => {
        searchUsers(searchQuery);
      }, 500);
      
      setSearchTimeout(timer);
    }
    
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);
  
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
  
  // Arama input'unu güncelle
  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  // Arkadaşlık isteği gönder
  const handleSendFriendRequest = async (receiverId) => {
    const success = await sendFriendRequest(receiverId);
    if (success) {
      showToast('Arkadaşlık isteği başarıyla gönderildi.', 'success');
      setSearchQuery(''); // Aramaları temizle
    } else {
      showToast('Arkadaşlık isteği gönderilirken bir hata oluştu.', 'error');
    }
  };
  
  // Arkadaşlık isteğini kabul et
  const handleAcceptFriendRequest = async (friendshipId) => {
    const success = await acceptFriendRequest(friendshipId);
    if (success) {
      showToast('Arkadaşlık isteği kabul edildi.', 'success');
    } else {
      showToast('Arkadaşlık isteği kabul edilirken bir hata oluştu.', 'error');
    }
  };
  
  // Arkadaşlık isteğini reddet
  const handleRejectFriendRequest = async (friendshipId) => {
    const success = await rejectFriendRequest(friendshipId);
    if (success) {
      showToast('Arkadaşlık isteği reddedildi.', 'success');
    } else {
      showToast('Arkadaşlık isteği reddedilirken bir hata oluştu.', 'error');
    }
  };
  
  // Arkadaşlık isteğini iptal et
  const handleCancelFriendRequest = async (friendshipId) => {
    const success = await cancelFriendRequest(friendshipId);
    if (success) {
      showToast('Arkadaşlık isteği iptal edildi.', 'success');
    } else {
      showToast('Arkadaşlık isteği iptal edilirken bir hata oluştu.', 'error');
    }
  };
  
  // Arkadaşı sil
  const handleRemoveFriend = async (friendshipId) => {
    const success = await removeFriend(friendshipId);
    if (success) {
      showToast('Arkadaşlık başarıyla silindi.', 'success');
    } else {
      showToast('Arkadaş silinirken bir hata oluştu.', 'error');
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
          className="friends-container"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
        <motion.h3 variants={tabVariants}>Arkadaşlarınız</motion.h3>
        
        <motion.div 
          className="search-box" 
          variants={tabVariants}
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input 
              type="text" 
              placeholder="Kullanıcı adı, isim veya email ile arkadaş arayın..." 
              value={searchQuery}
              onChange={handleSearchInputChange}
            />
            {searchQuery && (
              <motion.button 
                className="clear-search" 
                onClick={() => setSearchQuery('')}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <FaTimes />
              </motion.button>
            )}
          </div>
          <motion.div 
            className="search-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <FaInfoCircle style={{ marginRight: '8px', color: '#3498db' }} />
            <span>En az 2 karakter girerek kullanıcı araması yapabilirsiniz</span>
          </motion.div>
        </motion.div>
        
        {/* Arama sonuçları */}
        {searchQuery.trim().length >= 2 && searchResults.length > 0 && (
          <motion.div 
            className="search-results"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="search-results-header">
              <h4>Arama Sonuçları</h4>
              <span className="result-count">{searchResults.length} kullanıcı bulundu</span>
            </div>
            <div className="user-list">
              {searchResults.map(user => (
                <motion.div 
                  key={user.id} 
                  className="user-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  whileHover={{ 
                    scale: 1.02,
                    boxShadow: "0 8px 20px rgba(0, 0, 0, 0.1)" 
                  }}
                >
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.profileImageUrl ? (
                        <img src={user.profileImageUrl} alt={user.username || 'Kullanıcı'} />
                      ) : (
                        <span>{user && user.username ? user.username.charAt(0).toUpperCase() : '?'}</span>
                      )}
                      {user.online && <span className="online-indicator" title="Çevrimiçi"></span>}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{user.isim} {user.soyad}</span>
                      <span className="user-username">@{user.username}</span>
                      <span className={`user-status ${user.online ? 'online' : 'offline'}`}>
                        {user.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Arkadaşlık durumuna göre butonlar */}
                  {user.isExistingFriend ? (
                    <span className="friendship-status">Arkadaşsınız</span>
                  ) : user.hasSentRequest ? (
                    <motion.button 
                      className="btn-pending-request"
                      disabled={friendLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FaUserClock style={{ marginRight: '5px' }} /> İstek Gönderildi
                    </motion.button>
                  ) : user.hasReceivedRequest ? (
                    <div className="friend-request-actions">
                      <motion.button 
                        className="btn-accept-small"
                        onClick={() => {
                          // İsteğin ID'sini bul
                          const requestId = friendsList.receivedRequests.find(
                            req => req.requester && req.requester.id === user.id
                          )?.id;
                          
                          if (requestId) {
                            handleAcceptFriendRequest(requestId);
                          }
                        }}
                        disabled={friendLoading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FaCheck /> Kabul Et
                      </motion.button>
                      <motion.button 
                        className="btn-reject-small"
                        onClick={() => {
                          // İsteğin ID'sini bul
                          const requestId = friendsList.receivedRequests.find(
                            req => req.requester && req.requester.id === user.id
                          )?.id;
                          
                          if (requestId) {
                            handleRejectFriendRequest(requestId);
                          }
                        }}
                        disabled={friendLoading}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <FaTimes /> Reddet
                      </motion.button>
                    </div>
                  ) : (
                    <motion.button 
                      className="btn-add-friend"
                      onClick={() => handleSendFriendRequest(user.id)}
                      disabled={friendLoading}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <FaUserPlus style={{ marginRight: '5px' }} /> Arkadaş Ekle
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Arama sonucu yoksa */}
        {searchQuery.trim().length >= 2 && searchResults.length === 0 && !friendLoading && (
          <motion.div 
            className="no-results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <FaSearch style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.3 }} />
            <h4>Sonuç Bulunamadı</h4>
            <p>"{searchQuery}" araması için hiçbir kullanıcı bulunamadı.</p>
            <p className="search-suggestion">Farklı bir arama terimi denemeyi veya kullanıcının tam adını yazmayı deneyebilirsiniz.</p>
          </motion.div>
        )}
        
        {/* Arama yükleniyor */}
        {searchQuery.trim().length >= 2 && friendLoading && (
          <motion.div 
            className="search-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="loading-spinner"></div>
            <p>Kullanıcılar aranıyor...</p>
          </motion.div>
        )}
        
        {/* Arkadaş Listesi */}
        {friendsList.friends && (
          <motion.div className="friend-list" variants={tabVariants}>
            <h4>Arkadaşlarınız</h4>
            
            {friendsList.friends.length > 0 ? (
              <div className="friends-grid">
                {friendsList.friends.map(friendship => {
                  // Backend'den gelen friend alanını kullan
                  const friend = friendship.friend;
                  
                  return (
                    <motion.div 
                      key={friendship.id} 
                      className="friend-item"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="friend-avatar">
                        {friend.profileImageUrl ? (
                          <img 
                            src={friend.profileImageUrl.startsWith('http') ? friend.profileImageUrl : `https://backend-gq5v.onrender.com${friend.profileImageUrl}`} 
                            alt={`${friend.username} profil fotoğrafı`}
                            crossOrigin="anonymous"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                              e.target.parentNode.innerHTML = friend && friend.username ? friend.username.charAt(0).toUpperCase() : '?';
                            }}
                          />
                        ) : (
                          <span>{friend && friend.username ? friend.username.charAt(0).toUpperCase() : '?'}</span>
                        )}
                        {friend.online && <span className="online-indicator" title="Çevrimiçi"></span>}
                      </div>
                      <div className="friend-info">
                        <h4>{friend.isim} {friend.soyad}</h4>
                        <p>@{friend.username}</p>
                        <span className={`status-badge ${friend.online ? 'online' : 'offline'}`}>
                          {friend.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                        </span>
                      </div>
                      <div className="friend-actions">
                        <motion.button 
                          className="btn-icon" 
                          title="Mesaj Gönder"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => navigate(`/messages/${friend.id}`)}
                        >
                          <FaEnvelope />
                        </motion.button>
                        <motion.button 
                          className="btn-icon delete" 
                          title="Arkadaşı Sil"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveFriend(friendship.id)}
                          disabled={friendLoading}
                        >
                          <FaTrash />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="icon">
                  <FaUserFriends />
                </div>
                <h4>Henüz hiç arkadaşınız yok</h4>
                <p>Yukarıdaki arama kutusunu kullanarak arkadaş bulabilir ve arkadaşlık isteği gönderebilirsiniz.</p>
              </div>
            )}
          </motion.div>
        )}
        
        {/* Gelen Arkadaşlık İstekleri */}
        {friendsList.receivedRequests && friendsList.receivedRequests.length > 0 && (
          <motion.div className="requests-section" variants={tabVariants}>
            <h4>Gelen Arkadaşlık İstekleri</h4>
            <div className="requests-list">
              {friendsList.receivedRequests.map(request => (
                <div key={request.id} className="request-item">
                  <div className="user-info">
                    <div className="user-avatar">
                      {request.requester.profileImageUrl ? (
                        <img 
                          src={request.requester.profileImageUrl.startsWith('http') ? request.requester.profileImageUrl : `https://backend-gq5v.onrender.com${request.requester.profileImageUrl}`} 
                          alt={request.requester.username || 'Kullanıcı'} 
                          crossOrigin="anonymous"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = request.requester && request.requester.username ? request.requester.username.charAt(0).toUpperCase() : '?';
                          }}
                        />
                      ) : (
                        <span>{request.requester && request.requester.username ? request.requester.username.charAt(0).toUpperCase() : '?'}</span>
                      )}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{request.requester.isim} {request.requester.soyad}</span>
                      <span className="user-username">@{request.requester.username}</span>
                      <span className={`user-status ${request.requester.online ? 'online' : 'offline'}`}>
                        {request.requester.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                      </span>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="btn-accept"
                      onClick={() => handleAcceptFriendRequest(request.id)}
                      disabled={friendLoading}
                    >
                      <FaCheck /> Kabul Et
                    </button>
                    <button 
                      className="btn-reject"
                      onClick={() => handleRejectFriendRequest(request.id)}
                      disabled={friendLoading}
                    >
                      <FaTimes /> Reddet
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        
        {/* Gönderilen Arkadaşlık İstekleri */}
        {friendsList.pendingRequests && friendsList.pendingRequests.length > 0 && (
          <motion.div className="requests-section" variants={tabVariants}>
            <h4>Gönderilen Arkadaşlık İstekleri</h4>
            <div className="requests-list">
              {friendsList.pendingRequests.map(request => (
                <div key={request.id} className="request-item">
                  <div className="user-info">
                    <div className="user-avatar">
                      {request.receiver.profileImageUrl ? (
                        <img 
                          src={request.receiver.profileImageUrl.startsWith('http') ? request.receiver.profileImageUrl : `https://backend-gq5v.onrender.com${request.receiver.profileImageUrl}`} 
                          alt={request.receiver.username || 'Kullanıcı'} 
                          crossOrigin="anonymous"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.style.display = 'none';
                            e.target.parentNode.innerHTML = request.receiver && request.receiver.username ? request.receiver.username.charAt(0).toUpperCase() : '?';
                          }}
                        />
                      ) : (
                        <span>{request.receiver && request.receiver.username ? request.receiver.username.charAt(0).toUpperCase() : '?'}</span>
                      )}
                    </div>
                    <div className="user-details">
                      <span className="user-name">{request.receiver.isim} {request.receiver.soyad}</span>
                      <span className="user-username">@{request.receiver.username}</span>
                      <span className={`user-status ${request.receiver.online ? 'online' : 'offline'}`}>
                        {request.receiver.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                      </span>
                      <span className="request-status">
                        <FaClock /> Bekliyor
                      </span>
                    </div>
                  </div>
                  <div className="request-actions">
                    <button 
                      className="btn-cancel"
                      onClick={() => handleCancelFriendRequest(request.id)}
                      disabled={friendLoading}
                    >
                      <FaTimes /> İptal Et
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
        
        {friendLoading && (
          <div className="loading-indicator">
            <p>Yükleniyor...</p>
          </div>
        )}
        
        {friendError && (
          <div className="error-message">
            <p>{friendError}</p>
          </div>
        )}
      </motion.div>
    </Layout>
  );
};

export default Friends;