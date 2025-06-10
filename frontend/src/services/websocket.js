import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

// WebSocket URL'sini dinamik olarak belirle
const getWebSocketUrl = () => {
  // Öncelikle yapılandırılmış URL'yi kullan
  const mainWsUrl = 'https://backend-gq5v.onrender.com/ws';
  
  // Geliştirme ortamında localhost'u kullan
  if (process.env.NODE_ENV === 'development' && window.location.hostname === 'localhost') {
    return 'http://localhost:8080/ws';
  }
  
  // Mobil cihazlar için CORS sorunlarını önlemek için URL'yi ayarla
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  if (isMobile) {
    console.log('Mobil cihaz için WebSocket URL:', mainWsUrl);
  }
  
  return mainWsUrl;
};

const SOCKET_URL = getWebSocketUrl();
console.log('WebSocket URL:', SOCKET_URL);

let stompClient = null;
let statusSubscription = null;
let friendshipSubscription = null;
let messageSubscription = null;
let groupMessageSubscription = null; // Grup mesajları için abonelik
let statusCallbacks = [];
let friendshipCallbacks = [];
let messageCallbacks = [];
let groupMessageCallbacks = []; // Grup mesajları için callback'ler
let connectAttempts = 0;
const MAX_CONNECT_ATTEMPTS = 5;

