/**
 * Kimlik doğrulama ile ilgili yardımcı fonksiyonlar
 */

// API istekleri için kimlik doğrulama başlığını oluştur
export const getAuthHeader = () => {
  // Önce user objesini kontrol et
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    return { Authorization: `Bearer ${user.token}` };
  }
  
  // Eğer user objesi yoksa, doğrudan token'a bak
  const token = localStorage.getItem('token');
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  
  // Hiçbir kimlik doğrulama bilgisi yoksa boş obje dön
  return {};
};

// Kullanıcı oturum açmış mı kontrol et
export const isAuthenticated = () => {
  // Önce user objesini kontrol et
  const user = JSON.parse(localStorage.getItem('user'));
  if (user && user.token) {
    return true;
  }
  
  // Eğer user objesi yoksa, doğrudan token'a bak
  const token = localStorage.getItem('token');
  return !!token;
};

// Kullanıcı bilgilerini al
export const getCurrentUser = () => {
  // Önce user objesini kontrol et
  const user = JSON.parse(localStorage.getItem('user'));
  if (user) {
    return user;
  }
  
  // Eğer user objesi yoksa ama token varsa, geçici bir kullanıcı objesi dön
  const token = localStorage.getItem('token');
  if (token) {
    return { token };
  }
  
  // Hiçbir oturum bilgisi yoksa null dön
  return null;
};

// Kullanıcı ID'sini al
export const getCurrentUserId = () => {
  const user = JSON.parse(localStorage.getItem('user'));
  return user ? user.id : null;
};
