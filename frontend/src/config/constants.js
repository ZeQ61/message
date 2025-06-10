// API endpoint'leri
export const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8080' 
  : 'https://backend-gq5v.onrender.com';

// WebSocket mesaj türleri
export const MESSAGE_TYPES = {
  CHAT: 'CHAT',
  JOIN: 'JOIN',
  LEAVE: 'LEAVE',
  MEDIA: 'MEDIA',
  TYPING: 'TYPING'
};

// Kullanıcı durumları
export const USER_STATUS = {
  ONLINE: 'ONLINE',
  OFFLINE: 'OFFLINE',
  AWAY: 'AWAY'
};

// Arkadaşlık durumları
export const FRIENDSHIP_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED'
};

// İzin verilen medya türleri
export const ALLOWED_MEDIA_TYPES = [
  'image/jpeg', 
  'image/png', 
  'image/gif', 
  'image/webp',
  'video/mp4', 
  'video/webm',
  'audio/mp3', 
  'audio/wav', 
  'audio/ogg',
  'application/pdf'
];

// Maksimum dosya boyutu (10MB)
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

// WebSocket bağlantı bilgileri
export const WS_CONFIG = {
  RECONNECT_DELAY: 3000,
  CONNECTION_TIMEOUT: 10000
};

// LocalStorage anahtar isimleri
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  CHAT_HISTORY: 'chat_history'
}; 