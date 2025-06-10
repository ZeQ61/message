import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Message from './pages/Message';
import Friends from './pages/Friends';
import Profile from './pages/Profile';
import AdminLogin from './pages/AdminLogin';
import AdminRegister from './pages/AdminRegister';
import AdminPanel from './pages/AdminPanel';
import Groups from './pages/Groups';
import GroupChat from './pages/GroupChat';
import { connectWebSocket, ensureConnected } from './services/websocket';
import './App.scss';

function App() {
  // Viewport meta tag'ini dinamik olarak ekle
  useEffect(() => {
    // Mevcut meta tag var mı kontrol et
    let viewport = document.querySelector("meta[name=viewport]");
    
    // Yoksa yeni bir meta tag oluştur
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = "viewport";
      document.head.appendChild(viewport);
    }
    
    // Viewport içeriğini mobil cihazlar için optimize edilmiş şekilde ayarla
    viewport.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
    
    return () => {
      // Component unmount olduğunda varsayılan değere dön
      if (viewport) {
        viewport.content = "width=device-width, initial-scale=1.0";
      }
    };
  }, []);

  // Uygulama başlatıldığında WebSocket bağlantısını başlat
  useEffect(() => {
    // Daha güvenli bir şekilde WebSocket bağlantısı kurmayı dene
    const initWebSocket = async () => {
      try {
        // Bağlantıyı kurulup kullanılabilir olduğundan emin ol
        await ensureConnected();
        console.log('WebSocket bağlantısı başarıyla kuruldu ve hazır.');
      } catch (error) {
        console.error('WebSocket bağlantısı sırasında hata:', error);
        // Hata olsa bile sessizce devam et, gerektiğinde tekrar bağlanmayı deneyecek
      }
    };
    
    // WebSocket bağlantısını başlat
    initWebSocket();
    
    return () => {
      // Uygulama kapatıldığında bağlantıyı kapat
      // Bu otomatik olarak websocket.js'de yapılacak
    };
  }, []);

  return (
    <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/messages" element={<Message />} />
          <Route path="/friends" element={<Friends />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/group-chat/:groupId" element={<GroupChat />} />
          <Route path="/" element={<Navigate to="/messages" />} />
          
          {/* Admin Routes */}
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/admin-panel" element={<AdminPanel />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
