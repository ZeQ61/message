-- Mevcut kısıtlamayı kaldır
ALTER TABLE group_messages DROP CONSTRAINT IF EXISTS group_messages_type_check;

-- Yeni kısıtlamayı ekle (tüm MessageType enum değerlerini içerecek şekilde)
ALTER TABLE group_messages ADD CONSTRAINT group_messages_type_check 
CHECK (type IN ('MESSAGE', 'JOIN', 'LEAVE', 'FILE', 'IMAGE', 'VIDEO', 'AUDIO', 'SYSTEM', 
               'DIRECT', 'GROUP', 'GROUP_JOIN', 'GROUP_LEAVE', 'GROUP_INVITE', 'GROUP_ADMIN', 'GROUP_UPDATE'));

-- Not: Bu SQL dosyasını veritabanınızda çalıştırmanız gerekiyor.
-- PostgreSQL komut satırı aracı (psql) veya bir veritabanı yönetim aracı kullanabilirsiniz. 