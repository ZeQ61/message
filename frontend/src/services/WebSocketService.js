import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';
import { API_BASE_URL } from '../config/constants';
import AuthService from './AuthService';

class WebSocketService {
  constructor() {
    this.stompClient = null;
    this.subscriptions = {};
    this.connected = false;
    this.connectPromise = null;
    this.reconnectTimeout = null;
    this.messageHandlers = {};
    this.typingHandlers = {};
    this.statusHandlers = {};
    this.notificationHandlers = {};
    this.groupMessageHandlers = {}; // Grup mesaj işleyicileri
  }

  // WebSocket URL'sini düzenleyerek HTTPS desteği ekle
  getWebSocketUrl() {
    let wsUrl = `${API_BASE_URL}/ws`;
    
    // Eğer backend render.com'da çalışıyorsa doğrudan HTTPS URL'sini kullan
    if (window.location.hostname !== 'localhost') {
      wsUrl = 'https://backend-gq5v.onrender.com/ws';
    }
    
    // Tarayıcının protokolüne göre URL'yi ayarla
    if (window.location.protocol === 'https:') {
      wsUrl = 'https://backend-gq5v.onrender.com/ws';
    }
    
    console.log('WebSocketService - kullanılan URL:', wsUrl);
    return wsUrl;
  }

  // WebSocket bağlantısı kurma
  connect() {
    if (this.connectPromise) {
      return this.connectPromise;
    }

    this.connectPromise = new Promise((resolve, reject) => {
      const wsUrl = this.getWebSocketUrl();
      const socket = new SockJS(`${wsUrl}?token=${AuthService.getToken()}`);
      this.stompClient = Stomp.over(socket);

      // Debug modunu kapat
      this.stompClient.debug = () => {};

      // Bağlantı başlıklarını ayarla
      const headers = {
        'Authorization': `Bearer ${AuthService.getToken()}`,
        'X-Authorization': `Bearer ${AuthService.getToken()}`
      };

      this.stompClient.connect(
        headers,
        () => {
          console.log('WebSocket bağlantısı kuruldu');
          this.connected = true;
          this.setupSubscriptions();
          resolve(true);
        },
        (error) => {
          console.error('WebSocket bağlantı hatası:', error);
          this.connected = false;
          this.connectPromise = null;
          this.reconnect();
          reject(error);
        }
      );
    });

    return this.connectPromise;
  }

