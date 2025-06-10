import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaUsers, FaPlus, FaEdit, FaTrash, FaUserPlus, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Toast from '../components/Toast';
import groupService from '../services/groupService';
import '../styles/groups.scss';

const Groups = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    groupImage: null,
    memberIds: []
  });
  const [inviteEmail, setInviteEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [pendingInvitations, setPendingInvitations] = useState([]);
  
  // Grupları getir
  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const userGroups = await groupService.getUserGroups();
      setGroups(userGroups);
      
      // Bekleyen davetleri getir
      const invitations = await groupService.getPendingInvitations();
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Gruplar getirilirken hata:', error);
      setError('Gruplar yüklenirken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Sayfa yüklendiğinde grupları getir
  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user, fetchGroups]);
  
  // Form değişikliklerini izle
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  // Grup resmi seçildiğinde
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({
        ...formData,
        groupImage: e.target.files[0]
      });
    }
  };
  
  // Grup oluştur
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      showToast('Grup adı gereklidir', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      await groupService.createGroup(
        formData.name,
        formData.description,
        formData.groupImage,
        formData.memberIds
      );
      
      showToast('Grup başarıyla oluşturuldu', 'success');
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        groupImage: null,
        memberIds: []
      });
      
      // Grupları yeniden getir
      await fetchGroups();
    } catch (error) {
      console.error('Grup oluşturulurken hata:', error);
      showToast('Grup oluşturulurken bir hata oluştu', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Grup bilgilerini güncelle
  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    
    if (!selectedGroup || !formData.name.trim()) {
      showToast('Geçerli bir grup adı gereklidir', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      await groupService.updateGroup(
        selectedGroup.id,
        formData.name,
        formData.description,
        formData.groupImage
      );
      
      showToast('Grup başarıyla güncellendi', 'success');
      setShowEditForm(false);
      
      // Grupları yeniden getir
      await fetchGroups();
    } catch (error) {
      console.error('Grup güncellenirken hata:', error);
      showToast('Grup güncellenirken bir hata oluştu', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Grubu sil
  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Bu grubu silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    try {
      setIsLoading(true);
      
      await groupService.deleteGroup(groupId);
      
      showToast('Grup başarıyla silindi', 'success');
      
      // Grupları yeniden getir
      await fetchGroups();
    } catch (error) {
      console.error('Grup silinirken hata:', error);
      showToast('Grup silinirken bir hata oluştu', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Kullanıcıyı gruba davet et
  const handleInviteUser = async (e) => {
    e.preventDefault();
    
    if (!selectedGroup || !inviteEmail.trim()) {
      showToast('Geçerli bir e-posta adresi gereklidir', 'error');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Gerçek uygulamada, e-posta adresinden kullanıcı ID'sini almak için 
      // bir API çağrısı yapılması gerekebilir
      const userId = 1; // Örnek kullanıcı ID
      
      await groupService.inviteUserToGroup(selectedGroup.id, userId);
      
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
  
  // Grup davetini kabul et
  const handleAcceptInvitation = async (invitationId) => {
    try {
      setIsLoading(true);
      
      await groupService.acceptGroupInvitation(invitationId);
      
      showToast('Grup daveti kabul edildi', 'success');
      
      // Grupları ve davetleri yeniden getir
      await fetchGroups();
    } catch (error) {
      console.error('Davet kabul edilirken hata:', error);
      showToast('Davet kabul edilirken bir hata oluştu', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Grup davetini reddet
  const handleRejectInvitation = async (invitationId) => {
    try {
      setIsLoading(true);
      
      await groupService.rejectGroupInvitation(invitationId);
      
      showToast('Grup daveti reddedildi', 'success');
      
      // Davetleri yeniden getir
      const invitations = await groupService.getPendingInvitations();
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Davet reddedilirken hata:', error);
      showToast('Davet reddedilirken bir hata oluştu', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Grup sohbetine git
  const navigateToGroupChat = (groupId) => {
    navigate(`/group-chat/${groupId}`);
  };
  
  // Düzenleme formunu aç
  const openEditForm = (group) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      groupImage: null
    });
    setShowEditForm(true);
  };
  
  // Davet formunu aç
  const openInviteForm = (group) => {
    setSelectedGroup(group);
    setInviteEmail('');
    setShowInviteForm(true);
  };
  
  // Bildirim göster
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };
  
  // Bildirimi kapat
  const closeToast = () => {
    setToast(null);
  };
  
  return (
    <Layout>
      <div className="groups-container">
        <div className="groups-header">
          <h1><FaUsers /> Gruplar</h1>
          <button 
            className="create-group-btn"
            onClick={() => setShowCreateForm(true)}
          >
            <FaPlus /> Yeni Grup
          </button>
        </div>
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="loading">Yükleniyor...</div>
        ) : (
          <>
            {/* Bekleyen Davetler */}
            {pendingInvitations.length > 0 && (
              <div className="invitations-section">
                <h2>Bekleyen Davetler</h2>
                <div className="invitations-list">
                  {pendingInvitations.map(invitation => (
                    <div key={invitation.id} className="invitation-item">
                      <div className="invitation-details">
                        <span className="group-name">{invitation.group.name}</span>
                        <span className="inviter">
                          Davet eden: {invitation.inviter.username}
                        </span>
                      </div>
                      <div className="invitation-actions">
                        <button 
                          className="accept-btn"
                          onClick={() => handleAcceptInvitation(invitation.id)}
                        >
                          Kabul Et
                        </button>
                        <button 
                          className="reject-btn"
                          onClick={() => handleRejectInvitation(invitation.id)}
                        >
                          Reddet
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Gruplar Listesi */}
            <div className="groups-list">
              {groups.length > 0 ? (
                groups.map(group => (
                  <div key={group.id} className="group-item">
                    <div 
                      className="group-info"
                      onClick={() => navigateToGroupChat(group.id)}
                    >
                      <div className="group-image">
                        {group.imageUrl ? (
                          <img src={group.imageUrl} alt={group.name} />
                        ) : (
                          <FaUsers />
                        )}
                      </div>
                      <div className="group-details">
                        <h3>{group.name}</h3>
                        {group.description && <p>{group.description}</p>}
                      </div>
                    </div>
                    <div className="group-actions">
                      <button
                        className="invite-btn"
                        onClick={() => openInviteForm(group)}
                        title="Kullanıcı Davet Et"
                      >
                        <FaUserPlus />
                      </button>
                      <button
                        className="edit-btn"
                        onClick={() => openEditForm(group)}
                        title="Grubu Düzenle"
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteGroup(group.id)}
                        title="Grubu Sil"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">
                  <FaUsers size={48} />
                  <p>Henüz bir grubunuz yok.</p>
                  <button 
                    className="create-group-btn"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <FaPlus /> Yeni Grup Oluştur
                  </button>
                </div>
              )}
            </div>
          </>
        )}
        
        {/* Grup Oluşturma Formu */}
        {showCreateForm && (
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
                <h2>Yeni Grup Oluştur</h2>
                <button 
                  className="close-btn"
                  onClick={() => setShowCreateForm(false)}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleCreateGroup}>
                <div className="form-group">
                  <label htmlFor="name">Grup Adı *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="description">Açıklama</label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="groupImage">Grup Resmi</label>
                  <input
                    type="file"
                    id="groupImage"
                    name="groupImage"
                    onChange={handleImageChange}
                    accept="image/*"
                  />
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowCreateForm(false)}
                  >
                    İptal
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Oluşturuluyor...' : 'Grup Oluştur'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        
        {/* Grup Düzenleme Formu */}
        {showEditForm && selectedGroup && (
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
                <h2>Grubu Düzenle</h2>
                <button 
                  className="close-btn"
                  onClick={() => setShowEditForm(false)}
                >
                  &times;
                </button>
              </div>
              <form onSubmit={handleUpdateGroup}>
                <div className="form-group">
                  <label htmlFor="edit-name">Grup Adı *</label>
                  <input
                    type="text"
                    id="edit-name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-description">Açıklama</label>
                  <textarea
                    id="edit-description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-groupImage">Grup Resmi</label>
                  <input
                    type="file"
                    id="edit-groupImage"
                    name="groupImage"
                    onChange={handleImageChange}
                    accept="image/*"
                  />
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn"
                    onClick={() => setShowEditForm(false)}
                  >
                    İptal
                  </button>
                  <button 
                    type="submit" 
                    className="submit-btn"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Güncelleniyor...' : 'Grubu Güncelle'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        
        {/* Kullanıcı Davet Formu */}
        {showInviteForm && selectedGroup && (
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

export default Groups; 