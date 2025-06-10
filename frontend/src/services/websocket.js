import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const SOCKET_URL = 'https://backend-gq5v.onrender.com/ws';
let stompClient = null;
let statusSubscription = null;
let friendshipSubscription = null;
let messageSubscription = null;
let statusCallbacks = [];
let friendshipCallbacks = [];
let messageCallbacks = [];

// WebSocket bağlantısını kur - Promise döndür
export const connectWebSocket = () => {
  return new Promise((resolve, reject) => {
    // Mevcut bağlantıyı temizle
    if (stompClient) {
      try {
        // Eğer aktif bir bağlantı varsa önce kapat
        if (stompClient.active) {
          console.log('Mevcut WebSocket bağlantısı kapatılıyor...');
          stompClient.deactivate();
        }
        // Referansı temizle
        stompClient = null;
      } catch (e) {
        console.warn('Mevcut bağlantı kapatılırken hata:', e);
        // Hata olsa bile devam et, yeni bağlantı kurmayı dene
      }
    }

    console.log('WebSocket bağlantısı kuruluyor...');
    
    // Kimlik doğrulama token'ını al
    let token = null;
    
    // Önce localStorage'dan 'token' olarak al
    try {
      token = localStorage.getItem('token');
      if (token) {
        console.log('WebSocket için token bulundu');
      }
    } catch (e) {
      console.warn('Token alınırken hata:', e);
    }
    
    // Token bulunamadıysa, user objesinden almayı dene
    if (!token) {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.token) {
          token = user.token;
          console.log('WebSocket için token user objesinden alındı');
        }
      } catch (e) {
        console.warn('User objesinden token alınırken hata:', e);
      }
    }
    
    // Token yoksa bağlantı kurulamaz - bildirim göster ve başarısız ol
    if (!token) {
      console.warn('WebSocket bağlantısı için token bulunamadı, kullanıcı henüz giriş yapmamış olabilir');
      // Token yoksa kullanıcıya bildirim göstermeyi düşünebilirsiniz
      return resolve({ connected: false, reason: 'no-token' });
    }
    
    try {
      // SockJS bağlantısı kur
      const socket = new SockJS(SOCKET_URL);
      
      // Stomp client oluştur
      stompClient = new Client({
        webSocketFactory: () => socket,
        debug: (str) => {
          // Debug modda logları göster, üretimde kapatılabilir
          if (process.env.NODE_ENV !== 'production') {
            console.debug('STOMP:', str);
          }
        },
        // Bağlantı kesintilerinde tekrar bağlanma stratejisi
        reconnectDelay: 5000, // 5 saniyede bir tekrar bağlanmayı dene
        maxRetries: 10, // Maksimum yeniden bağlanma denemesi
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        // Bağlantı başlıklarına token ekle
        connectHeaders: {
          'Authorization': `Bearer ${token}`
        },
        // Otomatik yeniden bağlanma stratejisi ekle
        beforeConnect: () => {
          console.log('WebSocket bağlantısı kuruluyor...');
        },
        onStompError: (frame) => {
          console.error('STOMP hatası:', frame);
        }
      });

      // Bağlantı kurulduğunda yapılacak işlemler
      stompClient.onConnect = (frame) => {
        console.log('WebSocket bağlantısı kuruldu:', frame);
        
        try {
          // Durum değişikliklerini dinle
          subscribeToStatusUpdates();
          // Arkadaşlık değişikliklerini dinle
          subscribeToFriendshipUpdates();
          // Mesaj güncellemelerini dinle
          subscribeToMessages();
          
          // Bağlantı başarılı
          resolve({ connected: true, client: stompClient });
        } catch (subscribeError) {
          console.error('Abonelikler sırasında hata:', subscribeError);
          reject(subscribeError);
        }
      };

      // Bağlantı hatası olduğunda yapılacak işlemler
      stompClient.onStompError = (frame) => {
        const errorMsg = `WebSocket bağlantı hatası: ${frame.headers['message']}`;
        console.error(errorMsg);
        console.error('Ek detaylar:', frame.body);
        reject(new Error(errorMsg));
      };
      
      // Bağlantı kesildiğinde
      stompClient.onWebSocketClose = (event) => {
        console.warn('WebSocket bağlantısı kesildi:', event);
        // Kullanıcıya bağlantı kesildi bildirimi gösterebilirsiniz
        // Burada UI'da bir bildirim göstermek için bir callback çağrılabilir
        
        // Otomatik yeniden bağlanma (stompClient içinde yapılandırıldı)
      };
      
      // WebSocket hata durumunda
      stompClient.onWebSocketError = (event) => {
        console.error('WebSocket hatası:', event);
        // Kullanıcıya bağlantı hatası bildirimi gösterebilirsiniz
      };

      // Bağlantıyı başlat
      stompClient.activate();
      console.log('WebSocket bağlantısı aktifleştiriliyor...');
      
      // 15 saniye içinde bağlantı kurulmazsa timeout
      setTimeout(() => {
        if (stompClient && !stompClient.active) {
          const timeoutError = new Error('WebSocket bağlantısı zaman aşımına uğradı');
          console.error(timeoutError.message);
          reject(timeoutError);
        }
      }, 15000);
      
    } catch (error) {
      console.error('WebSocket bağlantısı kurulurken hata:', error);
      reject(error);
    }
  });
};

