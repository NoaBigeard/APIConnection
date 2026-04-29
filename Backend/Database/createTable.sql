-- psql -U postgres -d DBStage


-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO admin;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO admin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO admin;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO admin;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO admin;
DROP TABLE IF EXISTS sizes CASCADE;
DROP TABLE IF EXISTS colors CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS discountCode CASCADE;
DROP TABLE IF EXISTS articles CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS photos CASCADE; 
DROP TABLE IF EXISTS addresses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS configurations CASCADE;

--Faire la table login_log pour mettre user_agent, success ip_address et token

CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    website_name VARCHAR(255),
    nb_failed_attempt INT,
    nb_two_factor_authentification INT,
    fields_to_clean TEXT[] DEFAULT '{}',
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);
INSERT INTO configurations (website_name, nb_failed_attempt, nb_two_factor_authentification, fields_to_clean)
VALUES ('Mon Site', 5, 6, '{"password", "authentication_code"}');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    first_name VARCHAR(50),
    name VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    mail VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(255), 
    sex VARCHAR(10),
    access_level INT DEFAULT 0,
    user_agent VARCHAR(255),
    ip_address VARCHAR(255),
    token VARCHAR(255),
    token_expiry TIMESTAMP,
    session_token VARCHAR(255),
    session_token_expiry TIMESTAMP,
    authentication_code VARCHAR(255),
    mail_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMP,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS addresses (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    name VARCHAR(255),
    first_name VARCHAR(255),
    country VARCHAR(255),
    city VARCHAR(255),
    zip_code VARCHAR(20),
    street VARCHAR(255),   
    additional_address VARCHAR(255),
    id_users INT REFERENCES users(id) ON DELETE CASCADE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS articles (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    ht_price INT NOT NULL,
    tva_price INT NOT NULL,
    ttc_price INT NOT NULL,
    description TEXT,
    stock INT DEFAULT 0,
    sizes VARCHAR(255),
    colors VARCHAR(255),
    id_category INT REFERENCES categories(id) ON DELETE SET NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS photos (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    url_photo VARCHAR(255) NOT NULL,
    display_orders INT DEFAULT 0,
    id_article INT REFERENCES articles(id) ON DELETE CASCADE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS discountCode (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    percentage INT NOT NULL,
    end_date TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    orders_number INT,
    status VARCHAR(50) DEFAULT 'en attente',
    state VARCHAR(50) CHECK (state IN (
        'nouveau','en_preparation','expedie',
        'en_transit','livre','livre_cloture','rembourse'
    )) DEFAULT 'nouveau',
    id_address INT REFERENCES addresses(id) ON DELETE SET NULL,
    ht_price INT NOT NULL,
    tva_price INT NOT NULL,
    ttc_price INT NOT NULL,
    id_users INT REFERENCES users(id) ON DELETE SET NULL,
    id_discount_code INT REFERENCES discountCode(id) ON DELETE SET NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    parent_id INT,
    uuid UUID UNIQUE NOT NULL,
    title VARCHAR(255),
    content TEXT NOT NULL,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    id_users INT REFERENCES users(id) ON DELETE SET NULL,
    id_article INT REFERENCES articles(id) ON DELETE CASCADE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    uuid UUID UNIQUE NOT NULL,
    id_users INT REFERENCES users(id) ON DELETE CASCADE,
    id_article INT REFERENCES articles(id) ON DELETE CASCADE,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS colors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sizes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted BOOLEAN DEFAULT FALSE
);

DROP TABLE IF EXISTS test CASCADE;

