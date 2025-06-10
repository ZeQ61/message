import axios from 'axios';

const API_URL = 'https://backend-gq5v.onrender.com';

// Normal kullanıcı API'si
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Admin API'si (ayrı bir instance)
const adminApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Normal kullanıcı istekleri için interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Admin istekleri için özel interceptor
adminApi.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('adminToken');
    console.log('Admin API isteği, token:', adminToken ? adminToken.substring(0, 15) + '...' : 'yok');
    
    if (adminToken) {
      config.headers['Authorization'] = `Bearer ${adminToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Kullanıcı API servisleri
export const userService = {
  // Kullanıcı girişi
  login: (username, password) => {
    return api.post('/user/login', { username, password });
  },
  
  // Kullanıcı kaydı
  register: (userData) => {
    return api.post('/user/register', userData);
  },
  
  // Profil bilgilerini getir
  getProfile: () => {
    return api.get('/user/profile');
  },
  
  // Profil bilgilerini güncelle
  updateProfile: (profileData) => {
    return api.put('/user/profile', profileData);
  },
  
  // Profil resmi yükleme
  uploadProfileImage: (imageFile) => {
    console.log("Profil resmi yükleme başlatılıyor:", imageFile.name, imageFile.type, imageFile.size);
    
    const formData = new FormData();
    // Dosyayı "image" adıyla ekle - controller'ın beklediği isim
    formData.append('image', imageFile, imageFile.name);
    
    // FormData içeriğini kontrol et
    console.log("FormData içeriği:");
    for (let pair of formData.entries()) {
      // İkinci eleman dosya ise detayları göster
      if (pair[1] instanceof File) {
        console.log(pair[0], ':', pair[1].name, pair[1].type, pair[1].size);
      } else {
        console.log(pair[0], ':', pair[1]);
      }
    }
    
    const token = localStorage.getItem('token');
    if (!token) {
      return Promise.reject(new Error('Oturum bulunamadı. Lütfen tekrar giriş yapın.'));
    }
    
    console.log("Token:", token ? token.substring(0, 15) + '...' : 'Yok');
    
    // XMLHttpRequest kullanarak daha güvenilir dosya yükleme
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // Zaman aşımı ayarla (30 saniye)
      xhr.timeout = 30000;
      
      // Zaman aşımı durumunda
      xhr.ontimeout = function() {
        console.error('Yükleme işlemi zaman aşımına uğradı');
        reject(new Error('Yükleme işlemi zaman aşımına uğradı. Lütfen tekrar deneyin.'));
      };
      
      // İlerleme bilgilerini kaydet
      xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          console.log(`Yükleniyor: %${percentComplete.toFixed(2)}`);
        }
      };
      
      xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const response = JSON.parse(xhr.responseText);
              console.log('Profil resmi yükleme başarılı:', response);
              resolve({ data: response });
            } catch (error) {
              console.error('Yanıt işleme hatası:', error);
              reject(new Error('Sunucu yanıtı işlenirken bir hata oluştu'));
            }
          } else {
            console.error('Profil resmi yükleme hatası:', xhr.status, xhr.statusText);
            
            // Yanıt tipine göre hata mesajı oluştur
            let errorMessage = `Yükleme hatası: ${xhr.status} ${xhr.statusText}`;
            try {
              if (xhr.responseText) {
                const errorResponse = JSON.parse(xhr.responseText);
                if (errorResponse && errorResponse.message) {
                  errorMessage = errorResponse.message;
                }
              }
            } catch (e) {
              console.error('Hata yanıtı işlenirken hata:', e);
            }
            
            reject(new Error(errorMessage));
          }
        }
      };
      
      // URL'yi ve metodu ayarla - Backend'in beklediği endpoint'i kullan
      xhr.open('POST', `${API_URL}/user/upload-profile-image`, true);
      
      // Token'ı ekle
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      
      // CORS ayarları - güvenli mod
      xhr.withCredentials = true;
      
      // Hata durumunda
      xhr.onerror = function() {
        console.error('Bağlantı hatası oluştu');
        reject(new Error('Sunucuya bağlanırken bir hata oluştu. Lütfen internet bağlantınızı kontrol edin.'));
      };
      
      // FormData gönder
      xhr.send(formData);
    });
  },
  
  // Kullanıcı online durumunu güncelle
  updateOnlineStatus: (isOnline) => {
    console.log('Sending online status update request:', isOnline);
    const token = localStorage.getItem('token');
    console.log('Authorization Token:', token ? 'Bearer ' + token.substring(0, 10) + '...' : 'Yok');
    
    if (!token) {
      console.error('Token bulunamadı!');
      return Promise.reject(new Error('Token bulunamadı'));
    }
    
    // Direkt API çağrısı
    const url = `${API_URL}/user/status`;
    console.log('Request URL:', url);
    
    // Veriyi JSON olarak hazırlama - isOnline değerini sadece boolean tipinde gönder
    const data = { isOnline: Boolean(isOnline) };
    console.log('Request Payload:', JSON.stringify(data));
    
    // API isteği
    return fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    .then(response => {
      if (!response.ok) {
        // HTTP durumunu incele
        const status = response.status;
        console.error('Server error:', status, response.statusText);
        
        // 401 veya 403 hataları için token sorununu işaret et
        if (status === 401 || status === 403) {
          throw new Error(`Yetkilendirme hatası: ${status}. Lütfen tekrar giriş yapın.`);
        }
        
        return response.text().then(text => {
          throw new Error(`Sunucu hatası: ${status} ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('Status update successful:', data);
      
      // Yanıtın doğru formatta olduğundan emin ol
      if (data && typeof data.isOnline === 'boolean') {
        return { data }; // axios formatına benzer bir yanıt formatı döndür
      } else {
        console.warn('API yanıtında isOnline değeri bulunamadı veya boolean değil:', data);
        // Eğer yanıt düzgün formatta değilse, gönderilen durumu kullan
        return { 
          data: { 
            ...data, 
            isOnline: Boolean(isOnline) 
          } 
        };
      }
    })
    .catch(error => {
      console.error('Error updating status:', error);
      throw error;
    });
  },
  
  // ARKADAŞLIK SİSTEMİ
  
  // Arkadaşlık isteği gönderme
  sendFriendRequest: (receiverId) => {
    return api.post('/friendship/request', { receiverId });
  },
  
  // Arkadaşlık isteğini kabul etme
  acceptFriendRequest: (friendshipId) => {
    return api.post('/friendship/accept', { friendshipId, response: "ACCEPTED" });
  },
  
  // Arkadaşlık isteğini reddetme
  rejectFriendRequest: (friendshipId) => {
    return api.post('/friendship/reject', { friendshipId });
  },
  
  // Arkadaşlık isteğini iptal etme
  cancelFriendRequest: (friendshipId) => {
    return api.delete(`/friendship/cancel/${friendshipId}`);
  },
  
  // Arkadaşı silme
  removeFriend: (friendshipId) => {
    return api.delete(`/friendship/remove/${friendshipId}`);
  },
  
  // Arkadaş listesini getirme
  getFriendsList: () => {
    return api.get('/friendship/list');
  },
  
  // Kullanıcı arama
  searchUsers: (query) => {
    return api.get(`/friendship/search?query=${encodeURIComponent(query)}`);
  },
  
  // MESAJLAŞMA SİSTEMİ
  
  // Sohbet başlatma veya var olan sohbeti getirme
  getOrCreateChat: (userId) => {
    return api.post(`/api/chats/private/${userId}`);
  },
  
  // Kullanıcının tüm sohbetlerini getirme
  getAllChats: () => {
    return api.get('/api/chats');
  },
  
  // Belirli bir sohbetin mesajlarını getirme
  getChatMessages: (chatId) => {
    return api.get(`/api/chats/${chatId}/messages`);
  },
  
  // Belirli bir sohbetin detaylarını getirme
  getChatDetails: (chatId) => {
    return api.get(`/api/chats/${chatId}`);
  },
  
  // Mesaj gönderme
  sendMessage: (chatId, content) => {
    return api.post(`/api/chats/${chatId}/messages`, { content });
  },
  
  // Sohbet silme
  deleteChat: (chatId) => {
    return api.delete(`/api/chats/${chatId}`);
  }
};

// Admin API servisleri
export const adminService = {
  // Admin girişi
  login: (username, password) => {
    return api.post('/admin/login', { username, password });
  },
  
  // Admin kaydı
  register: (username, password) => {
    return api.post('/admin/register', { username, password });
  },
  
  // Tüm kullanıcıları getir - adminApi kullanıyor
  getAllUsers: () => {
    return adminApi.get('/admin/users');
  },
  
  // Kullanıcı sil - adminApi kullanıyor
  deleteUser: (userId) => {
    return adminApi.delete(`/admin/delete/${userId}`);
  }
};

export default api; 