// WebSocket bağlantısını kapat
export const disconnectWebSocket = () => {
  if (stompClient) {
    // Abonelikleri iptal et
    if (statusSubscription) {
      statusSubscription.unsubscribe();
      statusSubscription = null;
    }
    
    if (friendshipSubscription) {
      friendshipSubscription.unsubscribe();
      friendshipSubscription = null;
    }
    
    if (messageSubscription) {
      messageSubscription.unsubscribe();
      messageSubscription = null;
    }
    
    // Bağlantıyı kapat
    if (stompClient.active) {
      stompClient.deactivate();
      console.log('WebSocket bağlantısı kapatıldı');
    }
    
    stompClient = null;
  }
};

// Durum değişikliklerini dinleme
const subscribeToStatusUpdates = () => {
  if (!stompClient || !stompClient.active) {
    console.error('Durum güncellemelerine abone olmak için WebSocket bağlantısı gerekiyor');
    return;
  }
  
  // "/topic/status" kanalına abone ol
  statusSubscription = stompClient.subscribe('/topic/status', (message) => {
    try {
      const statusUpdate = JSON.parse(message.body);
      console.log('Durum güncellemesi alındı:', statusUpdate);
      
      // Kayıtlı tüm callback fonksiyonlarını çağır
      statusCallbacks.forEach(callback => {
        try {
          callback(statusUpdate);
        } catch (e) {
          console.error('Status callback çalıştırılırken hata:', e);
        }
      });
      
    } catch (e) {
      console.error('Durum güncellemesi işlenirken hata:', e);
    }
  });
  
  console.log('Durum güncellemelerine abone olundu');
};

// Arkadaşlık değişikliklerini dinleme
const subscribeToFriendshipUpdates = () => {
  if (!stompClient || !stompClient.active) {
    console.error('Arkadaşlık güncellemelerine abone olmak için WebSocket bağlantısı gerekiyor');
    return;
  }
  
  // "/topic/friendship" kanalına abone ol
  friendshipSubscription = stompClient.subscribe('/topic/friendship', (message) => {
    try {
      const friendshipUpdate = JSON.parse(message.body);
      console.log('Arkadaşlık güncellemesi alındı:', friendshipUpdate);
      
      // Kayıtlı tüm callback fonksiyonlarını çağır
      friendshipCallbacks.forEach(callback => {
        try {
          callback(friendshipUpdate);
        } catch (e) {
          console.error('Friendship callback çalıştırılırken hata:', e);
        }
      });
      
    } catch (e) {
      console.error('Arkadaşlık güncellemesi işlenirken hata:', e);
    }
  });
  
  console.log('Arkadaşlık güncellemelerine abone olundu');
};

