import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEnvelope, FaComments, FaPaperPlane, FaTrash, FaArrowLeft, FaTimes, FaUserFriends } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';
import Layout from '../components/Layout';
import chatService from '../services/chatService';
import websocketService, { addMessageListener, removeMessageListener, sendChatMessage, joinChat, disconnectWebSocket } from '../services/websocket';
import '../styles/messages.scss';

const Message = () => {
  const { 
    user,
    friendsList,
    fetchFriendsList,
    logout
  } = useAuth();
  
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const [showChatList, setShowChatList] = useState(true); // Sohbet listesini gösterme durumu
  const [showFriendList, setShowFriendList] = useState(false); // Arkadaş listesini gösterme durumu
  
  // Arkadaş listesini düzenle - friends dizisini alıp düz bir dizi haline getir
  const friends = useMemo(() => {
    if (!user || !friendsList || !friendsList.friends || !Array.isArray(friendsList.friends)) {
      console.log('Arkadaş listesi boş veya geçersiz format');
      return [];
    }
    
    const friendsArray = friendsList.friends
      .filter(friendship => friendship && friendship.friend) // Geçersiz arkadaşlıkları filtrele
      .map(friendship => friendship.friend);
      
    console.log(`${friendsArray.length} arkadaş bulundu`);
    return friendsArray;
  }, [friendsList, user]);
  
  // Mesajları otomatik olarak aşağı kaydır
  const scrollToBottom = () => {
    // Element varsa kaydır
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error('Kaydırma hatası:', error);
      }
    }
  };
  
  // Mesajları render etme fonksiyonu - memoize edilmiş
  const renderMessages = useCallback(() => {
    // Kullanıcı yoksa boş göster
    if (!user) {
      return (
        <div className="empty-state">
          <div className="icon">
            <FaEnvelope />
          </div>
          <h4>Oturum kapalı</h4>
          <p>Lütfen giriş yapın</p>
        </div>
      );
    }
    
    // Seçili sohbetin katılımcılarını kontrol et
    if (selectedChat && selectedChat.participants) {
      // Katılımcı var mı kontrol et
      if (selectedChat.participants.length === 0) {
        return (
          <div className="empty-state">
            <div className="icon">
              <FaEnvelope />
            </div>
            <h4>Geçersiz sohbet</h4>
            <p>Bu sohbetin katılımcıları bulunamadı.</p>
          </div>
        );
      }
      
      // Kendisi dışında bir katılımcı var mı kontrol et
      const hasOtherParticipants = selectedChat.participants.some(p => p && p.id && p.id !== user.id);
      
      if (!hasOtherParticipants) {
        return (
          <div className="empty-state">
            <div className="icon">
              <FaEnvelope />
            </div>
            <h4>Geçersiz sohbet</h4>
            <p>Bu sohbette sadece siz varsınız, başka biriyle sohbet etmelisiniz.</p>
          </div>
        );
      }
    }
    
    if (!messages || messages.length === 0) {
      return (
        <div className="empty-state">
          <div className="icon">
            <FaEnvelope />
          </div>
          <h4>Henüz mesaj yok</h4>
          <p>Sohbete başlamak için bir mesaj gönderin.</p>
        </div>
      );
    }
    
    return (
      <div className="messages-list" ref={messagesListRef}>
        {messages.map((message, index) => {
          // Eğer kullanıcı oturumu kapandıysa, hiçbir mesaj kullanıcının değil
          if (!user) {
            return null;
          }
          
          // Mesaj sahipliği doğrudan isMine özelliğine dayanmalı - önceki işlemlerde bunu doğru ayarladık
          const isOwnMessage = message.isMine === true;
          
          // Benzersiz key oluştur
          const messageKey = `msg-${message.id || index}-${index}`;
          
          return (
            <div 
              key={messageKey} 
              className="message-item"
            >
              <div 
                className={`message-bubble ${isOwnMessage ? 'own-message' : 'other-message'}`}
              >
                <div className="message-content">{message.content}</div>
                <div className="message-time">
                  {new Date(message.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="messages-end-ref" />
      </div>
    );
  }, [messages, user, messagesEndRef, messagesListRef, selectedChat]);
  
  // Sohbetleri getir
  const fetchChats = async () => {
    try {
      setError(null); // Önceki hataları temizle
      
      console.log('Sohbetler getiriliyor...');
      const chatsData = await chatService.getUserChats();
      
      // Geçerli kullanıcı kontrolü
      if (!user || !user.id) {
        console.error('Oturum açan kullanıcı bilgisi bulunamadı');
        setChats([]);
        return [];
      }
      
      console.log(`Ham sohbet sayısı: ${chatsData.length}`);
      
      // chatService artık hata durumunda boş dizi döndürüyor
      // Kullanıcının kendi kendisiyle yaptığı sohbetleri filtrele
      const filteredChats = chatsData.filter(chat => {
        // Debug: Sohbet katılımcıları
        console.log(`Chat ID ${chat.id} katılımcıları:`, chat.participants);
        
        // Eğer participants dizisi boşsa veya hiç katılımcı yoksa
        if (!chat.participants || chat.participants.length === 0) {
          console.log(`Chat ID ${chat.id}: Katılımcısı olmayan sohbet filtrelendi`);
          return false;
        }
        
        // Her sohbetin en az bir katılımcısı olmalı ve bu katılımcı mevcut kullanıcı olmamalı
        const otherParticipants = chat.participants.filter(p => p && p.id !== user.id);
        
        if (otherParticipants.length === 0) {
          console.log(`Chat ID ${chat.id}: Sadece kullanıcının kendisiyle olan sohbet filtrelendi`);
          return false;
        }
        
        console.log(`Chat ID ${chat.id}: Geçerli sohbet, ${otherParticipants.length} farklı kullanıcı var`);
        return true;
      });
      
      setChats(filteredChats);
      
      if (filteredChats.length > 0) {
        console.log(`${filteredChats.length} sohbet başarıyla yüklendi (${chatsData.length - filteredChats.length} sohbet filtrelendi)`);
      } else {
        console.log('Hiç sohbet bulunamadı veya yüklenemedi');
      }
      
      return filteredChats;
    } catch (error) {
      console.error('Sohbetler getirilirken hata:', error);
      setError('Sohbetler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
      return [];
    }
  };
  
  // Mesajları getir
  const fetchMessages = async (chatId) => {
    if (!chatId) {
      console.error('Geçersiz chatId:', chatId);
      setError('Geçersiz sohbet ID');
      return;
    }
    
    try {
      setError(null);
      
      console.log(`${chatId} ID'li sohbetin mesajları getiriliyor...`);
      const messagesData = await chatService.getChatMessages(chatId);
      
      // Mesajları işle ve isMine özelliğini belirle
      if (messagesData && messagesData.length > 0 && user) {
        const processedMessages = messagesData.map(message => {
          // Mesaj sahipliğini belirle
          let isMine = false;
          
          // 1. sender.id ile kontrol
          if (message.sender && message.sender.id) {
            isMine = message.sender.id === user.id;
          }
          // 2. senderId ile kontrol
          else if (message.senderId) {
            isMine = message.senderId === user.id;
          }
          // 3. senderUsername ile kontrol
          else if (message.senderUsername) {
            isMine = message.senderUsername === user.username;
          }
          
          // Mesajı güncelle
          return {
            ...message,
            isMine: isMine
          };
        });
        
        // İşlenmiş mesajları set et
        setMessages(processedMessages);
        
        console.log(`${processedMessages.length} mesaj başarıyla yüklendi ve işlendi`);
      } else {
        // Boş mesaj dizisi
        setMessages([]);
        console.log('Bu sohbette hiç mesaj bulunamadı');
      }
      
      // WebSocket bağlantısını kontrol et ve sohbete katıl
      try {
        // WebSocket bağlantısını başlat - token kontrolü içeride yapılıyor
        const wsConnection = await websocketService.ensureConnected();
        
        // Mesaj dinleyicisini yeniden ekle (bağlantı sonrası)
        addMessageListener(handleNewMessage);
        
        // Bağlantı başarılı oldu mu kontrol et
        if (wsConnection.connected) {
          console.log('WebSocket bağlantısı başarıyla kuruldu');
          
          // Sohbete katıldığını bildir
          setTimeout(() => {
            try {
              console.log(`WebSocket sohbete katılma çağrısı yapılıyor, Chat ID: ${chatId}, Tipi: ${typeof chatId}`);
              const result = joinChat(chatId);
              console.log(`WebSocket sohbete katılma sonucu: ${result ? 'Başarılı' : 'Başarısız'}, Chat ID: ${chatId}`);
            } catch (wsError) {
              console.warn('Sohbete katılırken hata:', wsError);
              // Bu hata kritik değil, sadece logla
              
              // Hata olması durumunda yeniden deneme yap
              setTimeout(() => {
                try {
                  joinChat(chatId);
                  console.log(`Sohbete yeniden katılma denendi: ${chatId}`);
                } catch (e) {
                  console.error('Sohbete yeniden katılma başarısız:', e);
                }
              }, 2000);
            }
          }, 500); // WebSocket bağlantısı için daha kısa bir bekleme süresi
        } else {
          console.warn('WebSocket bağlantısı kurulamadı:', wsConnection.reason);
          
          // Bağlantı başarısız olursa yeniden dene
          setTimeout(async () => {
            try {
              const retryConnection = await websocketService.ensureConnected();
              if (retryConnection.connected) {
                console.log('WebSocket bağlantısı yeniden kuruldu');
                joinChat(chatId);
                addMessageListener(handleNewMessage);
              }
            } catch (e) {
              console.error('Yeniden bağlanma başarısız:', e);
            }
          }, 2000);
        }
      } catch (wsError) {
        console.warn('WebSocket bağlantısı kurulamadı:', wsError);
        // WebSocket hatası kritik değil, devam et
      }
      
      // Mesajları gösterdikten sonra aşağı kaydır
      scrollToBottom();
    } catch (error) {
      console.error('Mesajlar getirilirken hata:', error);
      
      // Özel hata mesajları için kontrol
      if (error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        // 403 Forbidden hatası - kullanıcı bu sohbetin katılımcısı değil
        if (statusCode === 403) {
          console.error('Yetkilendirme hatası: Kullanıcı bu sohbetin katılımcısı değil');
          setError('Bu sohbetin katılımcısı değilsiniz. Sohbete katılmak için düzeltme butonunu kullanabilirsiniz.');
        } 
        // 404 Not Found hatası - sohbet bulunamadı
        else if (statusCode === 404) {
          console.error('Sohbet bulunamadı');
          setError('Sohbet bulunamadı veya silinmiş olabilir.');
        }
        // Diğer API hataları
        else if (errorData && errorData.message) {
          setError(`Mesajlar yüklenirken bir hata oluştu: ${errorData.message}`);
        } else {
          setError('Mesajlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
        }
      } else {
        // Genel hata durumu
        setError('Mesajlar yüklenirken bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
  };
  
  // Mesaj gönder
  const handleSendMessage = async () => {
    // Gerekli kontroller
    if (!messageText || messageText.trim() === '') {
      // Boş mesaj göndermeye izin verme
      return;
    }
    
    if (!selectedChat || !selectedChat.id) {
      showToast('Lütfen önce bir sohbet seçin', 'warning');
      return;
    }
    
    try {
      // WebSocket bağlantısını kontrol et ve gerekirse yeniden bağlan
      let wsConnection;
      try {
        // WebSocket bağlantısını sağla
        console.log('WebSocket bağlantısı kontrol ediliyor...');
        wsConnection = await websocketService.ensureConnected();
        
        if (wsConnection.connected) {
          console.log('WebSocket bağlantısı hazır');
        } else {
          console.warn(`WebSocket bağlantısı kurulamadı: ${wsConnection.reason}`);
          // Bağlantı kurulamadı - yeniden deneyelim
          showToast('Anlık mesajlaşma bağlantısı kurulamadı. Yeniden bağlanmaya çalışılıyor...', 'warning');
          
          // Tekrar bağlanmayı dene - 3 deneme daha yap
          for (let i = 0; i < 3; i++) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`WebSocket bağlantısı için ${i+1}. yeniden deneme...`);
            wsConnection = await websocketService.connectWebSocket();
            if (wsConnection.connected) {
              console.log('WebSocket bağlantısı yeniden deneme sonrası kuruldu');
              showToast('Bağlantı sağlandı, mesajınız gönderiliyor...', 'success');
              break;
            }
          }
          
          // Hala bağlantı kurulamadıysa, kullanıcıya bildir ve işlemi sonlandır
          if (!wsConnection.connected) {
            showToast('Mesaj gönderilemedi: Anlık mesajlaşma bağlantısı kurulamadı. Lütfen sayfayı yenileyip tekrar deneyin.', 'error');
            return;
          }
        }
      } catch (wsError) {
        console.error('WebSocket bağlantısı kurulamadı:', wsError.message);
        showToast('Anlık mesajlaşma bağlantısı kurulamadı. Lütfen sayfayı yenileyip tekrar deneyin.', 'error');
        return;
      }
      
      // WebSocket üzerinden mesaj gönder
      console.log(`Mesaj gönderiliyor: ${messageText} (Chat ID: ${selectedChat.id})`);
      const result = await websocketService.sendChatMessage(selectedChat.id, messageText);
      
      if (result.success) {
        console.log('Mesaj başarıyla gönderildi');
        
        // Mesaj gönderildikten sonra input'u temizle
        setMessageText('');
        
        // Mesajı hemen göstermek için yerel olarak ekle
        const newMessage = {
          id: result.message?.id || ('temp-' + Date.now()),
          chatId: selectedChat.id,
          content: messageText,
          senderId: user.id,
          sender: {
            id: user.id,
            username: user.username,
            isim: user.isim,
            soyad: user.soyad,
            profileImageUrl: user.profileImageUrl
          },
          timestamp: new Date(),
          status: 'SENT',
          isMine: true  // Kullanıcının kendi mesajı olduğunu kesinlikle belirt
        };
        
        // Mesajları güncelle
        setMessages(prevMessages => [...prevMessages, newMessage]);
        
        // Mesaj gönderildikten sonra aşağı kaydır
        scrollToBottom();
      } else {
        // Hata durumunda kullanıcıya bildir
        console.error('Mesaj gönderme başarısız:', result.error);
        showToast(result.error || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.', 'error');
        
        // Yeniden bağlantı sorunları yaşanıyorsa, bağlantıyı tamamen kapat ve yeniden oluştur
        if (result.error && result.error.includes('WebSocket bağlantısı')) {
          try {
            console.log('WebSocket bağlantısı kapatılıp yeniden oluşturuluyor...');
            websocketService.disconnectWebSocket();
            // Kısa bir bekleme sonrası yeniden bağlanma denemesi için DOM olayına izin ver
            setTimeout(async () => {
              try {
                const newConnection = await websocketService.connectWebSocket();
                if (newConnection.connected) {
                  console.log('WebSocket bağlantısı yeniden kuruldu, artık mesaj gönderebilirsiniz.');
                  showToast('Bağlantı yeniden kuruldu, tekrar deneyebilirsiniz.', 'success');
                  
                  // Yeniden bağlandıktan sonra mesaj dinleyicisini tekrar ekle
                  addMessageListener(handleNewMessage);
                } else {
                  showToast('Bağlantı yeniden kurulamadı. Lütfen sayfayı yenileyiniz.', 'error');
                }
              } catch (e) {
                console.error('Yeniden bağlantı denemesi başarısız:', e);
                showToast('Bağlantı yeniden kurulamadı. Lütfen sayfayı yenileyiniz.', 'error');
              }
            }, 1500);
          } catch (resetError) {
            console.error('Bağlantı sıfırlama hatası:', resetError);
            showToast('Bağlantı yeniden kurulamadı. Lütfen sayfayı yenileyiniz.', 'error');
          }
        }
      }
    } catch (error) {
      console.error('Mesaj gönderilirken beklenmeyen hata:', error);
      showToast('Mesaj gönderilirken bir hata oluştu: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  };
  
  // Yeni mesaj geldiğinde çalışacak fonksiyon
  const handleNewMessage = (message) => {
    // Eğer kullanıcı null ise işlemi gerçekleştirme
    if (!user) {
      console.warn('Kullanıcı oturumu kapalı, mesaj işlenemez');
      return;
    }
    
    console.log('Yeni mesaj alındı:', message);
    
    // Mesaj sahipliğini belirle (gönderen kişi mevcut kullanıcı mı?)
    // Öncelik sırası:
    // 1. Mesaj WebSocket üzerinden kullanıcı tarafından gönderilmişse ve özellik tanımlanmışsa
    const isCurrentUserSender = 
      (message.isMine === true) || 
      (message.sender && message.sender.id === user.id) || 
      (message.senderId === user.id);
    
    // Benzersiz bir ID olduğundan emin ol
    const messageId = message.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Mesajı frontend formatına dönüştür
    const formattedMessage = {
      id: messageId,
      content: message.content,
      timestamp: message.timestamp || new Date(),
      chatId: message.chatId,
      // Gelen mesajın formatına göre sender bilgisini kullan
      sender: message.sender || {
        id: message.senderId,
        username: message.senderUsername,
        isim: message.senderName ? message.senderName.split(' ')[0] : '',
        soyad: message.senderName ? message.senderName.split(' ')[1] || '' : '',
        profileImageUrl: message.senderProfileImage
      },
      // Mesajın kime ait olduğunu kesin olarak belirle
      isMine: isCurrentUserSender
    };
    
    console.log(`Yeni mesaj işlendi: "${formattedMessage.content}" - Kullanıcının kendisi gönderdi: ${isCurrentUserSender}`);
    
    // Eğer mesaj şu an seçili olan sohbete aitse, mesajlar listesine ekle
    if (selectedChat && message.chatId === selectedChat.id) {
      // Mesajı state'e ekle - set fonksiyonunu functional update olarak kullan
      setMessages(prevMessages => {
        // Bu ID'li bir mesaj zaten var mı kontrol et
        const messageExists = prevMessages.some(m => m.id === messageId);
        if (messageExists) {
          return prevMessages;
        }
        // Yeni mesajı ekle ve otomatik olarak kaydır
        const updatedMessages = [...prevMessages, formattedMessage];
        // Mesajlar güncellendiğinde otomatik olarak aşağı kaydır - gecikme olmadan hemen kaydır
        scrollToBottom();
        return updatedMessages;
      });
    }
    // Ayrıca sohbeti aktif olarak göster - SADECE mesaj seçili sohbetten farklı bir sohbete aitse
    else if (message.chatId && (!selectedChat || selectedChat.id !== message.chatId)) {
      // Sohbeti bul ve seç
      const chat = chats.find(c => c.id === message.chatId);
      if (chat) {
        console.log('Mesaj için sohbeti otomatik seçme:', chat.id);
        // Sohbeti seç - yeni mesaj geldiyse bu sohbeti göster
        setSelectedChat(chat);
        // Sohbetin mesajlarını yükle
        fetchMessages(chat.id);
      }
    }
    
    // Sohbet listesini güncelle (son mesajı göstermek için)
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat.id === message.chatId) {
          return {
            ...chat,
            lastMessage: message.content,
            lastMessageTime: message.timestamp || new Date()
          };
        }
        return chat;
      });
    });
  };
  
  // Sohbet seç
  const selectChat = (chat) => {
    console.log('Sohbet seçildi:', {
      id: chat.id,
      type: typeof chat.id,
      participantsCount: chat.participants ? chat.participants.length : 0,
      participants: chat.participants
    });
    
    setSelectedChat(chat);
    setShowChatList(false); // Sohbet seçildiğinde sohbet listesini gizle
  };
  
  // Arkadaşla özel sohbet başlat
  const startPrivateChat = async (userId) => {
    if (!userId) {
      showToast('Geçersiz kullanıcı ID', 'error');
      return;
    }

    // Kendisiyle özel sohbet başlatmayı engelle
    if (user && userId === user.id) {
      showToast('Kendinizle sohbet başlatamazsınız', 'error');
      return;
    }

    try {
      // Hataları temizle
      setError(null);
      showToast('Sohbet başlatılıyor...', 'info');
      
      // Özel sohbeti başlat
      console.log(`${userId} ID'li kullanıcı ile özel sohbet başlatılıyor...`);
      const response = await chatService.startPrivateChat(userId);
      
      if (!response || !response.chatId) {
        throw new Error('Sohbet ID bulunamadı');
      }
      
      const chatId = response.chatId;
      console.log(`Sohbet başarıyla oluşturuldu. Sohbet ID: ${chatId}`);
      
      // Sohbetleri yeniden yükle
      console.log('Tüm sohbetler yeniden yükleniyor...');
      const freshChats = await chatService.getUserChats();
      
      if (!Array.isArray(freshChats)) {
        throw new Error('Sohbetler yüklenemedi');
      }
      
      // Sohbetleri güncelle
      setChats(freshChats);
      console.log(`${freshChats.length} sohbet yüklendi`);
      
      // Yeni oluşturulan sohbeti bul
      const newChat = freshChats.find(chat => chat.id === chatId);
      
      if (!newChat) {
        throw new Error(`${chatId} ID'li sohbet bulunamadı`);
      }
      
      // Sohbeti seç ve mesajları yükle
      console.log('Yeni sohbet seçiliyor:', newChat);
      selectChat(newChat);
      
      // Başarı mesajı göster
      showToast('Sohbet başarıyla başlatıldı', 'success');
    } catch (error) {
      console.error('Özel sohbet başlatılırken hata:', error);
      setError(`Özel sohbet başlatılırken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
      showToast('Sohbet başlatılamadı', 'error');
      
      // Hata durumunda sohbetleri yeniden yüklemeyi dene
      try {
        const refreshedChats = await chatService.getUserChats();
        if (Array.isArray(refreshedChats)) {
          setChats(refreshedChats);
          console.log('Hata sonrası sohbetler yenilendi');
        }
      } catch (refreshError) {
        console.error('Sohbetleri yenileme hatası:', refreshError);
      }
    }
  };
  
  // Sohbet silme işlemi
  const handleDeleteChat = async () => {
    if (!selectedChat || !selectedChat.id) {
      showToast('Geçersiz sohbet', 'error');
      return;
    }
    
    // Silme işlemi için onay al
    if (!window.confirm('Bu sohbeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    
    try {
      setError(null);
      
      console.log(`${selectedChat.id} ID'li sohbet siliniyor...`);
      const response = await chatService.deleteChat(selectedChat.id);
      
      if (response && response.success) {
        // Seçili sohbeti ve mesajları temizle
        setSelectedChat(null);
        setMessages([]);
        
        // Tüm sohbetleri yeniden getir - silme işleminden sonra daha güvenli
        console.log('Sohbetler yeniden getiriliyor...');
        await fetchChats();
        
        // Arkadaş listesini de yenileyelim - sohbetler değiştiğinde güncel kalsın
        console.log('Arkadaş listesi yenileniyor...');
        await fetchFriendsList();
        
        showToast('Sohbet başarıyla silindi', 'success');
      } else {
        throw new Error(response?.message || 'Sohbet silinemedi');
      }
    } catch (error) {
      console.error('Sohbet silinirken hata:', error);
      setError(`Sohbet silinirken bir hata oluştu: ${error.message || 'Bilinmeyen hata'}`);
      showToast('Sohbet silinemedi: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  };
  
  // Kullanıcı kontrolü - user yoksa login sayfasına yönlendir
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // WebSocket bağlantısını periyodik olarak kontrol et
  useEffect(() => {
    // Kullanıcı yoksa bu kontrolleri yapma
    if (!user) return () => {};
    
    // Her 30 saniyede bir WebSocket bağlantısını kontrol et
    const connectionCheckInterval = setInterval(async () => {
      try {
        // Websocket bağlantısını kontrol et
        const isConnected = websocketService.isConnected();
        
        if (!isConnected) {
          console.log('Periyodik kontrol: WebSocket bağlantısı kopmuş, yeniden bağlanılıyor...');
          const reconnection = await websocketService.connectWebSocket();
          
          if (reconnection.connected) {
            console.log('WebSocket bağlantısı yeniden kuruldu');
            
            // Mesaj dinleyicisini ekle (varsa)
            removeMessageListener(handleNewMessage); // Önce mevcut dinleyiciyi kaldır
            addMessageListener(handleNewMessage);  // Sonra yeniden ekle
            
            // Eğer seçili sohbet varsa, sohbete katıl
            if (selectedChat && selectedChat.id) {
              try {
                joinChat(selectedChat.id);
                console.log(`${selectedChat.id} ID'li sohbete yeniden katılındı`);
              } catch (joinErr) {
                console.warn('Sohbete yeniden katılma hatası:', joinErr);
              }
            }
          } else {
            console.warn('WebSocket yeniden bağlantı başarısız:', reconnection.reason);
          }
        }
      } catch (error) {
        console.error('WebSocket bağlantı kontrolü hatası:', error);
      }
    }, 30000); // Her 30 saniyede bir kontrol et
    
    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, [user, selectedChat]);

  // Ana useEffect - Sayfa yüklendiğinde çalışır
  useEffect(() => {
    // Kullanıcı giriş yapmamışsa giriş sayfasına yönlendir
    if (!user) {
      navigate('/login');
      return;
    }
    
    console.log('Message sayfası yükleniyor...');
    
    // Sayfa yüklenirken gerekli verileri getir
    const initializePage = async () => {
      try {
        // WebSocket bağlantısını hemen kur
        console.log('WebSocket bağlantısı kuruluyor...');
        const wsConnection = await websocketService.ensureConnected();
        
        if (wsConnection.connected) {
          console.log('WebSocket bağlantısı başarıyla kuruldu');
        } else {
          console.warn('WebSocket bağlantısı kurulamadı:', wsConnection.reason);
          // Bağlantı kurulamazsa uyarı göster ama devam et
          showToast('Anlık mesajlaşma bağlantısı kurulamadı. Mesajlarınız gecikmeli olarak görüntülenebilir.', 'warning');
        }
        
        // Mesaj dinleyicisini ekle - yeni mesajlar geldiğinde ekrana yansıtacak
        addMessageListener(handleNewMessage);
        console.log('Mesaj dinleyicisi eklendi');
        
        // Durum dinleyicisini ekle - kullanıcı durumlarını takip etmek için
        websocketService.addStatusUpdateListener(handleStatusUpdate);
        console.log('Durum dinleyicisi eklendi');
        
        // Önce arkadaş listesini getir
        console.log('Arkadaş listesi yükleniyor...');
        await fetchFriendsList();
        console.log('Arkadaş listesi başarıyla yüklendi');
        
        // Sonra sohbetleri getir
        console.log('Sohbetler yükleniyor...');
        const chatsData = await fetchChats();
        console.log(`${chatsData.length} sohbet yüklendi`);
        
        // Bağlantı kontrolü - her şey yüklendikten sonra tekrar kontrol edelim
        setTimeout(async () => {
          try {
            // WebSocket bağlantısı kesilmiş olabilir, tekrar deneyelim
            if (!websocketService.isConnected()) {
              console.log('WebSocket bağlantısı kesilmiş, yeniden bağlanılıyor...');
              const reconnection = await websocketService.ensureConnected();
              
              if (reconnection.connected) {
                console.log('WebSocket bağlantısı yeniden kuruldu');
                // Hiçbir dinleyici yoksa tekrar ekleyelim
                addMessageListener(handleNewMessage);
                
                // Seçili sohbet varsa, sohbete katıl
                if (selectedChat && selectedChat.id) {
                  try {
                    joinChat(selectedChat.id);
                    console.log(`${selectedChat.id} ID'li sohbete yeniden katılındı`);
                  } catch (joinErr) {
                    console.warn('Sohbete yeniden katılma hatası:', joinErr);
                  }
                }
              } else {
                console.warn('WebSocket bağlantısı yeniden kurulamadı');
              }
            }
          } catch (reconnectErr) {
            console.error('Yeniden bağlantı hatası:', reconnectErr);
          }
        }, 3000); // 3 saniye sonra tekrar kontrol et
      } catch (error) {
        console.error('Sayfa yüklenirken hata:', error);
        setError('Sayfa yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.');
      }
    };
    
    // Sayfa yüklenirken gerekli verileri getir
    initializePage();
    
    // Component unmount olduğunda dinleyiciyi kaldır ve WebSocket bağlantısını kapat
    return () => {
      console.log('Message sayfasından çıkılıyor...');
      removeMessageListener(handleNewMessage);
      websocketService.removeStatusUpdateListener(handleStatusUpdate);
      console.log('Mesaj ve durum dinleyicileri kaldırıldı');
      
      // WebSocket bağlantısını kapat
      try {
        disconnectWebSocket();
        console.log('WebSocket bağlantısı kapatıldı');
      } catch (error) {
        console.warn('WebSocket bağlantısı kapatılırken hata:', error);
      }
    };
  }, [user, navigate]);
  
  // Yeni mesaj geldiğinde aşağı kaydır (debounced)
  useEffect(() => {
    scrollToBottom();
    return () => {};
  }, [messages]);
  
  // Seçili sohbet değiştiğinde WebSocket aboneliğini güncelle
  useEffect(() => {
    // Seçili bir sohbet varsa ve kullanıcı oturum açmışsa
    if (selectedChat && selectedChat.id && user) {
      console.log(`Seçili sohbet değişti, şimdi: ${selectedChat.id}`);
      
      // WebSocket bağlantısını kontrol et
      (async () => {
        try {
          // WebSocket bağlantısını kontrol et ve gerekirse yeniden bağlan
          const connection = await websocketService.ensureConnected();
          
          if (connection.connected) {
            console.log('WebSocket bağlantısı hazır, sohbete katılınıyor...');
            // Sohbete katıl
            try {
              joinChat(selectedChat.id);
              console.log(`${selectedChat.id} ID'li sohbete katılındı`);
              
              // Yeni mesaj dinleyicisini aktif et
              addMessageListener(handleNewMessage);
            } catch (joinError) {
              console.error('Sohbete katılırken hata:', joinError);
            }
          } else {
            console.error('WebSocket bağlantısı kurulamadı:', connection.reason);
          }
        } catch (error) {
          console.error('WebSocket bağlantı kontrolü hatası:', error);
        }
      })();
      
      // Mesajları getir - ama bunu sadece bir kez yap
      fetchMessages(selectedChat.id);
    }
  }, [selectedChat?.id, user?.id]); // Sadece sohbet ID'si veya kullanıcı ID'si değiştiğinde tetikle
  
  // Toast bildirimi göster
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // Toast'ı kapat
  const closeToast = () => {
    setToast(null);
  };

  // Kullanıcıyı sohbete zorla ekle
  const handleForceJoinChat = async () => {
    if (!selectedChat || !selectedChat.id || !user || !user.id) {
      showToast('Geçersiz sohbet veya kullanıcı', 'error');
      return;
    }
    
    try {
      showToast('Sohbete katılım düzeltiliyor...', 'info');
      
      // Kullanıcıyı sohbete zorla ekle
      const response = await chatService.forceAddUserToChat(selectedChat.id, user.id);
      
      if (response && response.success) {
        showToast('Sohbete başarıyla katıldınız', 'success');
        
        // Sohbeti yeniden yükle
        await fetchMessages(selectedChat.id);
        
        // WebSocket üzerinden katılma bildirimi gönder
        setTimeout(() => {
          try {
            joinChat(selectedChat.id);
            console.log(`${selectedChat.id} ID'li sohbete katılma bildirimi yeniden gönderildi`);
          } catch (wsError) {
            console.warn('Yeniden katılma sırasında hata:', wsError);
          }
        }, 1000);
        
      } else {
        throw new Error('Sohbete katılım düzeltilemedi');
      }
    } catch (error) {
      console.error('Sohbete zorla katılma hatası:', error);
      showToast('Sohbete katılım düzeltilemedi: ' + (error.message || 'Bilinmeyen hata'), 'error');
    }
  };

  // Hata mesajı veya boş state gösterimi
  const renderErrorOrEmpty = () => {
    // Eğer hata varsa hata mesajını göster
    if (error) {
      // Özel hata mesajı kontrolleri
      const isParticipantError = error.includes('katılımcı değil') || 
                                 error.toLowerCase().includes('yetki') || 
                                 error.toLowerCase().includes('izin');
      
      return (
        <div className="error-state">
          <div className="icon">
            <FaComments />
          </div>
          <h4>Hata</h4>
          <p>{error}</p>
          
          {isParticipantError && (
            <button 
              className="fix-chat-button"
              onClick={handleForceJoinChat}
            >
              Sohbete Katılımı Düzelt
            </button>
          )}
        </div>
      );
    }
  };

  // Kullanıcı durum güncellemesi işleyicisi
  const handleStatusUpdate = (statusUpdate) => {
    if (!statusUpdate || !statusUpdate.userId) {
      console.warn('Geçersiz durum güncellemesi alındı:', statusUpdate);
      return;
    }
    
    console.log('Durum güncellemesi alındı:', statusUpdate);
    
    // Kullanıcının çevrimiçi/çevrimdışı durumunu güncelle
    const isUserOnline = statusUpdate.online === true;
    const userId = statusUpdate.userId;
    
    // Sohbetleri güncelle - bu kullanıcının olduğu sohbetlerin durumunu yenile
    setChats(prevChats => {
      const updatedChats = prevChats.map(chat => {
        if (chat.participants) {
          // Chat katılımcılarını kontrol et
          const updatedParticipants = chat.participants.map(participant => {
            // Bu katılımcı durum güncellemesi yapılan kullanıcı mı?
            if (participant.id === userId) {
              return {
                ...participant,
                online: isUserOnline
              };
            }
            return participant;
          });
          
          return {
            ...chat,
            participants: updatedParticipants
          };
        }
        return chat;
      });
      
      return updatedChats;
    });
    
    // Eğer seçili sohbet varsa ve bu kullanıcı o sohbetin bir parçasıysa, seçili sohbeti de güncelle
    if (selectedChat && selectedChat.participants) {
      setSelectedChat(prevSelected => {
        const updatedParticipants = prevSelected.participants.map(participant => {
          if (participant.id === userId) {
            return {
              ...participant,
              online: isUserOnline
            };
          }
          return participant;
        });
        
        return {
          ...prevSelected,
          participants: updatedParticipants
        };
      });
    }
  };

  // Sohbet listesine geri dönme fonksiyonu
  const backToChats = () => {
    setSelectedChat(null);
    setShowChatList(true);
  };

  return (
    <Layout>
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={closeToast} 
        />
      )}
        <div className="messages-container">
          <h2>Mesajlar</h2>
          
          <div className="chat-interface">
            {/* Mobil görünümde sohbet listesi ve sohbet arasında geçiş yapmak için koşullu render kullanıyoruz */}
            {showChatList ? (
              <div className="chat-sidebar full-width">
                <div className="chat-header">
                  <h3>Sohbetler</h3>
                  {/* Yeni sohbet başlatma butonu */}
                  {friends && friends.length > 0 && (
                    <button className="new-chat-button" onClick={() => setShowFriendList(true)}>
                      <FaComments /> Yeni Sohbet
                    </button>
                  )}
                </div>
                
                {error && <div className="error-message">{error}</div>}
                
                {chats && chats.length > 0 ? (
                  <div className="chat-list">
                    {chats.map(chat => (
                      <div 
                        key={chat.id} 
                        className={`chat-item ${selectedChat && selectedChat.id === chat.id ? 'active' : ''}`}
                        onClick={() => selectChat(chat)}
                      >
                        <div className="chat-avatar">
                          {chat.participants && chat.participants.length > 0 && user && (
                            chat.participants.filter(p => p.id !== user.id)[0]?.profileImageUrl ? (
                              <img 
                                src={chat.participants.filter(p => p.id !== user.id)[0]?.profileImageUrl.startsWith('http') 
                                  ? chat.participants.filter(p => p.id !== user.id)[0]?.profileImageUrl 
                                  : `https://backend-gq5v.onrender.com${chat.participants.filter(p => p.id !== user.id)[0]?.profileImageUrl}`
                                } 
                                alt={`${chat.participants.filter(p => p.id !== user.id)[0]?.username} profil fotoğrafı`}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.parentNode.innerHTML = chat.participants.filter(p => p.id !== user.id)[0]?.username.charAt(0).toUpperCase();
                                }}
                              />
                            ) : (
                              chat.participants.filter(p => p.id !== user.id)[0]?.username.charAt(0).toUpperCase()
                            )
                          )}
                          
                          {chat.participants && chat.participants.length > 0 && user && 
                            chat.participants.filter(p => p.id !== user.id)[0]?.online && (
                              <span className="online-indicator" title="Çevrimiçi"></span>
                            )
                          }
                        </div>
                        <div className="chat-info">
                          <div className="chat-name">
                            {chat.participants && chat.participants.length > 0 && user && 
                              chat.participants.filter(p => p.id !== user.id).map(p => p.isim + ' ' + p.soyad).join(', ')}
                          </div>
                          {chat.lastMessage && (
                            <div className="chat-last-message">{chat.lastMessage}</div>
                          )}
                        </div>
                        {chat.lastMessageTime && (
                          <div className="chat-time">
                            {new Date(chat.lastMessageTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="icon">
                      <FaEnvelope />
                    </div>
                    <h4>Henüz hiç sohbetiniz yok</h4>
                    <p>Yeni bir sohbet başlatmak için aşağıdaki butona tıklayabilirsiniz.</p>
                    {friends && friends.length > 0 ? (
                      <button 
                        className="create-chat-button"
                        onClick={() => setShowFriendList(true)}
                      >
                        <FaComments /> Yeni Sohbet Başlat
                      </button>
                    ) : (
                      <button 
                        className="btn-secondary"
                        onClick={() => navigate('/friends')}
                      >
                        <FaUserFriends /> Arkadaş Ekle
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="chat-content full-width">
                {selectedChat ? (
                  <>
                    <div className="chat-header">
                      <button className="back-button" onClick={backToChats}>
                        <FaArrowLeft /> Geri
                      </button>
                      <div className="chat-avatar">
                        {selectedChat.participants && selectedChat.participants.length > 0 && user && (
                          selectedChat.participants.filter(p => p.id !== user.id)[0]?.profileImageUrl ? (
                            <img 
                              src={selectedChat.participants.filter(p => p.id !== user.id)[0]?.profileImageUrl.startsWith('http') 
                                ? selectedChat.participants.filter(p => p.id !== user.id)[0]?.profileImageUrl 
                                : `https://backend-gq5v.onrender.com${selectedChat.participants.filter(p => p.id !== user.id)[0]?.profileImageUrl}`
                              } 
                              alt={`${selectedChat.participants.filter(p => p.id !== user.id)[0]?.username} profil fotoğrafı`}
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = selectedChat.participants.filter(p => p.id !== user.id)[0]?.username.charAt(0).toUpperCase();
                              }}
                            />
                          ) : (
                            selectedChat.participants.filter(p => p.id !== user.id)[0]?.username.charAt(0).toUpperCase()
                          )
                        )}
                      </div>
                      <div className="chat-info">
                        <div className="chat-name">
                          {selectedChat.participants && selectedChat.participants.length > 0 && user && 
                            selectedChat.participants.filter(p => p.id !== user.id).map(p => p.isim + ' ' + p.soyad).join(', ')}
                        </div>
                        <div className="chat-status">
                          {selectedChat.participants && selectedChat.participants.length > 0 && user && 
                            selectedChat.participants.filter(p => p.id !== user.id)[0]?.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                        </div>
                      </div>
                      <div className="chat-actions">
                        <button 
                          className="delete-chat-button"
                          onClick={handleDeleteChat}
                          title="Sohbeti Sil"
                        >
                          <FaTrash /> Sil
                        </button>
                      </div>
                    </div>
                    
                    <div className="chat-messages" ref={messagesListRef}>
                      {error ? (
                        renderErrorOrEmpty()
                      ) : messages.length === 0 ? (
                        <div className="empty-state">
                          <div className="icon">
                            <FaEnvelope />
                          </div>
                          <h4>Henüz mesaj yok</h4>
                          <p>Konuşmaya başlamak için ilk mesajınızı gönderin</p>
                        </div>
                      ) : (
                        renderMessages()
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                    
                    <div className="message-input-container">
                      <input 
                        type="text" 
                        className="message-input" 
                        placeholder="Bir mesaj yazın..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      />
                      <button 
                        className="send-button"
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || !user}
                      >
                        <FaPaperPlane />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="icon">
                      <FaComments />
                    </div>
                    <h4>Mesajlaşmaya Başlayın</h4>
                    <p>Lütfen bir sohbet seçin veya yeni bir sohbet başlatın.</p>
                    <button className="back-button" onClick={backToChats}>
                      <FaArrowLeft /> Sohbetlere Dön
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Arkadaş listesini gösterecek modal popup */}
          {showFriendList && (
            <div className="friends-modal-overlay" onClick={() => setShowFriendList(false)}>
              <div className="friends-modal" onClick={(e) => e.stopPropagation()}>
                <div className="friends-modal-header">
                  <h3>Sohbet Başlat</h3>
                  <button className="close-button" onClick={() => setShowFriendList(false)}>
                    <FaTimes />
                  </button>
                </div>
                <div className="friends-modal-content">
                  {friends && friends.length > 0 ? (
                    <div className="friends-list">
                      {friends.map(friend => (
                        <div 
                          key={friend.id} 
                          className="friend-item"
                          onClick={() => {
                            startPrivateChat(friend.id);
                            setShowFriendList(false);
                          }}
                        >
                          <div className="friend-avatar">
                            {friend && friend.profileImageUrl ? (
                              <img 
                                src={friend.profileImageUrl.startsWith('http') 
                                  ? friend.profileImageUrl 
                                  : `https://backend-gq5v.onrender.com${friend.profileImageUrl}`
                                }
                                alt={`${friend.username} profil fotoğrafı`}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.style.display = 'none';
                                  e.target.parentNode.innerHTML = friend && friend.username ? friend.username.charAt(0).toUpperCase() : '?';
                                }}
                              />
                            ) : (
                              <span>{friend && friend.username ? friend.username.charAt(0).toUpperCase() : '?'}</span>
                            )}
                          </div>
                          <div className="friend-info">
                            <div className="friend-name">{friend.isim} {friend.soyad}</div>
                            <div className="friend-status">
                              <span className={`status-indicator ${friend.online ? 'online' : 'offline'}`}></span>
                              {friend.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state small">
                      <p>Henüz arkadaşınız yok.</p>
                      <button 
                        className="btn-secondary"
                        onClick={() => {
                          setShowFriendList(false);
                          navigate('/friends');
                        }}
                      >
                        Arkadaş Ekle
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
    </Layout>
  );
};

export default Message;