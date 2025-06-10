import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../config/constants';

class AuthService {
  /**
   * Kullanıcı girişi yapar ve JWT token alır
   */
  login(username, password) {
    return axios.post(`${API_BASE_URL}/api/auth/login`, {
      username,
      password
    }).then(response => {
      if (response.data.token) {
        this.setToken(response.data.token);
        this.setUser(response.data.user);
      }
      return response.data;
    });
  }

  /**
   * Kullanıcı çıkışı yapar
   */
  logout() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem('token'); // Hem eski hem yeni anahtarları temizle
  }

  /**
   * Yeni kullanıcı kaydı yapar
   */
  register(user) {
    return axios.post(`${API_BASE_URL}/api/auth/register`, user);
  }

  /**
   * Token'ı localStorage'a kaydeder
   */
  setToken(token) {
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
    localStorage.setItem('token', token); // Hem eski hem yeni anahtarları kullan
  }

  /**
   * Token'ı localStorage'dan alır
   */
  getToken() {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || localStorage.getItem('token');
  }

  /**
   * Kullanıcı bilgilerini localStorage'a kaydeder
   */
  setUser(user) {
    localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  /**
   * Kullanıcı bilgilerini localStorage'dan alır
   */
  getUser() {
    const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
    return userData ? JSON.parse(userData) : null;
  }

  /**
   * Kullanıcının oturum açıp açmadığını kontrol eder
   */
  isAuthenticated() {
    return !!this.getToken();
  }

  /**
   * HTTP isteklerine JWT token ekler
   */
  setupAxiosInterceptors() {
    axios.interceptors.request.use(
      config => {
        const token = this.getToken();
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );

    axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          this.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Token'ın geçerlilik süresini kontrol eder
   */
  checkTokenValidity() {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    try {
      // JWT token'ı decode et
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const { exp } = JSON.parse(jsonPayload);
      
      // Token süresi doldu mu kontrol et
      const currentTime = Date.now() / 1000;
      
      // Token'ın geçerlilik süresi kaldıysa true döndür
      return exp > currentTime;
    } catch (error) {
      console.error('Token geçerliliği kontrol edilirken hata:', error);
      return false;
    }
  }
  
  /**
   * Token'ın geçerliliği bitmeden önce yenileme ihtiyacı var mı kontrol eder
   * Örneğin, 5 dakikadan az kaldıysa yenileme yapılabilir
   */
  needsRefresh() {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    
    try {
      // JWT token'ı decode et
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const { exp } = JSON.parse(jsonPayload);
      
      // Şu anki zaman
      const currentTime = Date.now() / 1000;
      
      // 5 dakikadan (300 saniye) az kaldıysa yenileme yapılmalı
      return exp - currentTime < 300;
    } catch (error) {
      console.error('Token yenileme ihtiyacı kontrol edilirken hata:', error);
      return true; // Hata durumunda yenileme yap
    }
  }
  
  /**
   * Token'ı yeniler
   */
  async refreshToken() {
    try {
      const response = await axios.post('/api/auth/refresh', {}, {
        headers: {
          'Authorization': `Bearer ${this.getToken()}`
        }
      });
      
      if (response.data && response.data.token) {
        // Yeni token'ı kaydet
        localStorage.setItem('token', response.data.token);
        
        // Eğer user objesi de mevcutsa onu da güncelle
        const user = this.getCurrentUser();
        if (user) {
          user.token = response.data.token;
          localStorage.setItem('user', JSON.stringify(user));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Token yenilenirken hata:', error);
      return false;
    }
  }
  
  /**
   * Eğer token yenileme ihtiyacı varsa otomatik olarak yeniler
   */
  async ensureValidToken() {
    if (!this.checkTokenValidity()) {
      // Token geçersiz, kullanıcıyı çıkış yaptır
      this.logout();
      return false;
    }
    
    if (this.needsRefresh()) {
      // Token yenileme ihtiyacı var
      return await this.refreshToken();
    }
    
    return true;
  }
}

export default new AuthService(); 