// Durum değişikliği callback fonksiyonu ekle
export const addStatusUpdateListener = (callback) => {
  if (typeof callback === 'function') {
    statusCallbacks.push(callback);
    return true;
  }
  return false;
};

// Durum değişikliği callback fonksiyonu kaldır
export const removeStatusUpdateListener = (callback) => {
  const index = statusCallbacks.indexOf(callback);
  if (index !== -1) {
    statusCallbacks.splice(index, 1);
    return true;
  }
  return false;
};

// Arkadaşlık değişikliği callback fonksiyonu ekle
export const addFriendshipUpdateListener = (callback) => {
  if (typeof callback === 'function') {
    friendshipCallbacks.push(callback);
    return true;
  }
  return false;
};

// Arkadaşlık değişikliği callback fonksiyonu kaldır
export const removeFriendshipUpdateListener = (callback) => {
  const index = friendshipCallbacks.indexOf(callback);
  if (index !== -1) {
    friendshipCallbacks.splice(index, 1);
    return true;
  }
  return false;
};

// Durum mesajı gönder
export const sendStatusUpdate = (userId, username, isOnline) => {
  if (!stompClient || !stompClient.active) {
    console.error('Durum güncellemesi göndermek için WebSocket bağlantısı gerekiyor');
    return false;
  }
  
  const statusMessage = {
    userId,
    username,
    online: isOnline,
    timestamp: new Date()
  };
  
  stompClient.publish({
    destination: '/app/status',
    body: JSON.stringify(statusMessage)
  });
  
  console.log('Durum güncellemesi gönderildi:', statusMessage);
  return true;
};

// Mesaj güncellemelerini dinleme
const subscribeToMessages = () => {
  if (!stompClient || !stompClient.active) {
    console.error('Mesaj güncellemelerine abone olmak için WebSocket bağlantısı gerekiyor');
    return;
  }
  
  try {
    // Kullanıcı bilgilerini al - token'dan veya user nesnesinden
    let token = localStorage.getItem('token');
    let user = null;
    
    try {
      // Önce token'ı kontrol et
      if (!token) {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          user = JSON.parse(userStr);
          if (user && user.token) {
            token = user.token;
          }
        }
      }
      
      // Eğer user nesnesi yoksa token'dan bilgileri çıkar
      if (!user && token) {
        // Token'dan kullanıcı bilgilerini al (JWT decode)
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload && payload.sub) {
            user = {
              username: payload.sub,
              id: payload.id || payload.userId
            };
          }
        }
      }
    } catch (e) {
      console.error('Kullanıcı bilgileri alınırken hata:', e);
    }
    
    if (!user || !user.username) {
      console.error('Mesaj güncellemelerine abone olmak için kullanıcı bilgisi gerekiyor, ancak bulunamadı');
      return;
    }
    
    console.log(`${user.username} kullanıcısı için mesaj aboneliği başlatılıyor...`);
    
    // 1. Kullanıcıya özel kanala abone ol - '/user/{username}/queue/messages'
    const userQueue = `/user/${user.username}/queue/messages`;
    messageSubscription = stompClient.subscribe(userQueue, (message) => {
      try {
        const messageData = JSON.parse(message.body);
        console.log(`'${userQueue}' kanalından yeni mesaj alındı:`, messageData);
        
        // Mesajı daha kullanışlı hale getir
        const enhancedMessage = {
          ...messageData,
          timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date(),
          // Mesajın kendi kullanıcımızdan gelip gelmediğini belirle
          isMine: messageData.senderId === user.id || 
                 (messageData.sender && messageData.sender.id === user.id)
        };
        
        // Kayıtlı tüm callback fonksiyonlarını çağır
        messageCallbacks.forEach(callback => {
          try {
            callback(enhancedMessage);
          } catch (e) {
            console.error('Message callback çalıştırılırken hata:', e);
          }
        });
        
      } catch (e) {
        console.error('Mesaj işlenirken hata:', e);
      }
    });
    
    // 2. Ayrıca genel mesaj kanalına da abone ol - '/topic/messages'
    stompClient.subscribe('/topic/messages', (message) => {
      try {
        const messageData = JSON.parse(message.body);
        console.log("Genel mesaj kanalından mesaj alındı:", messageData);
        
        // Mesajı daha kullanışlı hale getir
        const enhancedMessage = {
          ...messageData,
          timestamp: messageData.timestamp ? new Date(messageData.timestamp) : new Date(),
          // Mesajın kendi kullanıcımızdan gelip gelmediğini belirle
          isMine: messageData.senderId === user.id || 
                 (messageData.sender && messageData.sender.id === user.id)
        };
        
        // Kayıtlı tüm callback fonksiyonlarını çağır
        messageCallbacks.forEach(callback => {
          try {
            callback(enhancedMessage);
          } catch (e) {
            console.error('Message callback çalıştırılırken hata:', e);
          }
        });
      } catch (e) {
        console.error('Mesaj işlenirken hata:', e);
      }
    });
    
    console.log('Mesaj güncellemelerine başarıyla abone olundu');
  } catch (error) {
    console.error('Mesaj abonelikleri sırasında hata:', error);
  }
};

