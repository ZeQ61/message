import React, { useState } from 'react';

const MediaMessage = ({ media }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Medya tipini belirle
  const getMediaType = (mediaType) => {
    if (mediaType.startsWith('image/')) return 'image';
    if (mediaType.startsWith('video/')) return 'video';
    if (mediaType.startsWith('audio/')) return 'audio';
    if (mediaType === 'application/pdf') return 'pdf';
    return 'file';
  };

  // Medya yüklendiğinde yükleniyor durumunu değiştir
  const handleMediaLoaded = () => {
    setIsLoading(false);
  };

  // Medya yüklenirken hata olduğunda
  const handleMediaError = () => {
    setIsLoading(false);
    setError('Medya yüklenemedi');
  };

  // Medya tipine göre içerik oluştur
  const renderMedia = () => {
    const mediaType = getMediaType(media.mediaType);

    switch (mediaType) {
      case 'image':
        return (
          <div className="media-container image-container">
            {isLoading && <div className="media-loading">Yükleniyor...</div>}
            <img 
              src={media.mediaUrl} 
              alt="Resim" 
              className="media-image"
              onLoad={handleMediaLoaded}
              onError={handleMediaError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
            {error && <div className="media-error">{error}</div>}
          </div>
        );
      
      case 'video':
        return (
          <div className="media-container video-container">
            {isLoading && <div className="media-loading">Yükleniyor...</div>}
            <video 
              src={media.mediaUrl} 
              controls 
              className="media-video"
              onLoadedData={handleMediaLoaded}
              onError={handleMediaError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
            {error && <div className="media-error">{error}</div>}
          </div>
        );

      case 'audio':
        return (
          <div className="media-container audio-container">
            {isLoading && <div className="media-loading">Yükleniyor...</div>}
            <audio 
              src={media.mediaUrl} 
              controls 
              className="media-audio"
              onLoadedData={handleMediaLoaded}
              onError={handleMediaError}
              style={{ display: isLoading ? 'none' : 'block' }}
            />
            {error && <div className="media-error">{error}</div>}
          </div>
        );

      case 'pdf':
        return (
          <div className="media-container pdf-container">
            <div className="pdf-preview">
              <img src="/assets/pdf-icon.png" alt="PDF" className="pdf-icon" />
              <a 
                href={media.mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="pdf-link"
              >
                PDF Dosyasını Görüntüle
              </a>
            </div>
          </div>
        );
        
      default:
        return (
          <div className="media-container file-container">
            <div className="file-preview">
              <img src="/assets/file-icon.png" alt="Dosya" className="file-icon" />
              <a 
                href={media.mediaUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="file-link"
                download
              >
                Dosyayı İndir
              </a>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="media-message">
      {renderMedia()}
    </div>
  );
};

export default MediaMessage; 