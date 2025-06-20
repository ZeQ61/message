package com.example.chatapp.repository;

import com.example.chatapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    // Kullanıcı adından kullanıcı bulmak için method
    Optional<User> findByUsername(String username);

    // Email adresinden kullanıcı bulmak için method
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByUsername(String email);
    
    // Kullanıcı adına göre arama (case-insensitive)
    List<User> findByUsernameContainingIgnoreCase(String username);
    
    // Kullanıcı adına göre arama (case-insensitive) - belirli bir ID'yi hariç tut
    List<User> findByUsernameContainingIgnoreCaseAndIdNot(String username, Long userId);
    
    // Kullanıcı arama (kullanıcı adı, e-posta, isim veya soyad ile)
    List<User> findByUsernameContainingOrEmailContainingOrIsimContainingOrSoyadContaining(
            String username, String email, String isim, String soyad);

}