// Mesaj güncelleme callback fonksiyonu ekle
export const addMessageListener = (callback) => {
  if (typeof callback === 'function') {
    messageCallbacks.push(callback);
    return true;
  }
  return false;
};

// Mesaj güncelleme callback fonksiyonu kaldır
export const removeMessageListener = (callback) => {
  const index = messageCallbacks.indexOf(callback);
  if (index !== -1) {
    messageCallbacks.splice(index, 1);
    return true;
  }
  return false;
};

// Mesaj gönder
export const sendChatMessage = async (chatId, content) => {
  if (!chatId || !content) {
    console.error('Geçersiz chatId veya içerik');
    return { success: false, error: 'Geçersiz mesaj bilgileri' };
  }
  
  // Mesaj nesnesini oluştur
  const chatMessage = {
    chatId,
    content,
    type: 'CHAT',
    timestamp: new Date()
  };
  
  try {
    // WebSocket bağlantısını kontrol et ve gerekirse yeniden bağlan
    let connection;
    let reconnected = false;
    
    try {
      // Daha güvenli bir bağlantı kontrolü yap
      connection = await ensureConnected();
      
      if (!connection.connected) {
        throw new Error('WebSocket bağlantısı kurulamadı: ' + (connection.reason || 'Bilinmeyen sebep'));
      }
      
      // Bağlantı başarılı, stompClient'ı kullan
      reconnected = true;
      console.log('WebSocket bağlantısı başarıyla sağlandı, mesaj gönderiliyor...');
    } catch (connError) {
      console.error('WebSocket bağlantısı kurulamadı:', connError.message);
      return { 
        success: false, 
        error: 'WebSocket bağlantısı kurulamadı: ' + connError.message 
      };
    }
    
    // stompClient null değilse ve aktifse devam et
    if (!stompClient || !stompClient.active) {
      console.error('WebSocket bağlantısı aktif değil, mesaj gönderilemedi');
      return { 
        success: false, 
        error: 'WebSocket bağlantısı aktif değil. Lütfen sayfayı yenileyip tekrar deneyin.' 
      };
    }
    
    // STOMP bağlantısının hazır olduğundan emin ol
    if (reconnected) {
      // Yeni bağlantı kurulduysa kısa bir bekleme süresi ekle
      // Bu, STOMP bağlantısının tam olarak hazır olmasını sağlar
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // WebSocket üzerinden mesaj gönder
    try {
      // STOMP bağlantısının hazır olduğundan emin ol
      if (!stompClient || !stompClient.connected) {
        throw new Error('STOMP bağlantısı hazır değil');
      }
      
      // Mesajı gönder
      stompClient.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage),
        headers: {}
      });
      
      console.log('Mesaj WebSocket üzerinden başarıyla gönderildi:', chatMessage);
      return { success: true, message: chatMessage };
    } catch (wsError) {
      console.error('WebSocket üzerinden mesaj gönderme hatası:', wsError);
      
      // STOMP bağlantı hatası durumunda yeniden bağlantı kurmayı dene
      if (wsError.message && wsError.message.includes('no underlying STOMP connection')) {
        console.log('STOMP bağlantısı sorunu tespit edildi, yeniden bağlantı deneniyor...');
        
        try {
          // Mevcut bağlantıyı tamamen kapat
          if (stompClient) {
            try {
              stompClient.deactivate();
            } catch (e) {
              console.warn('Bağlantı kapatılırken hata:', e);
            }
          }
          
          // Referansı temizle
          stompClient = null;
          
          // Yeni bağlantı kur
          const newConnection = await connectWebSocket();
          
          // Bağlantının başarılı olduğunu kontrol et
          if (!newConnection.connected) {
            throw new Error('Yeniden bağlantı kurulamadı: ' + (newConnection.reason || 'Bilinmeyen sebep'));
          }
          
          // Bağlantının hazır olmasını bekle
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Mesajı tekrar göndermeyi dene
          if (stompClient && stompClient.active && stompClient.connected) {
            stompClient.publish({
              destination: '/app/chat.sendMessage',
              body: JSON.stringify(chatMessage),
              headers: {}
            });
            
            console.log('Mesaj yeniden bağlantı sonrası başarıyla gönderildi:', chatMessage);
            return { success: true, message: chatMessage };
          } else {
            throw new Error('STOMP bağlantısı yeniden kuruldu ama aktif değil');
          }
        } catch (retryError) {
          console.error('Yeniden bağlantı sonrası mesaj gönderme hatası:', retryError);
          return { 
            success: false, 
            error: 'Mesaj yeniden gönderme hatası: ' + (retryError.message || 'Yeniden bağlantı hatası')
          };
        }
      }
      
      return { 
        success: false, 
        error: 'Mesaj gönderme hatası: ' + (wsError.message || 'WebSocket bağlantı hatası')
      };
    }
  } catch (error) {
    console.error('Mesaj gönderme işlemi sırasında beklenmeyen hata:', error);
    return { 
      success: false, 
      error: 'Mesaj gönderme hatası: ' + (error.message || 'Bilinmeyen hata')
    };
  }
};