// WebSocket bağlantısını kur - Promise döndür
export const connectWebSocket = () => {
  return new Promise((resolve, reject) => {
    // Bağlantı deneme sayısını artır
    connectAttempts++;
    console.log(`WebSocket bağlantısı deneme #${connectAttempts}`);
    
    // Mobil tarayıcı kontrolü
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    console.log(`Cihaz tipi: ${isMobile ? 'Mobil' : 'Desktop'}`);
    console.log(`Tarayıcı: ${navigator.userAgent}`);
    
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
      console.log('SockJS bağlantısı hazırlanıyor:', SOCKET_URL);
      
      // SockJS transport kontrolleri
      const sockJsTransportOptions = {
        transports: ['websocket', 'xhr-streaming', 'xhr-polling']
      };
      
      // Stomp client oluştur
      stompClient = new Client({
        // WebSocket fabrikası fonksiyonu düzeltildi
        webSocketFactory: () => {
          console.log('WebSocket fabrikası oluşturuluyor...');
          // Yeni SockJS bağlantısı oluştur
          const sockJsInstance = new SockJS(SOCKET_URL, null, sockJsTransportOptions);
          // withCredentials ayarını etkinleştir
          sockJsInstance.withCredentials = true;
          
          // Bağlantı event handler'ları
          sockJsInstance.onopen = () => {
            console.log('SockJS bağlantısı açıldı');
            console.log('Transport tipi:', sockJsInstance._transport ? sockJsInstance._transport.transportName : 'bilinmiyor');
            console.log('Credentials gönderiliyor mu:', sockJsInstance.withCredentials ? 'Evet' : 'Hayır');
          };
          
          sockJsInstance.onclose = (event) => {
            console.log('SockJS bağlantısı kapandı:', event);
            console.log('Bağlantı neden kapandı:', event.reason || 'bilinmiyor');
          };
          
          sockJsInstance.onerror = (error) => {
            console.error('SockJS bağlantı hatası:', error);
            // Mobil için ek hata bilgisi
            if (isMobile) {
              console.error('Mobil cihazda WebSocket bağlantı hatası. Detaylar:', error);
            }
          };
          
          return sockJsInstance;
        },
        debug: (str) => {
          // Debug modda logları göster, üretimde kapatılabilir
          console.debug('STOMP:', str);
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
        // CORS ayarı için withCredentials true olarak ayarlandı
        withCredentials: true,
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
        connectAttempts = 0; // Başarılı bağlantıda sayacı sıfırla
        
        try {
          // Durum değişikliklerini dinle
          subscribeToStatusUpdates();
          // Arkadaşlık değişikliklerini dinle
          subscribeToFriendshipUpdates();
          // Mesaj güncellemelerini dinle
          subscribeToMessages();
          // Grup mesajlarını dinle
          subscribeToGroupMessages();
          
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
        
        // Mobil için ek hata bilgisi
        if (isMobile) {
          console.error('Mobil cihazda STOMP hatası:', frame);
        }
        
        // STOMP hatası - başarısız
        reject(new Error(errorMsg));
      };
      
      // Bağlantı başarısız olduğunda
      stompClient.onWebSocketError = (event) => {
        console.error('WebSocket hatası:', event);
        reject(new Error('WebSocket bağlantı hatası'));
      };
      
      // Bağlantı kesildiğinde
      stompClient.onWebSocketClose = (event) => {
        console.log('WebSocket bağlantısı kesildi:', event);
      };
      
      // Bağlantıyı aktifleştir
      console.log('WebSocket bağlantısı aktifleştiriliyor...');
      stompClient.activate();
      
    } catch (error) {
      console.error('WebSocket bağlantısı kurulurken hata:', error);
      reject(error);
    }
  });
};

// WebSocket bağlantısını kapat
export const disconnectWebSocket = () => {
  // Callback listelerini temizle
  statusCallbacks = [];
  friendshipCallbacks = [];
  messageCallbacks = [];
  groupMessageCallbacks = []; // Grup mesaj callback'lerini temizle
  
  // Abonelikleri iptal et
  if (statusSubscription) {
    try {
      statusSubscription.unsubscribe();
    } catch (e) {
      console.warn('Durum aboneliği kapatılırken hata:', e);
    }
    statusSubscription = null;
  }
  
  if (friendshipSubscription) {
    try {
      friendshipSubscription.unsubscribe();
    } catch (e) {
      console.warn('Arkadaşlık aboneliği kapatılırken hata:', e);
    }
    friendshipSubscription = null;
  }
  
  if (messageSubscription) {
    try {
      messageSubscription.unsubscribe();
    } catch (e) {
      console.warn('Mesaj aboneliği kapatılırken hata:', e);
    }
    messageSubscription = null;
  }
  
  if (groupMessageSubscription) {
    try {
      groupMessageSubscription.unsubscribe();
    } catch (e) {
      console.warn('Grup mesaj aboneliği kapatılırken hata:', e);
    }
    groupMessageSubscription = null;
  }
  
  // Bağlantıyı kapat
  if (stompClient.active) {
    stompClient.deactivate();
    console.log('WebSocket bağlantısı kapatıldı');
  }
  
  stompClient = null;
  connectAttempts = 0; // Sayacı sıfırla
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
  try {
    return stompClient !== null && stompClient.active === true;
  } catch (error) {
    console.error('WebSocket bağlantı durumu kontrol edilirken hata:', error);
    return false;
  }
};

// WebSocket bağlantısını güvenli şekilde tekrar kurmayı dene
export const ensureConnected = async () => {
  try {
    // Eğer bağlantı zaten kuruluysa, devam et
    if (isConnected()) {
      console.log('WebSocket bağlantısı zaten kurulu');
      return { connected: true };
    }
    
    console.log('WebSocket bağlantısı kuruluyor...');
    
    // Birden fazla aynı anda bağlantı denemesini önlemek için
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
            resolve({ connected: true });
          }
          
          if (checkCount >= maxChecks) {
            clearInterval(checkInterval);
            // Bağlantı kurulamadı, yeni bir bağlantı denemesi başlat
            window._webSocketConnecting = false;
            resolve({ connected: false, reason: 'timeout' });
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
      
      return result; // { connected: true/false, reason: string }
    } catch (error) {
      window._webSocketConnecting = false;
      console.error('WebSocket bağlantısı kurulurken hata:', error);
      return { connected: false, reason: error.message || 'unknown-error' };
    }
  } catch (error) {
    console.error('ensureConnected fonksiyonunda beklenmeyen hata:', error);
    return { connected: false, reason: 'unexpected-error' };
  }
};

// WebSocket bağlantı durumunu global olarak kontrol edebilmek için yardımcı fonksiyon
export const isWebSocketConnected = () => {
  // Bu fonksiyon diğer dosyalardan doğrudan kontrol edilebilir
  return stompClient !== null && stompClient.active === true;
};

// WebSocket bağlantısını kurmak için Promise döndüren bir fonksiyon
export const getWebSocketConnection = () => {
  return new Promise(async (resolve) => {
    try {
      if (isWebSocketConnected()) {
        // Zaten bağlantı varsa hemen döndür
        resolve({ connected: true, client: stompClient });
        return;
      }
      
      // Yeni bağlantı kur
      const connection = await connectWebSocket();
      resolve(connection);
    } catch (error) {
      console.error('WebSocket bağlantısı alınırken hata:', error);
      resolve({ connected: false, reason: error.message || 'unknown-error' });
    }
  });
};

// Grup mesajları için abonelik
const subscribeToGroupMessages = () => {
  if (!stompClient || !stompClient.connected) {
    console.error('Grup mesajlarına abone olunamıyor - WebSocket bağlantısı yok');
    return;
  }
  
  try {
    // Eski aboneliği temizle
    if (groupMessageSubscription) {
      groupMessageSubscription.unsubscribe();
      groupMessageSubscription = null;
    }
    
    // Kullanıcı bilgilerini al
    let userId;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      userId = user?.id;
      if (!userId) {
        console.warn('Kullanıcı ID bulunamadı, grup mesaj aboneliği yapılamıyor');
        return;
      }
    } catch (e) {
      console.error('Kullanıcı bilgileri alınamadı:', e);
      return;
    }
    
    console.log('Grup mesajları için abonelik başlatılıyor...');
    
    // Genel grup mesajları için abone ol
    groupMessageSubscription = stompClient.subscribe('/topic/group-messages', (message) => {
      // Grup mesajını al
      try {
        const groupMessage = JSON.parse(message.body);
        
        console.log('Grup mesajı alındı:', groupMessage);
        
        // Callback'leri çağır
        groupMessageCallbacks.forEach(callback => {
          try {
            callback(groupMessage);
          } catch (callbackError) {
            console.error('Grup mesajı callback hatası:', callbackError);
          }
        });
      } catch (parseError) {
        console.error('Grup mesajı işlenirken hata:', parseError);
      }
    });
    
    console.log('Grup mesajlarına başarıyla abone olundu');
    
  } catch (error) {
    console.error('Grup mesajlarına abone olunurken hata:', error);
  }
};

