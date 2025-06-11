import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaUsers, FaPaperPlane, FaImage, FaInfoCircle, FaArrowLeft, FaUserPlus, FaSmile, FaLink, FaEllipsisV, FaCalendarAlt, FaClock } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import MediaUploader from '../components/MediaUploader';
import MediaMessage from '../components/MediaMessage';
import TypingIndicator from '../components/TypingIndicator';
import groupService from '../services/groupService';
import { addGroupMessageListener, removeGroupMessageListener, sendGroupMessage, joinGroup } from '../services/websocket';
import '../styles/groupchat.scss';
import api from '../services/api';

const GroupChat = () => {
  const { groupId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [members, setMembers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [showMembersList, setShowMembersList] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [showMediaUploader, setShowMediaUploader] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Grup bilgilerini getir
  const fetchGroupDetails = useCallback(async () => {
    if (!groupId || !user) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Grup detaylarını getir
      const groupData = await groupService.getGroupDetails(groupId);
      setGroup(groupData);
      
      // Grup üyelerini getir
      const membersData = await groupService.getGroupMembers(groupId);
      setMembers(membersData);
      
      // Grup yöneticilerini getir
      const adminsData = await groupService.getGroupAdmins(groupId);
      setAdmins(adminsData);
      
      // Kullanıcı yönetici mi kontrol et
      const isUserAdmin = adminsData.some(admin => admin.id === user.id);
      setIsAdmin(isUserAdmin);
      
      // Grup mesajlarını getir
      const messagesData = await groupService.getGroupMessages(groupId);
      
      // Mesajları işaretle (kullanıcının kendi mesajları vs.)
      const processedMessages = messagesData.map(message => ({
        ...message,
        isMine: message.sender.id === user.id
      }));
      
      setMessages(processedMessages);
      
      // WebSocket üzerinden gruba katıl
      await joinGroup(groupId);
    } catch (error) {
      console.error('Grup detayları getirilirken hata:', error);
      setError('Grup bilgileri yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, user]);
  
  // Sayfa yüklendiğinde grup bilgilerini getir
  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);
  
  // WebSocket üzerinden grup mesajlarını dinle
  useEffect(() => {
    const handleNewGroupMessage = (message) => {
      // Mesaj bu gruba ait değilse, işleme
      if (message.groupId !== parseInt(groupId, 10)) {
        return;
      }
      
      // Mesajı işaretle (kullanıcının kendi mesajı mı?)
      const processedMessage = {
        ...message,
        isMine: message.senderId === user?.id
      };
      
      // Mesajları güncelle
      setMessages(prevMessages => [...prevMessages, processedMessage]);
      
      // Sohbeti aşağı kaydır
      scrollToBottom();
    };
    
    // Mesaj dinleyicisini ekle
    addGroupMessageListener(handleNewGroupMessage);
    
    // Temizlik
    return () => {
      removeGroupMessageListener(handleNewGroupMessage);
    };
  }, [groupId, user]);
  
  // Mesajları otomatik olarak aşağı kaydır
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Yeni mesaj geldiğinde otomatik kaydır
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Mesaj gönder
  const handleSendMessage = async () => {
    if (!messageText.trim() || !groupId || !user) return;
    
    try {
      // Mesajı gönder
      await sendGroupMessage(groupId, messageText);
      
      // Metin alanını temizle
      setMessageText('');
    } catch (error) {
      console.error('Mesaj gönderilirken hata:', error);
      showToast('Mesaj gönderilemedi', 'error');
    }
  };
  
  // Medya mesajı gönder
  const handleSendMediaMessage = async (file) => {
    if (!file || !groupId || !user) return;
    
    try {
      setIsLoading(true);
      
      await groupService.sendGroupMediaMessage(groupId, file);
      
      setShowMediaUploader(false);
      showToast('Medya gönderildi', 'success');
    } catch (error) {
      console.error('Medya gönderilirken hata:', error);
      showToast('Medya gönderilemedi', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Kullanıcı davet etme fonksiyonu
  const handleInviteUser = async (e) => {
    e.preventDefault();
    
    if (!selectedUser) {
      setInviteError('Lütfen bir kullanıcı seçin');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Davet etme işlemi - doğru URL ile
      await groupService.inviteUserToGroup(groupId, selectedUser.id);
      
      setInviteMessage(`${selectedUser.username} gruba başarıyla davet edildi`);
      setInviteUsername('');
      setSelectedUser(null);
      setSearchResults([]);
      setShowInviteForm(false);
    } catch (error) {
      console.error('Kullanıcı davet edilirken hata:', error);
      setInviteError('Kullanıcı davet edilirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Gruptan ayrıl
  const handleLeaveGroup = async () => {
    if (!window.confirm('Bu gruptan ayrılmak istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      await groupService.leaveGroup(groupId);
      
      showToast('Gruptan başarıyla ayrıldınız', 'success');
      
      // Gruplar sayfasına yönlendir
      navigate('/groups');
    } catch (error) {
      console.error('Gruptan ayrılırken hata:', error);
      showToast('Gruptan ayrılırken bir hata oluştu', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Enter tuşuna basıldığında mesaj gönder
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Bildirim göster
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };
  
  // Bildirimi kapat
  const closeToast = () => {
    setToast(null);
  };
  
  // Gruplara geri dön
  const navigateBack = () => {
    navigate('/groups');
  };
  
  // Kullanıcı ara
  const searchUsers = async (username) => {
    if (!username.trim() || username.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      // Token kontrol ve hazırlama
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Kullanıcı kimliği doğrulanamadı');
        setSearchResults([]);
        return;
      }
      
      console.log('Kullanıcı araması:', username);
      console.log('Token:', token ? `${token.substring(0, 15)}...` : 'yok');
      
      // API servisini kullanarak doğru endpoint'e istek gönder
      const response = await api.get('/user/users/search', {
        params: {
          username: username
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("Kullanıcı arama sonuçları:", response.data);
      setSearchResults(response.data || []);
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error.message || error);
      if (error.response) {
        console.error('Hata yanıtı:', error.response.status, error.response.data);
      }
      setInviteError('Kullanıcılar aranırken bir hata oluştu');
      setSearchResults([]);
    }
  };

  // Kullanıcı adı değiştiğinde ara
  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setInviteUsername(value);
    setSelectedUser(null);
    
    // Debounce ile arama yap
    if (value.trim().length >= 2) {
      const handler = setTimeout(() => {
        searchUsers(value);
      }, 300);
      
      return () => clearTimeout(handler);
    } else {
      setSearchResults([]);
    }
  };
  
  // Kullanıcı seçildiğinde
  const selectUserForInvite = (user) => {
    setSelectedUser(user);
    setInviteUsername(user.username);
    setSearchResults([]);
  };
  
  // Mesajı tarihe göre grupla
  const groupMessagesByDate = (messages) => {
    const groups = {};
    
    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateStr = date.toLocaleDateString();
      
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      
      groups[dateStr].push(message);
    });
    
    return groups;
  };
  
  // Tarih formatını güzelleştir
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Bugün';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    }
  };
  
  // Mesajları gruplandır
  const groupedMessages = groupMessagesByDate(messages);
  
  return (
    <Layout>
      <div className="group-chat-container">
        {/* Grup Başlığı */}
        <div className="group-chat-header">
          <button className="back-btn" onClick={navigateBack}>
            <FaArrowLeft />
          </button>
          
          <div 
            className="group-info"
            onClick={() => setShowMembersList(!showMembersList)}
          >
            <div className="group-avatar">
              {group?.imageUrl ? (
                <img src={group.imageUrl} alt={group?.name} />
              ) : (
                <FaUsers />
              )}
            </div>
            <div className="group-details">
              <h2>{group?.name || 'Yükleniyor...'}</h2>
              <span className="members-count">
                {members.length} üye
              </span>
            </div>
          </div>
          
          <div className="header-actions">
            <button 
              className="info-btn"
              onClick={() => setShowMembersList(!showMembersList)}
              title="Grup Bilgileri"
            >
              <FaInfoCircle />
            </button>
            <button 
              className="options-btn"
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              title="Diğer Seçenekler"
            >
              <FaEllipsisV />
            </button>
            {showOptionsMenu && (
              <div className="options-menu">
                <ul>
                  {isAdmin && (
                    <li onClick={() => {
                      setShowOptionsMenu(false);
                      setShowMembersList(false);
                      setShowInviteForm(true);
                    }}>
                      <FaUserPlus /> <span>Kullanıcı Davet Et</span>
                    </li>
                  )}
                  <li onClick={() => {
                    setShowOptionsMenu(false);
                    handleLeaveGroup();
                  }}>
                    <span className="text-danger">Gruptan Ayrıl</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* Mesaj Alanı */}
        <div className="messages-container" ref={messagesContainerRef} style={{ width: '100%', flex: '1' }}>
          {isLoading && messages.length === 0 ? (
            <div className="loading-messages">
              <TypingIndicator />
              <span>Mesajlar yükleniyor...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="empty-messages">
              <FaUsers size={48} />
              <p>Henüz mesaj yok. Sohbete başlamak için bir mesaj gönderin.</p>
            </div>
          ) : (
            <div className="messages-list" style={{ width: '100%' }}>
              {Object.keys(groupedMessages).map(dateStr => (
                <div key={dateStr} className="message-date-group">
                  <div className="date-divider">
                    <div className="date-line"></div>
                    <div className="date-label">
                      <FaCalendarAlt className="date-icon" />
                      <span>{formatDate(dateStr)}</span>
                    </div>
                    <div className="date-line"></div>
                  </div>
                  
                  {groupedMessages[dateStr].map((message, index) => {
                    // Medya mesajı mı kontrol et
                    const isMediaMessage = message.content && 
                      (message.content.startsWith('{') && message.content.includes('type') && message.content.includes('url'));
                    
                    // Bir önceki mesaj aynı kullanıcıdan mı kontrol et
                    const prevMessage = index > 0 ? groupedMessages[dateStr][index - 1] : null;
                    const showSender = !prevMessage || prevMessage.sender.id !== message.sender.id;
                    
                    return (
                      <div 
                        key={message.id || index}
                        className={`message-item ${message.isMine ? 'own-message' : 'other-message'} ${showSender ? 'with-sender' : ''}`}
                      >
                        {!message.isMine && showSender && (
                          <div className="message-sender-avatar">
                            {message.sender?.profileImageUrl ? (
                              <img src={message.sender.profileImageUrl} alt={message.sender.username} />
                            ) : (
                              <div className="default-avatar">
                                {message.sender?.username?.charAt(0).toUpperCase() || '?'}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="message-content">
                          {!message.isMine && showSender && (
                            <div className="message-sender">
                              {message.sender?.username || 'Kullanıcı'}
                            </div>
                          )}
                          
                          <div className="message-bubble">
                            {isMediaMessage ? (
                              <MediaMessage content={message.content} />
                            ) : (
                              <div className="message-text">{message.content}</div>
                            )}
                            <div className="message-time">
                              <FaClock className="time-icon" />
                              {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Mesaj Giriş Alanı */}
        <div className="message-input-container">
          <button 
            className="media-btn"
            onClick={() => setShowMediaUploader(true)}
            title="Medya Ekle"
          >
            <FaImage />
          </button>
          
          <button 
            className="emoji-btn"
            title="Emoji Ekle"
          >
            <FaSmile />
          </button>
          
          <textarea
            className="message-input"
            placeholder="Mesajınızı yazın..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          
          <button 
            className="send-btn"
            onClick={handleSendMessage}
            disabled={!messageText.trim()}
          >
            <FaPaperPlane />
          </button>
        </div>
        
        {/* Üyeler Listesi */}
        <AnimatePresence>
          {showMembersList && (
            <motion.div 
              className="members-sidebar"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
            >
              <div className="sidebar-header">
                <h3>Grup Bilgileri</h3>
                <button 
                  className="close-btn"
                  onClick={() => setShowMembersList(false)}
                >
                  &times;
                </button>
              </div>
              
              <div className="group-details-section">
                <h4>{group?.name}</h4>
                {group?.description && <p>{group.description}</p>}
                <p className="created-at">
                  <FaCalendarAlt className="icon" />
                  Oluşturulma: {new Date(group?.createdAt).toLocaleDateString('tr-TR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              
              <div className="members-section">
                <div className="section-header">
                  <h4>Üyeler ({members.length})</h4>
                  {isAdmin && (
                    <button 
                      className="invite-btn"
                      onClick={() => {
                        setShowMembersList(false);
                        setShowInviteForm(true);
                      }}
                    >
                      <FaUserPlus /> Davet Et
                    </button>
                  )}
                </div>
                
                <div className="members-list">
                  {members.map(member => {
                    const isGroupAdmin = admins.some(admin => admin.id === member.id);
                    const isCurrentUser = member.id === user?.id;
                    
                    return (
                      <div key={member.id} className="member-item">
                        <div className="member-avatar">
                          {member.profileImageUrl ? (
                            <img src={member.profileImageUrl} alt={member.username} />
                          ) : (
                            <div className="default-avatar">
                              {member.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="member-info">
                          <span className="member-name">
                            {member.username}
                            {isCurrentUser && ' (Siz)'}
                          </span>
                          {isGroupAdmin && (
                            <span className="admin-badge">Yönetici</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="sidebar-actions">
                <button 
                  className="leave-group-btn"
                  onClick={handleLeaveGroup}
                >
                  Gruptan Ayrıl
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Kullanıcı Davet Formu */}
        <AnimatePresence>
          {showInviteForm && (
            <motion.div 
              className="modal-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div 
                className="modal-content"
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 50, opacity: 0 }}
                transition={{ type: 'spring', damping: 25 }}
              >
                <div className="modal-header">
                  <h2>Kullanıcı Davet Et</h2>
                  <button 
                    className="close-btn"
                    onClick={() => setShowInviteForm(false)}
                  >
                    &times;
                  </button>
                </div>
                <form onSubmit={handleInviteUser}>
                  {inviteMessage && (
                    <div className="success-message">{inviteMessage}</div>
                  )}
                  {inviteError && (
                    <div className="error-message">{inviteError}</div>
                  )}
                  <div className="form-group">
                    <label htmlFor="inviteUsername">Kullanıcı Adı *</label>
                    <input
                      type="text"
                      id="inviteUsername"
                      value={inviteUsername}
                      onChange={handleUsernameChange}
                      placeholder="Kullanıcı adını yazın..."
                      autoComplete="off"
                      required
                    />
                    
                    {searchResults.length > 0 && !selectedUser && (
                      <div className="search-results">
                        {searchResults.map(user => (
                          <div 
                            key={user.id} 
                            className="search-result-item"
                            onClick={() => selectUserForInvite(user)}
                          >
                            <div className="user-avatar">
                              {user.profileImageUrl ? (
                                <img src={user.profileImageUrl} alt={user.username} />
                              ) : (
                                <div className="default-avatar">
                                  {user.username.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="user-info">
                              <span className="username">{user.username}</span>
                              {user.email && <span className="email">{user.email}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {searchResults.length === 0 && inviteUsername.length >= 2 && (
                      <div className="no-results">Kullanıcı bulunamadı</div>
                    )}
                  </div>
                  
                  {selectedUser && (
                    <div className="selected-user">
                      <p>Davet edilecek kullanıcı:</p>
                      <div className="user-details">
                        <div className="user-avatar">
                          {selectedUser.profileImageUrl ? (
                            <img src={selectedUser.profileImageUrl} alt={selectedUser.username} />
                          ) : (
                            <div className="default-avatar">
                              {selectedUser.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="user-info">
                          <span className="username">{selectedUser.username}</span>
                          {selectedUser.email && <span className="email">{selectedUser.email}</span>}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setShowInviteForm(false)}
                    >
                      İptal
                    </button>
                    <button 
                      type="submit" 
                      className="submit-btn"
                      disabled={isLoading || !selectedUser}
                    >
                      {isLoading ? 'Davet Ediliyor...' : 'Davet Et'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Medya Yükleme Modalı */}
        <AnimatePresence>
          {showMediaUploader && (
            <MediaUploader
              onClose={() => setShowMediaUploader(false)}
              onUpload={handleSendMediaMessage}
              isLoading={isLoading}
            />
          )}
        </AnimatePresence>
        
        {/* Toast Bildirimi */}
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={closeToast} 
          />
        )}
      </div>
    </Layout>
  );
};

export default GroupChat; 