// Sohbete katıl bildirimi gönder
export const joinChat = (chatId) => {
  if (!chatId) {
    console.error('Geçersiz chatId:', chatId);
    return false;
  }
  
  // Doğru formatı kontrol et - sayı değilse sayıya çevir
  const numericChatId = Number(chatId);
  if (isNaN(numericChatId)) {
    console.error('ChatId sayısal bir değere çevrilemedi:', chatId);
    return false;
  }
  
  console.log('Sohbete katılma çağrısı - chatId (orijinal):', chatId);
  console.log('Sohbete katılma çağrısı - chatId (sayısal):', numericChatId);
  
  // WebSocket bağlantısı yoksa bağlantı kurmayı dene
  if (!stompClient || !stompClient.active) {
    console.warn('WebSocket bağlantısı aktif değil, bağlantı kurulmaya çalışılıyor...');
    try {
      connectWebSocket();
      
      // Bağlantı kurulurken biraz bekle
      console.log('WebSocket bağlantısı kurulduğunda sohbete katılınacak');
      
      // Bağlantı kurulduğunda sohbete katılmak için bir event listener ekle
      const checkAndJoin = () => {
        if (stompClient && stompClient.active) {
          // Bağlantı kurulduğunda mesaj gönder
          sendJoinMessage(numericChatId);
          return true;
        }
        return false;
      };
      
      // Hemen dene
      if (checkAndJoin()) {
        return true;
      }
      
      // Başarısız olursa sessizce devam et
      console.warn('WebSocket bağlantısı kurulamadı, sohbete katılınamadı');
      return false;
    } catch (error) {
      console.error('WebSocket bağlantısı kurulurken hata:', error);
      return false;
    }
  }
  
  // Bağlantı varsa doğrudan mesaj gönder
  return sendJoinMessage(numericChatId);
};

