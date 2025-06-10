import React, { useState, useRef } from 'react';
import MediaService from '../services/MediaService';
import { ALLOWED_MEDIA_TYPES, MAX_FILE_SIZE } from '../config/constants';

const MediaUploader = ({ chatId, onUploadSuccess, onUploadError }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Dosya seçme butonuna tıklandığında
  const handleButtonClick = () => {
    fileInputRef.current.click();
  };

  // Dosya sürükleme işlemleri
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  // Dosya bırakıldığında
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Dosya seçildiğinde
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  // Dosyaları işle
  const handleFiles = (files) => {
    // Tek dosya seçimi
    const file = files[0];
    
    // Dosya türü kontrolü
    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      onUploadError('Desteklenmeyen dosya türü. Lütfen geçerli bir medya dosyası seçin.');
      return;
    }
    
    // Dosya boyutu kontrolü
    if (file.size > MAX_FILE_SIZE) {
      onUploadError(`Dosya çok büyük. Maksimum dosya boyutu: ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      return;
    }
    
    // Dosyayı yükle
    uploadFile(file);
  };

  // Dosya yükleme
  const uploadFile = (file) => {
    setIsUploading(true);
    setUploadProgress(0);

    // Upload işlemi başlat
    MediaService.uploadMedia(chatId, file)
      .then(response => {
        if (response.data && response.data.success) {
          setIsUploading(false);
          onUploadSuccess(response.data);
        } else {
          throw new Error('Medya yükleme başarısız');
        }
      })
      .catch(error => {
        setIsUploading(false);
        const errorMessage = error.response?.data?.message || 'Medya yüklenirken bir hata oluştu';
        onUploadError(errorMessage);
      });
  };

  return (
    <div className="media-uploader">
      <div 
        className={`drop-area ${dragActive ? 'active' : ''} ${isUploading ? 'uploading' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={ALLOWED_MEDIA_TYPES.join(',')}
          style={{ display: 'none' }}
        />
        
        {isUploading ? (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }} 
              />
            </div>
            <span className="progress-text">{uploadProgress}%</span>
          </div>
        ) : (
          <div className="upload-content" onClick={handleButtonClick}>
            <div className="upload-icon">
              <i className="fas fa-cloud-upload-alt"></i>
            </div>
            <div className="upload-text">
              <p>Dosya seçmek için tıklayın veya sürükleyip bırakın</p>
              <p className="upload-hint">Maksimum dosya boyutu: 10MB</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="upload-actions">
        <button 
          className="upload-button" 
          onClick={handleButtonClick}
          disabled={isUploading}
        >
          Dosya Seç
        </button>
      </div>
    </div>
  );
};

export default MediaUploader; 