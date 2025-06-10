import axios from 'axios';
import api from './api';

const API_URL = 'https://backend-gq5v.onrender.com';

// Grup API servisi - Bu tanımlama kaldırıldı çünkü zaten api import edildi
// Servisleri api ile çağıracağız

// Grup servisi
const groupService = {
  // Kullanıcının gruplarını getir
  getUserGroups: async () => {
    try {
      const response = await api.get('/api/groups');
      return response.data;
    } catch (error) {
      console.error('Gruplar getirilirken hata:', error);
      return [];
    }
  },

  // Grup oluştur
  createGroup: async (name, description, groupImage, memberIds) => {
    try {
      const formData = new FormData();
      formData.append('name', name);
      
      if (description) {
        formData.append('description', description);
      }
      
      if (groupImage) {
        formData.append('groupImage', groupImage);
      }
      
      if (memberIds && memberIds.length > 0) {
        memberIds.forEach(id => formData.append('memberIds', id));
      }
      
      const response = await api.post('/api/groups', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Grup oluşturulurken hata:', error);
      throw error;
    }
  },

  // Grup detaylarını getir
  getGroupDetails: async (groupId) => {
    try {
      const response = await api.get(`/api/groups/${groupId}`);
      return response.data;
    } catch (error) {
      console.error('Grup detayları getirilirken hata:', error);
      throw error;
    }
  },

  // Grup üyelerini getir
  getGroupMembers: async (groupId) => {
    try {
      const response = await api.get(`/api/groups/${groupId}/members`);
      return response.data;
    } catch (error) {
      console.error('Grup üyeleri getirilirken hata:', error);
      return [];
    }
  },

  // Grup yöneticilerini getir
  getGroupAdmins: async (groupId) => {
    try {
      const response = await api.get(`/api/groups/${groupId}/admins`);
      return response.data;
    } catch (error) {
      console.error('Grup yöneticileri getirilirken hata:', error);
      return [];
    }
  },

  // Gruba üye ekle
  addMemberToGroup: async (groupId, userId) => {
    try {
      const response = await api.post(`/api/groups/${groupId}/members/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Gruba üye eklenirken hata:', error);
      throw error;
    }
  },

  // Gruptan üye çıkar
  removeMemberFromGroup: async (groupId, userId) => {
    try {
      const response = await api.delete(`/api/groups/${groupId}/members/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Gruptan üye çıkarılırken hata:', error);
      throw error;
    }
  },

  // Yönetici ekle
  addAdminToGroup: async (groupId, userId) => {
    try {
      const response = await api.post(`/api/groups/${groupId}/admins/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Gruba yönetici eklenirken hata:', error);
      throw error;
    }
  },

  // Yönetici çıkar
  removeAdminFromGroup: async (groupId, userId) => {
    try {
      const response = await api.delete(`/api/groups/${groupId}/admins/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Gruptan yönetici çıkarılırken hata:', error);
      throw error;
    }
  },

  // Grup bilgilerini güncelle
  updateGroup: async (groupId, name, description, groupImage) => {
    try {
      const formData = new FormData();
      
      if (name) {
        formData.append('name', name);
      }
      
      if (description) {
        formData.append('description', description);
      }
      
      if (groupImage) {
        formData.append('groupImage', groupImage);
      }
      
      const response = await api.put(`/api/groups/${groupId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Grup güncellenirken hata:', error);
      throw error;
    }
  },

  // Grubu sil
  deleteGroup: async (groupId) => {
    try {
      const response = await api.delete(`/api/groups/${groupId}`);
      return response.data;
    } catch (error) {
      console.error('Grup silinirken hata:', error);
      throw error;
    }
  },

  // Kullanıcıyı gruba davet et
  inviteUserToGroup: async (groupId, userId) => {
    try {
      // API servisini kullanarak CORS sorunlarını çöz
      const response = await api.post(`/groups/${groupId}/invite/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Kullanıcı davet edilirken hata:', error);
      throw error;
    }
  },

  // Grup davetini kabul et
  acceptGroupInvitation: async (invitationId) => {
    try {
      const response = await api.post(`/api/groups/invitations/${invitationId}/accept`);
      return response.data;
    } catch (error) {
      console.error('Grup daveti kabul edilirken hata:', error);
      throw error;
    }
  },

  // Grup davetini reddet
  rejectGroupInvitation: async (invitationId) => {
    try {
      const response = await api.post(`/api/groups/invitations/${invitationId}/reject`);
      return response.data;
    } catch (error) {
      console.error('Grup daveti reddedilirken hata:', error);
      throw error;
    }
  },

  // Gruptan ayrıl
  leaveGroup: async (groupId) => {
    try {
      const response = await api.delete(`/api/groups/${groupId}/leave`);
      return response.data;
    } catch (error) {
      console.error('Gruptan ayrılırken hata:', error);
      throw error;
    }
  },

  // Bekleyen davetleri getir
  getPendingInvitations: async () => {
    try {
      const response = await api.get('/api/groups/invitations');
      return response.data;
    } catch (error) {
      console.error('Bekleyen davetler getirilirken hata:', error);
      return [];
    }
  },

  // Grup mesajlarını getir
  getGroupMessages: async (groupId) => {
    try {
      const response = await api.get(`/api/groups/${groupId}/messages`);
      return response.data;
    } catch (error) {
      console.error('Grup mesajları getirilirken hata:', error);
      return [];
    }
  },

  // Grup mesajlarını sayfalı getir
  getGroupMessagesWithPagination: async (groupId, page = 0, size = 20) => {
    try {
      const response = await api.get(`/api/groups/${groupId}/messages/paged?page=${page}&size=${size}`);
      return response.data;
    } catch (error) {
      console.error('Sayfalı grup mesajları getirilirken hata:', error);
      return { content: [], totalPages: 0, totalElements: 0 };
    }
  },

  // Belirli bir tarihten sonraki mesajları getir
  getGroupMessagesAfterTimestamp: async (groupId, timestamp) => {
    try {
      const response = await api.get(`/api/groups/${groupId}/messages/after?timestamp=${timestamp.toISOString()}`);
      return response.data;
    } catch (error) {
      console.error('Belirli tarihten sonraki mesajlar getirilirken hata:', error);
      return [];
    }
  },

  // Metin mesajı gönder
  sendGroupMessage: async (groupId, content) => {
    try {
      const response = await api.post(`/api/groups/${groupId}/messages`, null, {
        params: { content }
      });
      return response.data;
    } catch (error) {
      console.error('Grup mesajı gönderilirken hata:', error);
      throw error;
    }
  },

  // Medya mesajı gönder
  sendGroupMediaMessage: async (groupId, mediaFile) => {
    try {
      const formData = new FormData();
      formData.append('media', mediaFile);
      
      const response = await api.post(`/api/groups/${groupId}/messages/media`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data;
    } catch (error) {
      console.error('Grup medya mesajı gönderilirken hata:', error);
      throw error;
    }
  },

  // Mesajı sil
  deleteGroupMessage: async (groupId, messageId) => {
    try {
      const response = await api.delete(`/api/groups/${groupId}/messages/${messageId}`);
      return response.data;
    } catch (error) {
      console.error('Grup mesajı silinirken hata:', error);
      throw error;
    }
  }
};

export default groupService; 