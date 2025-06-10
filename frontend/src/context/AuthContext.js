import React, { createContext, useState, useEffect, useContext } from 'react';
import { userService } from '../services/api';
import { 
  connectWebSocket, 
  disconnectWebSocket,
  addStatusUpdateListener,
  removeStatusUpdateListener,
  addFriendshipUpdateListener,
  removeFriendshipUpdateListener
} from '../services/websocket';

// Kimlik doğrulama context'ini oluştur
const AuthContext = createContext();

// Context provider bileşeni
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Arkadaşlık sistemi için state'ler
  const [friendsList, setFriendsList] = useState({
    friends: [],
    pendingRequests: [],
    receivedRequests: []
  });
  const [searchResults, setSearchResults] = useState([]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friendError, setFriendError] = useState(null);

  // WebSocket durum güncellemelerini dinlemek için
  const statusUpdateHandler = (statusUpdate) => {
    console.log("WebSocket status update received:", statusUpdate);
    
    if (!statusUpdate || !statusUpdate.userId) {
      console.warn("Geçersiz durum güncellemesi alındı:", statusUpdate);
      return;
    }
    
    // Eğer kullanıcı listesi varsa, arkadaş listesindeki kullanıcının durumunu güncelle
    if (friendsList && friendsList.friends) {
      // Arkadaş listesini güncelle
      const updatedFriendsList = {
        ...friendsList,
        friends: friendsList.friends.map(friendship => {
          if (friendship && friendship.friend && friendship.friend.id === statusUpdate.userId) {
            return {
              ...friendship,
              friend: {
                ...friendship.friend,
                online: statusUpdate.online
              }
            };
          }
          return friendship;
        }),
        
        // Gelen istekleri güncelle
        receivedRequests: friendsList.receivedRequests.map(request => {
          if (request && request.requester && request.requester.id === statusUpdate.userId) {
            return {
              ...request,
              requester: {
                ...request.requester,
                online: statusUpdate.online
              }
            };
          }
          return request;
        }),
        
        // Gönderilen istekleri güncelle
        pendingRequests: friendsList.pendingRequests.map(request => {
          if (request && request.receiver && request.receiver.id === statusUpdate.userId) {
            return {
              ...request,
              receiver: {
                ...request.receiver,
                online: statusUpdate.online
              }
            };
          }
          return request;
        })
      };
      
      // Güncellenmiş listeyi state'e kaydet
      setFriendsList(updatedFriendsList);
      console.log("Arkadaş listesi güncellendi:", updatedFriendsList);
    }
    
    // Arama sonuçlarını güncelle
    if (searchResults && searchResults.length > 0) {
      const updatedSearchResults = searchResults.map(user => {
        if (user && user.id === statusUpdate.userId) {
          return {
            ...user,
            online: statusUpdate.online
          };
        }
        return user;
      });
      
      setSearchResults(updatedSearchResults);
      console.log("Arama sonuçları güncellendi:", updatedSearchResults);
    }
  };
  
  // WebSocket arkadaşlık güncellemelerini dinlemek için
  const friendshipUpdateHandler = (update) => {
    console.log("WebSocket friendship update received:", update);
    
    // Güncelleme geçerlilik kontrolü
    if (!update || !update.action) {
      console.warn("Geçersiz arkadaşlık güncellemesi alındı:", update);
      return;
    }
    
    // Kullanıcı kontrol et
    if (!user) {
      console.log("Kullanıcı oturum açmamış, arkadaşlık güncellemesi yok sayılıyor");
      return;
    }
    
    // Güncellemeden kendi kullanıcını ve diğer kullanıcıyı belirle
    const isUserRequester = user.id === update.requesterId;
    const isUserReceiver = user.id === update.receiverId;
    
    // Kullanıcı bu arkadaşlık güncellemesinin bir parçası değilse yok say
    if (!isUserRequester && !isUserReceiver) {
      console.log("Kullanıcı bu arkadaşlık güncellemesinin bir parçası değil, yok sayılıyor");
      return;
    }
    
    // İşlem tipine göre arkadaşlık verilerini güncelle
    switch (update.action) {
      case "NEW_REQUEST":
        // Eğer alıcı isek, gelen isteklere bu isteği ekle
        if (isUserReceiver) {
          fetchFriendsList(); // En güncel listeyi almak için tüm listeyi yeniden getir
          
          // Arama sonuçlarını da güncelle
          if (searchResults && searchResults.length > 0) {
            const updatedSearchResults = searchResults.map(user => {
              if (user && user.id === update.requesterId) {
                return {
                  ...user,
                  hasReceivedRequest: true
                };
              }
              return user;
            });
            setSearchResults(updatedSearchResults);
          }
        }
        break;
      
      case "ACCEPT":
        // Hem gönderen hem alıcı için arkadaşlık kabul edildi durumunu güncelle
        fetchFriendsList(); // En güncel listeyi almak için tüm listeyi yeniden getir
        
        // Arama sonuçlarını da güncelle
        if (searchResults && searchResults.length > 0) {
          const updatedSearchResults = searchResults.map(user => {
            if (user && user.id === (isUserRequester ? update.receiverId : update.requesterId)) {
              return {
                ...user,
                isExistingFriend: true,
                hasSentRequest: false,
                hasReceivedRequest: false
              };
            }
            return user;
          });
          setSearchResults(updatedSearchResults);
        }
        break;
      
      case "REJECT":
        // İstek reddedildi - eğer gönderen isek, gönderilen isteklerimizden kaldır
        if (isUserRequester) {
          if (friendsList && friendsList.pendingRequests) {
            setFriendsList({
              ...friendsList,
              pendingRequests: friendsList.pendingRequests.filter(
                req => req && req.id !== update.friendshipId
              )
            });
            
            // Arama sonuçlarını da güncelle
            if (searchResults && searchResults.length > 0) {
              const updatedSearchResults = searchResults.map(user => {
                if (user && user.id === update.receiverId) {
                  return {
                    ...user,
                    hasSentRequest: false
                  };
                }
                return user;
              });
              setSearchResults(updatedSearchResults);
            }
          }
        }
        // Alıcı zaten reddettiği için istek listesinde değişiklik yapmaya gerek yok
        break;
      
      case "CANCEL":
        // İstek iptal edildi - eğer alıcı isek, gelen isteklerden kaldır
        if (isUserReceiver) {
          if (friendsList && friendsList.receivedRequests) {
            setFriendsList({
              ...friendsList,
              receivedRequests: friendsList.receivedRequests.filter(
                req => req && req.id !== update.friendshipId
              )
            });
            
            // Arama sonuçlarını da güncelle
            if (searchResults && searchResults.length > 0) {
              const updatedSearchResults = searchResults.map(user => {
                if (user && user.id === update.requesterId) {
                  return {
                    ...user,
                    hasReceivedRequest: false
                  };
                }
                return user;
              });
              setSearchResults(updatedSearchResults);
            }
          }
        }
        break;
      
      case "REMOVE":
        // Arkadaşlık silindi - arkadaş listemizden kaldır
        if (friendsList && friendsList.friends) {
          setFriendsList({
            ...friendsList,
            friends: friendsList.friends.filter(
              friendship => friendship && friendship.id !== update.friendshipId
            )
          });
          
          // Arama sonuçlarını da güncelle
          if (searchResults && searchResults.length > 0) {
            const updatedSearchResults = searchResults.map(user => {
              const otherUserId = isUserRequester ? update.receiverId : update.requesterId;
              if (user && user.id === otherUserId) {
                return {
                  ...user,
                  isExistingFriend: false
                };
              }
              return user;
            });
            setSearchResults(updatedSearchResults);
          }
        }
        break;
      
      default:
        console.warn("Bilinmeyen arkadaşlık güncelleme işlemi:", update.action);
    }
  };
  
  // Sayfa yüklendiğinde WebSocket bağlantısını kur ve dinleyicileri ekle
  useEffect(() => {
    // Kullanıcı giriş yapmışsa WebSocket bağlantısını kur
    if (!loading && user) {
      console.log('Kullanıcı giriş yapmış, WebSocket bağlantısı kuruluyor...');
      
      // Durum değişikliklerini dinlemek için WebSocket bağlantısı kur
      connectWebSocket();
      
      // Durum güncellemelerini dinle
      addStatusUpdateListener(statusUpdateHandler);
      
      // Arkadaşlık güncellemelerini dinle
      addFriendshipUpdateListener(friendshipUpdateHandler);
      
      return () => {
        // Bileşen unmount olduğunda bağlantıyı kapat
        removeStatusUpdateListener(statusUpdateHandler);
        removeFriendshipUpdateListener(friendshipUpdateHandler);
        disconnectWebSocket();
      };
    }
  }, [loading, user]);

  // Değişen friendsList'e bağlı olarak statusUpdateHandler'ı güncelle
  useEffect(() => {
    // Kullanıcı giriş yapmamışsa dinleyicileri ekleme
    if (!user) return;
    
    // İlk durum dinleyicisini kaldır
    removeStatusUpdateListener(statusUpdateHandler);
    
    // İlk arkadaşlık dinleyicisini kaldır
    removeFriendshipUpdateListener(friendshipUpdateHandler);
    
    // Yeni durum dinleyicisini ekle
    addStatusUpdateListener(statusUpdateHandler);
    
    // Yeni arkadaşlık dinleyicisini ekle
    addFriendshipUpdateListener(friendshipUpdateHandler);
    
    return () => {
      removeStatusUpdateListener(statusUpdateHandler);
      removeFriendshipUpdateListener(friendshipUpdateHandler);
    };
  }, [friendsList, searchResults, user]);

  // Sayfa yüklendiğinde yerel depolamadan token kontrolü yap
  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await userService.getProfile();
          setUser(response.data);
        } catch (err) {
          localStorage.removeItem('token');
          setError('Oturum süresi doldu, lütfen tekrar giriş yapın.');
        }
      }
      setLoading(false);
    };

    checkUser();
  }, []);

  // Kullanıcı girişi
  const login = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Login isteği gönderiliyor:', username);
      
      // userService kullanarak istek yapma
      const response = await userService.login(username, password);
      
      // Yanıt kontrolü
      if (!response || !response.data) {
        console.error('Geçersiz yanıt:', response);
        throw new Error('Sunucudan geçersiz yanıt alındı');
      }
      
      console.log('Login yanıtı alındı:', response.status);
      
      // Token kontrol
      const token = response.data;
      if (!token) {
        throw new Error('Token alınamadı');
      }
      
      // Token'ı localStorage'a kaydet
      localStorage.setItem('token', token);
      
      // Kullanıcı bilgilerini al
      try {
        // Profil bilgilerini getir
        const profileResponse = await userService.getProfile();
        if (!profileResponse || !profileResponse.data) {
          throw new Error('Profil bilgileri alınamadı');
        }
        
        setUser(profileResponse.data);
        
        // Çevrimiçi durumunu güncelle
        await userService.updateOnlineStatus(true);
      } catch (profileError) {
        console.error('Profil bilgileri alınamadı:', profileError);
        // Profil hatası login işlemini engellemesin
      }
      
      // WebSocket bağlantısı kur
      try {
        console.log('WebSocket bağlantısı kuruluyor...');
        await connectWebSocket();
        console.log('WebSocket bağlantısı kuruldu');
      } catch (wsError) {
        console.warn('WebSocket bağlantısı kurulamadı:', wsError);
        // WebSocket hatası login işlemini etkilememeli
      }
      
      setLoading(false);
      return true;
    } catch (error) {
      setLoading(false);
      
      if (error.code === 'ECONNABORTED') {
        setError('Sunucu yanıt vermedi. Lütfen daha sonra tekrar deneyin.');
        console.error('Login zaman aşımı:', error);
      } else if (error.response) {
        // Sunucudan hata yanıtı
        const status = error.response.status;
        if (status === 401) {
          setError('Kullanıcı adı veya şifre hatalı');
        } else if (status === 403) {
          setError('Erişim reddedildi');
        } else {
          setError(`Giriş hatası: ${error.response.data || 'Bilinmeyen hata'}`);
        }
      } else if (error.request) {
        // İstek yapıldı ama yanıt alınamadı
        setError('Sunucuya bağlanılamadı. Lütfen internet bağlantınızı kontrol edin.');
      } else {
        // İstek yapılırken hata oluştu
        setError(`Beklenmeyen hata: ${error.message}`);
      }
      
      console.error('Login hatası:', error);
      return false;
    }
  };

  // Kayıt fonksiyonu
  const register = async (userData) => {
    try {
      setLoading(true);
      await userService.register(userData);
      setError(null);
      return true;
    } catch (err) {
      setError('Kayıt işlemi başarısız oldu.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Profil güncelleme fonksiyonu
  const updateProfile = async (profileData) => {
    try {
      setLoading(true);
      const response = await userService.updateProfile(profileData);
      setUser(response.data);
      setError(null);
      return true;
    } catch (err) {
      setError('Profil güncelleme işlemi başarısız oldu.');
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Profil resmi yükleme fonksiyonu
  const uploadProfileImage = async (imageFile) => {
    try {
      setLoading(true);
      setError(null); // Önceki hataları temizle
      console.log("Profil resmi yükleme işlemi başlatılıyor:", imageFile);
      
      // Önce dosya kontrolü yap
      if (!imageFile || !(imageFile instanceof File)) {
        throw new Error('Geçersiz dosya formatı. Lütfen geçerli bir resim dosyası seçin.');
      }
      
      // Dosya tipi kontrolü
      if (!imageFile.type.startsWith('image/')) {
        throw new Error('Lütfen bir resim dosyası seçin (JPEG, PNG, GIF, vb.)');
      }
      
      // Dosya boyutu kontrolü (10MB)
      if (imageFile.size > 10 * 1024 * 1024) {
        throw new Error('Dosya boyutu 10MB\'tan küçük olmalıdır');
      }
      
      const response = await userService.uploadProfileImage(imageFile);
      
      // API yanıtı kontrolü
      if (!response || !response.data) {
        throw new Error('Sunucudan yanıt alınamadı');
      }
      
      console.log("Profil resmi yükleme başarılı:", response.data);
      
      // Sunucudan dönen profil resmi URL'sini kontrol et
      if (!response.data.profileImageUrl) {
        throw new Error('Profil resmi URL\'si alınamadı');
      }
      
      // Kullanıcı verilerini güncelle
      setUser(prevUser => ({
        ...prevUser,
        profileImageUrl: response.data.profileImageUrl
      }));
      
      console.log("Kullanıcı profil resmi başarıyla güncellendi:", response.data.profileImageUrl);
      return response;
    } catch (err) {
      console.error("Profil resmi yükleme hatası:", err);
      setError('Profil resmi yükleme işlemi başarısız oldu: ' + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Online durum güncelleme fonksiyonu
  const updateOnlineStatus = async (isOnline) => {
    try {
      setLoading(true);
      console.log(`AuthContext: Durum güncelleme başlatıldı. Yeni durum: ${isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}`);
      
      // Token kontrolü
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("AuthContext: Token bulunamadı, durum değiştirilemez");
        setError('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        logout(); // Oturumu kapat ve kullanıcıyı giriş sayfasına yönlendir
        return false;
      }
      
      // Bool değerini doğrudan gönderiyoruz ve boolean olduğundan emin oluyoruz
      const statusValue = Boolean(isOnline);
      
      const response = await userService.updateOnlineStatus(statusValue);
      console.log("AuthContext: API yanıtı:", response.data);
      
      // API yanıtına göre kullanıcıyı güncelle - mevcut kullanıcı bilgilerini koru
      if (response.data && user) {
        // Kullanıcı nesnesini güncelleyelim - React'ın değişikliği algılamasını sağlamak için 
        // yeni bir nesne oluşturuyoruz ve mevcut kullanıcı bilgilerini koruyoruz
        const updatedUser = { 
          ...user,  // Mevcut tüm kullanıcı bilgilerini koru
          isOnline: response.data.isOnline // Sadece online durumunu güncelle
        };
        
        // State'i güncelle
        setUser(updatedUser);
        
        console.log("AuthContext: Kullanıcı durumu güncellendi:", updatedUser.isOnline);
      }
      
      setError(null);
      return true;
    } catch (err) {
      console.error("AuthContext: Durum güncelleme hatası:", err);
      // 401 veya 403 hata kodu gelirse, oturum süresi dolmuş olabilir
      if (err.message && (err.message.includes("401") || err.message.includes("403"))) {
        logout(); // Kullanıcıyı çıkış yap ve login sayfasına yönlendir
        setError('Oturumunuz sona ermiş. Lütfen tekrar giriş yapın.');
      } else {
        setError('Durum güncelleme işlemi başarısız oldu: ' + err.message);
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Çıkış fonksiyonu
  const logout = async () => {
    try {
      // Çıkış yapmadan önce kullanıcıyı çevrimdışı yap
      const token = localStorage.getItem('token');
      if (token && user) {
        try {
          await userService.updateOnlineStatus(false);
        } catch (e) {
          console.error("Çıkış yaparken çevrimdışı yapma sırasında hata:", e);
        }
      }
      
      // WebSocket bağlantısını kapat
      try {
        console.log("Çıkış yaparken WebSocket bağlantısı kapatılıyor...");
        disconnectWebSocket();
        console.log("WebSocket bağlantısı başarıyla kapatıldı");
      } catch (wsError) {
        console.error("WebSocket bağlantısı kapatılırken hata:", wsError);
      }
    } catch (err) {
      console.error("Çıkış yaparken hata:", err);
    } finally {
      // Token ve kullanıcı bilgilerini temizle
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  // ARKADAŞLIK SİSTEMİ FONKSİYONLARI
  
  // Arkadaş listesini getirme
  const fetchFriendsList = async () => {
    // Kullanıcı kontrolü - eğer kullanıcı yoksa çalışmayı durdur
    if (!user) {
      console.log('Oturum açmış kullanıcı yok, arkadaş listesi getirilemez');
      return { friends: [], pendingRequests: [], receivedRequests: [] };
    }
    
    // Son istek zamanı kontrolü - çok sık istekleri önlemek için
    if (fetchFriendsList.lastFetchTime) {
      const now = Date.now();
      // Son istekten bu yana 2 saniyeden az geçtiyse, yeni istek yapma
      if (now - fetchFriendsList.lastFetchTime < 2000) {
        console.log('Çok sık arkadaş listesi isteği, mevcut veri kullanılıyor');
        return friendsList;
      }
    }
    
    // İstek zamanını güncelle
    fetchFriendsList.lastFetchTime = Date.now();
    
    // Token kontrolü
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('Token bulunamadı, arkadaş listesi getirilemez');
      return { friends: [], pendingRequests: [], receivedRequests: [] };
    }
    
    try {
      setFriendLoading(true);
      setFriendError(null);
      
      console.log('Arkadaş listesi getiriliyor...');
      const response = await userService.getFriendsList();
      
      // Validasyon: Yanıt ve veri kontrolleri
      if (!response || !response.data) {
        throw new Error('Geçersiz yanıt: Arkadaş listesi alınamadı');
      }
      
      const data = response.data;
      
      // Validasyon: Veri yapısı kontrolleri
      if (!data.friends) data.friends = [];
      if (!data.pendingRequests) data.pendingRequests = [];
      if (!data.receivedRequests) data.receivedRequests = [];
      
      // Arkadaş listesini temizle ve filtreleme yap - null değerleri filtrele
      data.friends = data.friends.filter(f => f && f.friend);
      data.pendingRequests = data.pendingRequests.filter(r => r && r.receiver);
      data.receivedRequests = data.receivedRequests.filter(r => r && r.requester);
      
      console.log('Arkadaş listesi güncellendi:', {
        friends: data.friends.length,
        pendingRequests: data.pendingRequests.length,
        receivedRequests: data.receivedRequests.length
      });
      
      setFriendsList(data);
      return data;
    } catch (err) {
      setFriendError('Arkadaş listesi getirilirken bir hata oluştu.');
      console.error("Arkadaş listesi hatası:", err);
      
      // Hata durumunda boş liste döndür
      const emptyList = { friends: [], pendingRequests: [], receivedRequests: [] };
      setFriendsList(emptyList);
      return emptyList;
    } finally {
      setFriendLoading(false);
    }
  };
  
  // Kullanıcı arama
  const searchUsers = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return [];
    }
    
    try {
      setFriendLoading(true);
      setFriendError(null);
      
      const response = await userService.searchUsers(query);
      console.log("Arama sonuçları alındı:", response.data);
      
      // Mevcut arkadaşlık durumlarını kontrol et
      if (friendsList) {
        // Mevcut arkadaşlar ve isteklerle arama sonuçlarını karşılaştır
        const processedResults = response.data.map(user => {
          // Bu kullanıcıyla ilgili mevcut bir arkadaşlık durumu var mı kontrol et
          const isExistingFriend = friendsList.friends.some(
            f => f.friend && (f.friend.id === user.id)
          );
          
          const hasSentRequest = friendsList.pendingRequests.some(
            req => req.receiver && (req.receiver.id === user.id)
          );
          
          const hasReceivedRequest = friendsList.receivedRequests.some(
            req => req.requester && (req.requester.id === user.id)
          );
          
          return {
            ...user,
            isExistingFriend,
            hasSentRequest,
            hasReceivedRequest
          };
        });
        
        setSearchResults(processedResults);
        return processedResults;
      } else {
        setSearchResults(response.data);
        return response.data;
      }
    } catch (err) {
      setFriendError('Kullanıcı araması yapılırken bir hata oluştu.');
      console.error("Kullanıcı arama hatası:", err);
      return [];
    } finally {
      setFriendLoading(false);
    }
  };
  
  // Arkadaşlık isteği gönderme
  const sendFriendRequest = async (receiverId) => {
    try {
      setFriendLoading(true);
      setFriendError(null);
      
      const response = await userService.sendFriendRequest(receiverId);
      
      // Arkadaş listesini güncelle
      await fetchFriendsList();
      
      return true;
    } catch (err) {
      setFriendError('Arkadaşlık isteği gönderilirken bir hata oluştu.');
      console.error("Arkadaşlık isteği hatası:", err);
      return false;
    } finally {
      setFriendLoading(false);
    }
  };
  
  // Arkadaşlık isteğini kabul etme
  const acceptFriendRequest = async (friendshipId) => {
    try {
      setFriendLoading(true);
      setFriendError(null);
      
      const response = await userService.acceptFriendRequest(friendshipId);
      
      // Arkadaş listesini güncelle
      await fetchFriendsList();
      
      return true;
    } catch (err) {
      setFriendError('Arkadaşlık isteği kabul edilirken bir hata oluştu.');
      console.error("Arkadaşlık isteği kabul hatası:", err);
      return false;
    } finally {
      setFriendLoading(false);
    }
  };
  
  // Arkadaşlık isteğini reddetme
  const rejectFriendRequest = async (friendshipId) => {
    try {
      setFriendLoading(true);
      setFriendError(null);
      
      const response = await userService.rejectFriendRequest(friendshipId);
      
      // Arkadaş listesini güncelle
      await fetchFriendsList();
      
      return true;
    } catch (err) {
      setFriendError('Arkadaşlık isteği reddedilirken bir hata oluştu.');
      console.error("Arkadaşlık isteği ret hatası:", err);
      return false;
    } finally {
      setFriendLoading(false);
    }
  };
  
  // Arkadaşlık isteğini iptal etme
  const cancelFriendRequest = async (friendshipId) => {
    try {
      setFriendLoading(true);
      setFriendError(null);
      
      const response = await userService.cancelFriendRequest(friendshipId);
      
      // Arkadaş listesini güncelle
      await fetchFriendsList();
      
      return true;
    } catch (err) {
      setFriendError('Arkadaşlık isteği iptal edilirken bir hata oluştu.');
      console.error("Arkadaşlık isteği iptal hatası:", err);
      return false;
    } finally {
      setFriendLoading(false);
    }
  };
  
  // Arkadaşı silme
  const removeFriend = async (friendshipId) => {
    try {
      setFriendLoading(true);
      setFriendError(null);
      
      const response = await userService.removeFriend(friendshipId);
      
      // Arkadaş listesini güncelle
      await fetchFriendsList();
      
      return true;
    } catch (err) {
      setFriendError('Arkadaş silinirken bir hata oluştu.');
      console.error("Arkadaş silme hatası:", err);
      return false;
    } finally {
      setFriendLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    updateProfile,
    uploadProfileImage,
    updateOnlineStatus,
    // Arkadaşlık sistemi
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
    // Kullanıcı bilgilerini güncelleme fonksiyonu
    setUser,
    // Loading durumunu değiştirme
    setLoading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook - Auth context'i kullanmak için
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth hook must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext; 