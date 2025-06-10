import axios from 'axios';
import { API_BASE_URL } from '../config/constants';
import AuthService from './AuthService';

class MediaService {
  /**
   * Medya dosyası yükler
   */
  uploadMedia(chatId, file) {
    // FormData oluştur
    const formData = new FormData();
    formData.append('file', file);

    return axios.post(
      `${API_BASE_URL}/api/media/upload/${chatId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${AuthService.getToken()}`
        },
        onUploadProgress: progressEvent => {
          // İlerleme yüzdesini hesapla
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          console.log(`Yükleme ilerlemesi: ${percentCompleted}%`);
        }
      }
    );
  }

  /**
   * Medya tipini belirler
   */
  getMediaType(file) {
    const mimeType = file.type;
    
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if (mimeType === 'application/pdf') {
      return 'pdf';
    } else {
      return 'file';
    }
  }

  /**
   * Medya URL'sinden resim önizlemesi oluşturur
   */
  getMediaPreview(mediaUrl, mediaType) {
    if (mediaType === 'image' || mediaType.startsWith('image/')) {
      return mediaUrl;
    } else if (mediaType === 'video' || mediaType.startsWith('video/')) {
      return '/assets/video-placeholder.png';
    } else if (mediaType === 'audio' || mediaType.startsWith('audio/')) {
      return '/assets/audio-placeholder.png';
    } else if (mediaType === 'pdf' || mediaType === 'application/pdf') {
      return '/assets/pdf-placeholder.png';
    } else {
      return '/assets/file-placeholder.png';
    }
  }

  /**
   * Dosya boyutunu formatlar
   */
  formatFileSize(bytes) {
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else if (bytes < 1024 * 1024 * 1024) {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    } else {
      return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    }
  }

  /**
   * Dosya türünü doğrular
   */
  validateFileType(file) {
    const validTypes = [
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
    
    return validTypes.includes(file.type);
  }

  /**
   * Dosya boyutunu doğrular (10MB)
   */
  validateFileSize(file) {
    const maxSize = 10 * 1024 * 1024; // 10MB
    return file.size <= maxSize;
  }
}

export default new MediaService(); 