// Sohbete katılma mesajını gönder (joinChat'in yardımcı fonksiyonu)
const sendJoinMessage = (chatId) => {
  try {
    if (!stompClient || !stompClient.active) {
      console.error('STOMP client aktif değil, sohbete katılma mesajı gönderilemedi');
      return false;
    }
    
    const joinMessage = {
      chatId: chatId,
      type: 'JOIN',
      timestamp: new Date()
    };
    
    console.log('Oluşturulan katılma mesajı:', joinMessage);
    
    stompClient.publish({
      destination: '/app/chat.join',
      body: JSON.stringify(joinMessage),
      headers: {}
    });
    
    console.log('Sohbete katılma bildirimi gönderildi:', joinMessage);
    return true;
  } catch (error) {
    console.error('Sohbete katılma bildirimi gönderilirken hata:', error);
    return false;
  }
};

// WebSocket bağlantısının durumunu kontrol et
export const isConnected = () => {
  return stompClient && stompClient.active && stompClient.connected;
};

// WebSocket bağlantısını güvenli şekilde tekrar kurmayı dene
export const ensureConnected = async () => {
  // Eğer bağlantı zaten kuruluysa, devam et
  if (isConnected()) {
    console.log('WebSocket bağlantısı zaten kurulu');
    return true;
  }
  
  console.log('WebSocket bağlantısı kuruluyor...');
  
  // Birden fazla aynı anda bağlantı denemesini önlemek için
  // Statik bir değişken kullanarak bağlantı durumunu takip edebiliriz
  if (window._webSocketConnecting) {
    console.log('WebSocket bağlantısı zaten kurulmaya çalışılıyor, bekleyiniz...');
    
    // En fazla 5 saniye bekle
    return new Promise((resolve) => {
      let checkCount = 0;
      const maxChecks = 10; // 5 saniye (500ms * 10)
      
      const checkInterval = setInterval(() => {
        checkCount++;
        
        if (isConnected()) {
          clearInterval(checkInterval);
          resolve(true);
        }
        
        if (checkCount >= maxChecks) {
          clearInterval(checkInterval);
          // Bağlantı kurulamadı, yeni bir bağlantı denemesi başlat
          window._webSocketConnecting = false;
          resolve(false);
        }
      }, 500);
    });
  }
  
  // Bağlantı kurulmaya başlandığını işaretle
  window._webSocketConnecting = true;
  
  try {
    // Bağlantıyı kur
    const result = await connectWebSocket();
    window._webSocketConnecting = false;
    
    if (result && result.connected) {
      console.log('WebSocket bağlantısı başarıyla kuruldu');
      return true;
    } else {
      console.warn('WebSocket bağlantısı kurulamadı:', result ? result.reason : 'bilinmeyen sebep');
      // Kullanıcıya bildirim gösterilebilir
      return false;
    }
  } catch (error) {
    window._webSocketConnecting = false;
    console.error('WebSocket bağlantısı kurulurken hata:', error);
    // Kullanıcıya hata bildirimi gösterilebilir
    return false;
  }
};

export default {
  connectWebSocket,
  disconnectWebSocket,
  addStatusUpdateListener,
  removeStatusUpdateListener,
  addFriendshipUpdateListener,
  removeFriendshipUpdateListener,
  addMessageListener,
  removeMessageListener,
  sendStatusUpdate,
  sendChatMessage,
  joinChat,
  isConnected,
  ensureConnected
}; 