import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import AuthService from './AuthService';
import WebSocketService from './WebSocketService';

class ChatService {
  /**
   * Kullanıcının tüm sohbetlerini getirir
   */
  getUserChats() {
    return axios.get(`${API_BASE_URL}/api/chats`, {
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    })
    .then(response => {
      // API yanıtını kontrol et ve veriyi döndür
      if (response && response.data) {
        return response.data; // Backend'den gelen veriyi doğrudan döndür
      }
      return []; // Veri yoksa boş dizi döndür
    })
    .catch(error => {
      console.error('Sohbetler getirilirken hata:', error);
      return []; // Hata durumunda boş dizi döndür
    });
  }

  /**
   * Belirli bir sohbetin detaylarını getirir
   */
  getChatById(chatId) {
    return axios.get(`${API_BASE_URL}/api/chats/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    });
  }

  /**
   * Belirli bir sohbetteki mesajları getirir
   */
  getChatMessages(chatId) {
    return axios.get(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    })
    .then(response => {
      if (response && response.data) {
        return response.data;
      }
      return [];
    })
    .catch(error => {
      console.error(`${chatId} ID'li sohbetin mesajları getirilirken hata:`, error);
      throw error;
    });
  }

  /**
   * İki kullanıcı arasındaki özel sohbeti başlatır veya getirir
   */
  startPrivateChat(userId) {
    return axios.post(`${API_BASE_URL}/api/chats/private/${userId}`, {}, {
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    });
  }

  /**
   * Bir sohbete mesaj gönderir (HTTP)
   */
  sendMessageHttp(chatId, content) {
    return axios.post(`${API_BASE_URL}/api/chats/${chatId}/messages`, {
      content
    }, {
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    });
  }

  /**
   * Bir sohbete mesaj gönderir (WebSocket)
   */
  sendMessage(chatId, content) {
    return WebSocketService.sendMessage(chatId, content);
  }

  /**
   * Bir sohbete katılma bildirimi gönderir
   */
  joinChat(chatId) {
    return WebSocketService.joinChat(chatId);
  }

  /**
   * Yazıyor durumu bildirimi gönderir
   */
  sendTypingIndicator(chatId, isTyping) {
    return WebSocketService.sendTypingIndicator(chatId, isTyping);
  }

  /**
   * Belirli bir sohbet için mesaj işleyicisi ekler
   */
  addMessageHandler(chatId, handler) {
    WebSocketService.addMessageHandler(chatId, handler);
  }

  /**
   * Belirli bir sohbet için yazıyor işleyicisi ekler
   */
  addTypingHandler(chatId, handler) {
    WebSocketService.addTypingHandler(chatId, handler);
  }

  /**
   * Belirli bir sohbet için durum işleyicisi ekler
   */
  addStatusHandler(chatId, handler) {
    WebSocketService.addStatusHandler(chatId, handler);
  }

  /**
   * Mesaj içeriğini işler ve medya içeriği varsa ayrıştırır
   */
  processMessageContent(message) {
    if (message.content && message.content.startsWith('{')) {
      try {
        const jsonContent = JSON.parse(message.content);
        
        if (jsonContent.type === 'media') {
          return {
            ...message,
            isMedia: true,
            mediaUrl: jsonContent.url,
            mediaType: jsonContent.mediaType,
            content: 'Medya mesajı'
          };
        }
      } catch (e) {
        // JSON parse hatası, normal mesaj olarak devam et
      }
    }
    
    return message;
  }

  /**
   * Kullanıcıyı bir sohbete zorla ekler (sohbet hatalarını düzeltmek için)
   */
  forceAddUserToChat(chatId, userId) {
    return axios.post(`${API_BASE_URL}/api/chats/${chatId}/force-add/${userId}`, {}, {
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    })
    .then(response => {
      if (response && response.data) {
        return response.data;
      }
      return { success: false };
    })
    .catch(error => {
      console.error('Kullanıcı sohbete eklenirken hata:', error);
      return { success: false, error: error.message };
    });
  }

  /**
   * Bir sohbeti silmek için API çağrısı yapar
   */
  deleteChat(chatId) {
    return axios.delete(`${API_BASE_URL}/api/chats/${chatId}`, {
      headers: {
        'Authorization': `Bearer ${AuthService.getToken()}`
      }
    })
    .then(response => {
      if (response && response.data) {
        return response.data;
      }
      return { success: true };
    })
    .catch(error => {
      console.error('Sohbet silinirken hata:', error);
      return { success: false, error: error.message };
    });
  }
}

export default new ChatService();
