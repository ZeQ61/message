import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUsers, FaPaperPlane, FaImage, FaInfoCircle, FaArrowLeft, FaUserPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import MediaUploader from '../components/MediaUploader';
import MediaMessage from '../components/MediaMessage';
import TypingIndicator from '../components/TypingIndicator';
import groupService from '../services/groupService';
import { addGroupMessageListener, removeGroupMessageListener, sendGroupMessage, joinGroup } from '../services/websocket';
import '../styles/groupchat.scss';

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
  
  // Kullanıcıyı gruba davet et
  const handleInviteUser = async (e) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      showToast('Geçerli bir e-posta adresi gereklidir', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Gerçek uygulamada, e-posta adresinden kullanıcı ID'sini almak için 
      // bir API çağrısı yapılması gerekebilir
      const userId = 1; // Örnek kullanıcı ID
      
      await groupService.inviteUserToGroup(groupId, userId);
      
      showToast('Kullanıcı gruba başarıyla davet edildi', 'success');
      setInviteEmail('');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Kullanıcı davet edilirken hata:', error);
      showToast('Kullanıcı davet edilirken bir hata oluştu', 'error');
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
          </div>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* Mesaj Alanı */}
        <div className="messages-container" ref={messagesContainerRef}>
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
            <div className="messages-list">
              {messages.map((message, index) => {
                // Medya mesajı mı kontrol et
                const isMediaMessage = message.content && 
                  (message.content.startsWith('{') && message.content.includes('type') && message.content.includes('url'));
                
                return (
                  <div 
                    key={message.id || index}
                    className={`message-item ${message.isMine ? 'own-message' : 'other-message'}`}
                  >
                    {!message.isMine && (
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
                        {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </div>
                    </div>
                  </div>
                );
              })}
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
        {showMembersList && (
          <motion.div 
            className="members-sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
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
                Oluşturulma: {new Date(group?.createdAt).toLocaleDateString()}
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
        
        {/* Kullanıcı Davet Formu */}
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
                <div className="form-group">
                  <label htmlFor="inviteEmail">E-posta Adresi *</label>
                  <input
                    type="email"
                    id="inviteEmail"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>
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
                    disabled={isLoading}
                  >
                    {isLoading ? 'Davet Ediliyor...' : 'Davet Et'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        
        {/* Medya Yükleme Modalı */}
        {showMediaUploader && (
          <MediaUploader
            onClose={() => setShowMediaUploader(false)}
            onUpload={handleSendMediaMessage}
            isLoading={isLoading}
          />
        )}
        
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