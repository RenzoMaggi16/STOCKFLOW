ALTER TABLE oauth_flujos ADD COLUMN plataforma ENUM('native','web') NOT NULL DEFAULT 'native';