// Grup mesaj dinleyicisi ekle
export const addGroupMessageListener = (callback) => {
  if (typeof callback === 'function' && !groupMessageCallbacks.includes(callback)) {
    groupMessageCallbacks.push(callback);
    console.log('Grup mesaj dinleyicisi eklendi, toplam:', groupMessageCallbacks.length);
  }
};

// Grup mesaj dinleyicisini kaldır
export const removeGroupMessageListener = (callback) => {
  const index = groupMessageCallbacks.indexOf(callback);
  if (index !== -1) {
    groupMessageCallbacks.splice(index, 1);
    console.log('Grup mesaj dinleyicisi kaldırıldı, kalan:', groupMessageCallbacks.length);
  }
};

// Grup mesajı gönder
export const sendGroupMessage = async (groupId, content) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!stompClient) {
        console.log('WebSocket bağlantısı kurulmadı, bağlantı kuruluyor...');
        try {
          // Bağlantı kurulmadıysa önce kur
          const connection = await connectWebSocket();
          if (!connection.connected) {
            console.error('WebSocket bağlantısı kurulamadı');
            reject(new Error('WebSocket bağlantısı kurulamadı'));
            return;
          }
        } catch (err) {
          console.error('WebSocket bağlantısı kurulamadı:', err);
          reject(new Error('WebSocket bağlantısı kurulamadı'));
          return;
        }
      }
      
      // StompClient aktif değilse bağlantı kur
      if (!stompClient.active) {
        console.log('StompClient aktif değil, yeniden bağlanılıyor...');
        stompClient.activate();
        
        // Bağlantı kurulana kadar bekle (maksimum 5 saniye)
        let attempts = 0;
        const maxAttempts = 10;
        const waitForConnection = () => {
          return new Promise((resolveWait, rejectWait) => {
            const check = () => {
              if (stompClient.active) {
                console.log('StompClient yeniden aktif edildi');
                resolveWait();
              } else if (attempts >= maxAttempts) {
                console.error(`Maksimum bağlantı denemesi (${maxAttempts}) aşıldı`);
                rejectWait(new Error('WebSocket bağlantısı kurulamadı - zaman aşımı'));
              } else {
                attempts++;
                console.log(`StompClient bağlantısı bekleniyor... (${attempts}/${maxAttempts})`);
                setTimeout(check, 500);
              }
            };
            check();
          });
        };
        
        try {
          await waitForConnection();
        } catch (err) {
          console.error('StompClient aktifleştirilemedi:', err);
          reject(err);
          return;
        }
      }
      
      if (!stompClient.connected) {
        console.error('WebSocket bağlantısı kurulmadı - grup mesajı gönderilemiyor');
        reject(new Error('WebSocket bağlantısı yok'));
        return;
      }
      
      console.log(`Grup mesajı gönderiliyor: ${groupId}`);
      
      // Mesaj gönder
      stompClient.publish({
        destination: `/app/group.message.${groupId}`,
        body: JSON.stringify({ 
          groupId: groupId,
          content: content,
          type: 'MESSAGE'
        }),
        headers: { 'content-type': 'application/json' }
      });
      
      console.log(`Grup ${groupId} mesajı gönderildi`);
      resolve(true);
    } catch (error) {
      console.error('Grup mesajı gönderilirken hata:', error);
      reject(error);
    }
  });
};