  // Yeniden bağlanma
  reconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('WebSocket yeniden bağlanmaya çalışılıyor...');
      this.connectPromise = null;
      this.connect()
        .then(() => {
          console.log('WebSocket yeniden bağlandı');
        })
        .catch((error) => {
          console.error('WebSocket yeniden bağlantı hatası:', error);
        });
    }, 3000);
  }

  // Bağlantıyı kapatma
  disconnect() {
    if (this.stompClient && this.connected) {
      this.stompClient.disconnect();
      this.connected = false;
      this.connectPromise = null;
      this.subscriptions = {};
      console.log('WebSocket bağlantısı kapatıldı');
    }
  }

  // Temel abonelikleri kurma
  setupSubscriptions() {
    // Özel mesajlar için abone ol
    this.subscribe('/user/queue/messages', (message) => {
      this.handleIncomingMessage(message);
    });

    // Yazıyor göstergesi için abone ol
    this.subscribe('/user/queue/typing-indicators', (typingData) => {
      this.handleTypingIndicator(typingData);
    });

    // Kullanıcı durumu için abone ol
    this.subscribe('/user/queue/chat-status', (statusData) => {
      this.handleStatusUpdate(statusData);
    });

    // Bildirimler için abone ol
    this.subscribe('/user/queue/notifications', (notification) => {
      this.handleNotification(notification);
    });

    // Arkadaşlık güncellemeleri için abone ol
    this.subscribe('/topic/friendship', (friendshipData) => {
      this.handleFriendshipUpdate(friendshipData);
    });
  }

  // Belirli bir kanala abone olma
  subscribe(destination, callback) {
    if (!this.connected) {
      return this.connect().then(() => this.subscribe(destination, callback));
    }

    if (!this.subscriptions[destination]) {
      this.subscriptions[destination] = this.stompClient.subscribe(destination, (message) => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (error) {
          console.error(`Mesaj işleme hatası (${destination}):`, error);
        }
      });
    }

    return this.subscriptions[destination];
  }

  // Aboneliği iptal etme
  unsubscribe(destination) {
    if (this.subscriptions[destination]) {
      this.subscriptions[destination].unsubscribe();
      delete this.subscriptions[destination];
    }
  }

  // Mesaj gönderme
  sendMessage(chatId, content) {
    if (!this.connected) {
      return this.connect().then(() => this.sendMessage(chatId, content));
    }

    const message = {
      chatId,
      content
    };

    this.stompClient.send('/app/chat.sendMessage', {}, JSON.stringify(message));
  }

  // Grup mesajı gönderme
  sendGroupMessage(groupId, content) {
    if (!this.connected) {
      return this.connect().then(() => this.sendGroupMessage(groupId, content));
    }

    const message = {
      groupId,
      content,
      type: 'GROUP'
    };

    this.stompClient.send(`/app/group.message.${groupId}`, {}, JSON.stringify(message));
  }

  // Yazıyor bilgisi gönderme
  sendTypingIndicator(chatId, isTyping) {
    if (!this.connected) {
      return this.connect().then(() => this.sendTypingIndicator(chatId, isTyping));
    }

    const typingData = {
      chatId,
      typing: isTyping
    };

    this.stompClient.send('/app/chat.typing', {}, JSON.stringify(typingData));
  }

  // Sohbete katılma bildirimi gönderme
  joinChat(chatId) {
    if (!this.connected) {
      return this.connect().then(() => this.joinChat(chatId));
    }

    const joinData = {
      chatId
    };

    this.stompClient.send('/app/chat.join', {}, JSON.stringify(joinData));
  }

  // Gruba katılma bildirimi gönderme
  joinGroup(groupId) {
    if (!this.connected) {
      return this.connect().then(() => this.joinGroup(groupId));
    }

    const joinData = {
      groupId,
      type: 'JOIN'
    };

    this.stompClient.send(`/app/group.join.${groupId}`, {}, JSON.stringify(joinData));
  }

  // Gelen mesaj işleyicisi ekleme
  addMessageHandler(chatId, handler) {
    if (!this.messageHandlers[chatId]) {
      this.messageHandlers[chatId] = [];
    }
    this.messageHandlers[chatId].push(handler);
  }

  // Grup mesaj işleyicisi ekleme
  addGroupMessageHandler(groupId, handler) {
    if (!this.groupMessageHandlers[groupId]) {
      this.groupMessageHandlers[groupId] = [];
    }
    this.groupMessageHandlers[groupId].push(handler);
    
    // Grup kanalına abone ol
    this.subscribeToGroupChannel(groupId);
  }

  // Grup kanalına abone ol
  subscribeToGroupChannel(groupId) {
    if (!this.connected) {
      return this.connect().then(() => this.subscribeToGroupChannel(groupId));
    }

    const destination = `/topic/group/${groupId}`;
    
    if (!this.subscriptions[destination]) {
      this.subscribe(destination, (message) => {
        this.handleGroupMessage(groupId, message);
      });
      console.log(`Grup kanalına abone olundu: ${destination}`);
    }
  }

  // Yazıyor işleyicisi ekleme
  addTypingHandler(chatId, handler) {
    if (!this.typingHandlers[chatId]) {
      this.typingHandlers[chatId] = [];
    }
    this.typingHandlers[chatId].push(handler);
  }

  // Durum işleyicisi ekleme
  addStatusHandler(chatId, handler) {
    if (!this.statusHandlers[chatId]) {
      this.statusHandlers[chatId] = [];
    }
    this.statusHandlers[chatId].push(handler);
  }

  // Bildirim işleyicisi ekleme
  addNotificationHandler(handler) {
    this.notificationHandlers.global = this.notificationHandlers.global || [];
    this.notificationHandlers.global.push(handler);
  }

  // Gelen mesajı işleme
  handleIncomingMessage(message) {
    // Medya mesajlarını kontrol et ve işle
    if (message.content && message.content.startsWith('{')) {
      try {
        const jsonContent = JSON.parse(message.content);
        if (jsonContent.type === 'media') {
          message.isMedia = true;
          message.mediaUrl = jsonContent.url;
          message.mediaType = jsonContent.mediaType;
        }
      } catch (e) {
        // JSON parse hatası, normal mesaj olarak devam et
      }
    }

    // İlgili chat için işleyicileri çağır
    if (this.messageHandlers[message.chatId]) {
      this.messageHandlers[message.chatId].forEach(handler => handler(message));
    }
  }

  // Grup mesajını işleme
  handleGroupMessage(groupId, message) {
    // Medya mesajlarını kontrol et ve işle
    if (message.content && message.content.startsWith('{')) {
      try {
        const jsonContent = JSON.parse(message.content);
        if (jsonContent.type === 'media') {
          message.isMedia = true;
          message.mediaUrl = jsonContent.url;
          message.mediaType = jsonContent.mediaType;
        }
      } catch (e) {
        // JSON parse hatası, normal mesaj olarak devam et
      }
    }

    // İlgili grup için işleyicileri çağır
    if (this.groupMessageHandlers[groupId]) {
      this.groupMessageHandlers[groupId].forEach(handler => handler(message));
    }
  }

  // Yazıyor göstergesini işleme
  handleTypingIndicator(data) {
    if (this.typingHandlers[data.chatId]) {
      this.typingHandlers[data.chatId].forEach(handler => handler(data));
    }
  }

  // Durum güncellemelerini işleme
  handleStatusUpdate(data) {
    if (this.statusHandlers[data.chatId]) {
      this.statusHandlers[data.chatId].forEach(handler => handler(data));
    }
  }

  // Bildirimleri işleme
  handleNotification(notification) {
    if (this.notificationHandlers.global) {
      this.notificationHandlers.global.forEach(handler => handler(notification));
    }
  }

  // Arkadaşlık güncellemelerini işleme
  handleFriendshipUpdate(data) {
    if (this.notificationHandlers.friendship) {
      this.notificationHandlers.friendship.forEach(handler => handler(data));
    }
  }
}

export default new WebSocketService(); 