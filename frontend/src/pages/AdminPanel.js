import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserShield, FaSearch, FaUsers, FaChartBar, FaCog, FaSignOutAlt, FaSync } from 'react-icons/fa';
import { adminService } from '../services/api';
import '../styles/admin.scss';

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  
  const navigate = useNavigate();
  
  useEffect(() => {
    // Sadece admin'lerin giriş yapabilmesi için kontrol
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const adminToken = localStorage.getItem('adminToken');
    
    // Debug bilgisi
    setDebugInfo(`isAdmin: ${isAdmin}, Token: ${adminToken ? adminToken.substring(0, 15) + '...' : 'yok'}`);
    
    if (!isAdmin || !adminToken) {
      navigate('/admin-login');
      return;
    }
    
    fetchUsers();
  }, [navigate]);
  
  const fetchUsers = async () => {
    setLoading(true);
    try {
      // API çağrısı öncesi debug
      console.log('AdminToken:', localStorage.getItem('adminToken'));
      
      const response = await adminService.getAllUsers();
      setUsers(response.data);
      setError('');
    } catch (err) {
      console.error('Kullanıcılar getirilirken hata oluştu:', err);
      // Hata detayını göster
      if (err.response) {
        console.log('Hata Detayı:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
      }
      
      setError(`Kullanıcı listesi alınamadı: ${err.response?.status} ${err.response?.statusText}`);
      // Token süresi dolmuş olabilir, admin login'e yönlendir
      if (err.response?.status === 403) {
        // localStorage.removeItem('adminToken');
        // localStorage.removeItem('isAdmin');
        // navigate('/admin-login');
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('isAdmin');
    navigate('/admin-login');
  };
  
  const handleDeleteUser = async (userId) => {
    if (selectedUser?.id !== userId || !confirmDelete) {
      setSelectedUser(users.find(user => user.id === userId));
      setConfirmDelete(true);
      return;
    }
    
    try {
      await adminService.deleteUser(userId);
      setUsers(users.filter(user => user.id !== userId));
      setSuccessMessage('Kullanıcı başarıyla silindi');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Kullanıcı silinirken hata oluştu:', err);
      setError('Kullanıcı silinemedi. Lütfen tekrar deneyin.');
    } finally {
      setSelectedUser(null);
      setConfirmDelete(false);
    }
  };
  
  const cancelDelete = () => {
    setSelectedUser(null);
    setConfirmDelete(false);
  };
  
  // Arama filtreleme
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.isim.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.soyad.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  return (
    <div className="admin-panel">
      <header className="admin-header">
        <h1><FaUserShield /> Admin Paneli</h1>
        <button className="admin-logout-btn" onClick={handleLogout}>
          <FaSignOutAlt style={{ marginRight: '5px' }} /> Çıkış Yap
        </button>
      </header>
      
      {debugInfo && (
        <div style={{padding: '10px', background: '#f8f9fa', borderBottom: '1px solid #ddd', fontSize: '12px'}}>
          <strong>Debug:</strong> {debugInfo}
          <button 
            onClick={fetchUsers} 
            style={{marginLeft: '15px', padding: '2px 8px', background: '#3f72af', color: 'white', border: 'none', borderRadius: '4px'}}
          >
            <FaSync style={{marginRight: '5px'}} /> Yeniden Dene
          </button>
        </div>
      )}
      
      <div className="admin-main">
        <div className="admin-sidebar">
          <div className="admin-info">
            <div className="admin-avatar">A</div>
            <div className="admin-role">Yönetici</div>
          </div>
          
          <ul className="admin-nav">
            <li className="active">
              <button><FaUsers style={{ marginRight: '10px' }} /> Kullanıcı Yönetimi</button>
            </li>
            <li>
              <button><FaChartBar style={{ marginRight: '10px' }} /> İstatistikler</button>
            </li>
            <li>
              <button><FaCog style={{ marginRight: '10px' }} /> Sistem Ayarları</button>
            </li>
          </ul>
        </div>
        
        <div className="admin-content">
          <div className="content-header">
            <h2><FaUsers style={{ marginRight: '10px' }} /> Kullanıcı Yönetimi</h2>
            <div className="search-box">
              <input 
                type="text" 
                placeholder="Kullanıcı ara..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <FaSearch className="search-icon" />
            </div>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="success-message">
              {successMessage}
            </div>
          )}
          
          {loading ? (
            <div className="loading-spinner">Yükleniyor...</div>
          ) : (
            <div className="users-table-container">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Profil</th>
                    <th>İsim Soyisim</th>
                    <th>Kullanıcı Adı</th>
                    <th>Email</th>
                    <th>Durum</th>
                    <th>Kayıt Tarihi</th>
                    <th>İşlemler</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="no-user-message">Kullanıcı bulunamadı</td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.id} className={selectedUser?.id === user.id ? 'selected-row' : ''}>
                        <td>{user.id}</td>
                        <td>
                          <div className="user-avatar-small">
                            {user.profileImageUrl ? (
                              <img src={user.profileImageUrl} alt={user.username || 'Kullanıcı'} />
                            ) : (
                              <div className="avatar-placeholder">
                                {user && user.username ? user.username.charAt(0).toUpperCase() : '?'}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{user.isim} {user.soyad}</td>
                        <td>{user.username}</td>
                        <td>{user.email}</td>
                        <td>
                          <span className={`status-badge ${user.isOnline ? 'online' : 'offline'}`}>
                            {user.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                          </span>
                        </td>
                        <td>{new Date(user.createdAt).toLocaleDateString('tr-TR')}</td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="delete-button"
                              onClick={() => handleDeleteUser(user.id)}
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {confirmDelete && selectedUser && (
            <div className="delete-confirmation-modal">
              <div className="modal-content">
                <h3>Kullanıcı Silme Onayı</h3>
                <p>
                  <strong>{selectedUser.isim} {selectedUser.soyad}</strong> adlı kullanıcıyı silmek istediğinizden emin misiniz?
                </p>
                <p className="warning-text">Bu işlem geri alınamaz!</p>
                
                <div className="modal-actions">
                  <button 
                    className="cancel-button" 
                    onClick={cancelDelete}
                  >
                    İptal
                  </button>
                  <button 
                    className="confirm-delete-button" 
                    onClick={() => handleDeleteUser(selectedUser.id)}
                  >
                    Sil
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel; 