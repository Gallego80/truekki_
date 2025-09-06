create database truekki;
use truekki;


-- usuarios

create table usuario (
id_usuario int auto_increment primary key,
nombre char(30) not null,
email varchar(70) unique not null,
contraseña varchar(8) unique not null,
conf_contra char(8) not null,
numero_telefono int(15) not null,
direccion varchar(30) unique not null,
fecha_registro datetime default CURRENT_TIMESTAMP, 
verificado boolean default false not null,
estado char(7) default 'activo'
);

alter table usuario modify column estado char(7) default "";
alter table usuario modify column verificado varchar(2) default "";
alter table usuario modify column fecha_registro datetime default CURRENT_TIMESTAMP;
alter table usuario drop column conf_contra;
alter table usuario modify column direccion varchar(30) unique not null;
alter table usuario modify column nombre char(30) not null;
alter table usuario modify column numero_telefono varchar(20) not null;
alter table usuario modify column direccion varchar(30) not null;
ALTER TABLE usuario MODIFY contraseña VARCHAR(255) NOT NULL;


INSERT INTO usuario (nombre, email, contraseña, numero_telefono, direccion)
VALUES ('Diego', 'diego@gmail.com', 'clave123', '3201234567', 'Calle 10#5-67');

INSERT INTO usuario (nombre, email, contraseña, numero_telefono, direccion)
VALUES ('Juan', 'juan@gmail.com', '122daa', '32012345232', 'Calle 11#6-47');


select * from usuario;
delete from usuario where id_usuario = 1;

ALTER TABLE usuario AUTO_INCREMENT = 1;


-- producto

CREATE TABLE producto (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    categoria VARCHAR(50),
    estado ENUM('nuevo','usado','defectuoso') DEFAULT 'usado',
    precio DECIMAL(10,2) DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

select * from producto;

-- publicaciones

CREATE TABLE publicacion (
    id_publicacion INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    estado ENUM('activa','pausada','eliminada') DEFAULT 'activa',
    fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_modificacion DATETIME NULL,
    validada BOOLEAN DEFAULT FALSE,
    visible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE CASCADE
);



-- intercambio

create table intercambios (
id_intercambios int auto_increment primary key,
id_usuario1 int not null,
id_usuario2 int not null,
id_producto1 int not null,
id_producto2 int not null,
estado enum ('pendiente', 'aceptado', 'cancelado', 'completado'),
fecha_entrega datetime,
foreign key (id_usuario1) references usuario (id_usuario),
foreign key (id_usuario2) references usuario (id_usuario),
foreign key (id_producto1) references usuario (id_usuario), 
foreign key (id_producto2) references usuario (id_usuario)
);

ALTER TABLE intercambios 
DROP FOREIGN KEY intercambios_ibfk_3,
DROP FOREIGN KEY intercambios_ibfk_4;

select * from intercambios;

ALTER TABLE intercambios
ADD CONSTRAINT fk_producto1 FOREIGN KEY (id_producto1) REFERENCES producto (id_producto),
ADD CONSTRAINT fk_producto2 FOREIGN KEY (id_producto2) REFERENCES producto (id_producto);

show create table intercambios;


-- comentario

CREATE TABLE comentario (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    id_intercambio INT NOT NULL,
    id_usuario INT NOT NULL,
    texto TEXT,
    calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
    fecha_comentario DATETIME DEFAULT CURRENT_TIMESTAMP,
    obligatorio_post_transaccion BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (id_intercambio) REFERENCES intercambios(id_intercambios) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);


-- chat 

CREATE TABLE chat (
    id_chat INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario1 INT NOT NULL,
    id_usuario2 INT NOT NULL,
    FOREIGN KEY (id_usuario1) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_usuario2) REFERENCES usuario(id_usuario)
);


drop table chat;
drop table mensaje;

-- mensajes

CREATE TABLE mensaje (
    id_mensaje INT AUTO_INCREMENT PRIMARY KEY,
    id_chat INT NOT NULL,
    id_usuario INT NOT NULL,
    texto TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_chat) REFERENCES chat(id_chat) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);


-- notificaciones 

CREATE TABLE notificacion (
    id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    tipo VARCHAR(70),
    mensaje TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    leido BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);


-- subastas 

CREATE TABLE subasta (
    id_subasta INT AUTO_INCREMENT PRIMARY KEY,
    id_producto INT NOT NULL,
    precio_inicial DECIMAL(20.000),
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('activa','finalizada','cancelada') DEFAULT 'activa',
    FOREIGN KEY (id_producto) REFERENCES producto(id_producto) ON DELETE CASCADE
);

alter table subasta modify column precio_inicial decimal (20,2);


-- ofertas

CREATE TABLE oferta_subasta (
    id_oferta INT AUTO_INCREMENT PRIMARY KEY,
    id_subasta INT NOT NULL,
    id_usuario INT NOT NULL,
    monto DECIMAL(20,2),
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_subasta) REFERENCES subasta(id_subasta) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
);

-- reportes 

CREATE TABLE reporte (
    id_reporte INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_reporta INT NOT NULL,
    id_usuario_reportado INT NOT NULL,
    id_publicacion INT NULL,
    motivo TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('pendiente','revisado','resuelto') DEFAULT 'pendiente',
    FOREIGN KEY (id_usuario_reporta) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_usuario_reportado) REFERENCES usuario(id_usuario),
    FOREIGN KEY (id_publicacion) REFERENCES publicacion(id_publicacion)
);

INSERT INTO reporte (id_usuario_reporta, id_usuario_reportado, id_publicacion, motivo, estado)
VALUES
(1, 2, NULL, 'El usuario publicó contenido ofensivo', 'pendiente'),
(2, 1, NULL, 'Comportamiento inapropiado en comentarios', 'pendiente');

delete from reporte where id_reporte = 1;
delete from reporte where id_reporte = 2;

ALTER TABLE reporte AUTO_INCREMENT = 1;

CREATE OR REPLACE VIEW vista_reportes AS
SELECT r.id_reporte, r.id_usuario_reporta, r.id_usuario_reportado,
r.id_publicacion, r.motivo, r.fecha, r.estado
FROM reporte r;

DELIMITER $$
	create procedure sp_vista_reportes()
BEGIN
		SELECT r.id_reporte, r.id_usuario_reporta, r.id_usuario_reportado,
		r.id_publicacion, r.motivo, r.fecha, r.estado
		FROM reporte r;		
END$$
DELIMITER ; 

call sp_vista_reportes();






-- bloqueos

CREATE TABLE bloqueo (
    id_bloqueo INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    fecha_inicio DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME DEFAULT CURRENT_TIMESTAMP,
    motivo TEXT,
    nivel_ban ENUM('leve','medio','grave') DEFAULT 'leve',
    FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
);








