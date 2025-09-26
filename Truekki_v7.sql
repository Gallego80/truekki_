CREATE DATABASE truekki;
USE truekki;

-- Tabla: usuario
CREATE TABLE usuario (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    email VARCHAR(70) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    numero_telefono VARCHAR(20),
    direccion VARCHAR(100),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    verificado BOOLEAN DEFAULT FALSE NOT NULL,
    estado ENUM('activo', 'inactivo', 'bloqueado') DEFAULT 'activo'
);

select * from usuario;
-- Tabla: productos (CORREGIR nombre de columna id_prroducto → id_producto)
CREATE TABLE productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,  -- 👈 Cambiado de id_prroducto
    titulo VARCHAR(255) NOT NULL,
    categoria ENUM('ropa', 'tecnologia', 'hogar') NOT NULL,
    estado ENUM('nuevo', 'usado') NOT NULL,
    descripcion TEXT NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    disponible boolean not null default true,
    ciudad VARCHAR(100) NOT NULL,
    barrio VARCHAR(100) NOT NULL,
    contacto ENUM('whatsapp', 'mensaje') NOT NULL,
    foto LONGBLOB,
    foto_nombre VARCHAR(255),
    id_usuario INT,
    fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

SELECT * FROM productos;

-- ===========================
-- TABLA: intercambio (NUEVO)
-- ===========================
CREATE TABLE intercambio (
    id_intercambio INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_comprador INT,
    id_usuario_vendedor INT,
    estado ENUM('pendiente','aceptado','cancelado','enviado','entregado','finalizado') DEFAULT 'pendiente',
    condiciones TEXT,
    metodo_pago VARCHAR(50),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario_comprador) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_usuario_vendedor) REFERENCES usuario(id_usuario)
);

-- ===========================
-- TABLA: intercambio_detalle (NUEVO)
-- ===========================
CREATE TABLE intercambio_detalle (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_intercambio INT,
    id_producto INT,
    estado ENUM('ofrecido','recibido') NOT NULL,
    FOREIGN KEY (id_intercambio) REFERENCES intercambio(id_intercambio),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);
select * from intercambio_detalle;
-- ===========================
-- TABLA: comentario (NUEVO)
-- ===========================
CREATE TABLE comentario (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    id_intercambio INT,
    id_usuario INT,
    texto TEXT,
    estrellas INT CHECK (estrellas BETWEEN 1 AND 5),
    obligatorio BOOLEAN DEFAULT TRUE,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    editable BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_intercambio) REFERENCES intercambio(id_intercambio),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);

-- ===========================
-- TABLA: favorito (NUEVO)
-- ===========================
CREATE TABLE favorito (
    id_favorito INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    id_producto INT,
    descripcion TEXT,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- ===========================
-- TABLA: comparacion_precios (NUEVO)
-- ===========================
CREATE TABLE comparacion_precios (
    id_comparacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    id_producto INT,
    precio_referencia DECIMAL(10,2),
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- ===========================
-- TABLA: chat (NUEVO)
-- ===========================
CREATE TABLE chat (
    id_chat INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario1 INT,
    id_usuario2 INT,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario1) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_usuario2) REFERENCES usuario(id_usuario)
);

-- ===========================
-- TABLA: reporte (NUEVO)
-- ===========================
CREATE TABLE reporte (
    id_reporte INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_reporta INT,
    id_usuario_reportado INT NULL,
    id_producto INT NULL,
    motivo TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario_reporta) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_usuario_reportado) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

-- ===========================
-- TABLA: bloqueo (NUEVO)
-- ===========================
CREATE TABLE bloqueo (
    id_bloqueo INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT,
    id_usuario_bloqueado INT,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_usuario_bloqueado) REFERENCES usuario(id_usuario)
);