// Bir gruba katıl
export const joinGroup = async (groupId) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!stompClient) {
        console.log('WebSocket bağlantısı kurulmadı, bağlantı kuruluyor...');
        try {
          // Bağlantı kurulmadıysa önce kur
          const connection = await connectWebSocket();
          if (!connection.connected) {
            console.error('WebSocket bağlantısı kurulamadı');
            reject(new Error('WebSocket bağlantısı kurulamadı'));
            return;
          }
        } catch (err) {
          console.error('WebSocket bağlantısı kurulamadı:', err);
          reject(new Error('WebSocket bağlantısı kurulamadı'));
          return;
        }
      }
      
      // StompClient aktif değilse bağlantı kur
      if (!stompClient.active) {
        console.log('StompClient aktif değil, yeniden bağlanılıyor...');
        stompClient.activate();
        
        // Bağlantı kurulana kadar bekle (maksimum 5 saniye)
        let attempts = 0;
        const maxAttempts = 10;
        const waitForConnection = () => {
          return new Promise((resolveWait, rejectWait) => {
            const check = () => {
              if (stompClient.active) {
                console.log('StompClient yeniden aktif edildi');
                resolveWait();
              } else if (attempts >= maxAttempts) {
                console.error(`Maksimum bağlantı denemesi (${maxAttempts}) aşıldı`);
                rejectWait(new Error('WebSocket bağlantısı kurulamadı - zaman aşımı'));
              } else {
                attempts++;
                console.log(`StompClient bağlantısı bekleniyor... (${attempts}/${maxAttempts})`);
                setTimeout(check, 500);
              }
            };
            check();
          });
        };
        
        try {
          await waitForConnection();
        } catch (err) {
          console.error('StompClient aktifleştirilemedi:', err);
          reject(err);
          return;
        }
      }
      
      if (!stompClient.connected) {
        console.error('WebSocket bağlantısı kurulmadı - gruba katılınamıyor');
        reject(new Error('WebSocket bağlantısı yok'));
        return;
      }
      
      console.log(`Gruba katılınıyor: ${groupId}`);
      
      // Grup katılma mesajı gönder
      stompClient.publish({
        destination: `/app/group.join.${groupId}`,
        body: JSON.stringify({ 
          groupId: groupId,
          type: 'JOIN'
        }),
        headers: { 'content-type': 'application/json' }
      });
      
      console.log(`Grup ${groupId} katılma mesajı gönderildi`);
      resolve(true);
    } catch (error) {
      console.error('Gruba katılırken hata:', error);
      reject(error);
    }
  });
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
  ensureConnected,
  isWebSocketConnected,
  getWebSocketConnection,
  addGroupMessageListener,
  removeGroupMessageListener,
  sendGroupMessage,
  joinGroup
}; 