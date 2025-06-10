import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import AuthService from './services/AuthService';
import WebSocketService from './services/WebSocketService';

// Axios interceptors kurulumu
AuthService.setupAxiosInterceptors();

// Eğer kullanıcı oturum açmışsa WebSocket bağlantısını başlat
if (AuthService.isAuthenticated()) {
  WebSocketService.connect()
    .then(() => {
      console.log('WebSocket bağlantısı başarıyla kuruldu');
    })
    .catch(error => {
      console.error('WebSocket bağlantı hatası:', error);
    });
}

// React 19 için createRoot API'sini kullanıyoruz
const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
