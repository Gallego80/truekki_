let mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const multer = require('multer');
const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 📌 Servir archivos estáticos
app.use(express.static(path.join(__dirname, "vistas")));
app.use(express.static(path.join(__dirname, "css")));
app.use(express.static(path.join(__dirname, "estilos")));

// Configuración de CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

// Configuración de multer para imágenes
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ✅ CONEXIÓN A MYSQL CON RECONEXIÓN AUTOMÁTICA
let conexion;

function handleDisconnect() {
    conexion = mysql.createConnection({
        host: 'localhost',
        database: 'truekki',
        user: 'root',
        password: '',
        connectTimeout: 60000,
        acquireTimeout: 60000,
        timeout: 60000,
        multipleStatements: true
    });

    conexion.connect(function(error) {
        if(error) {
            console.error("❌ Error de conexión:", error);
            console.log("🔄 Reintentando conexión en 2 segundos...");
            setTimeout(handleDisconnect, 2000);
        } else {
            console.log("✅ ¡Conexión exitosa a MySQL!");
        }
    });

    conexion.on('error', function(err) {
        console.error('❌ Error en la base de datos:', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST' || 
           err.code === 'ECONNRESET' ||
           err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
           err.fatal) {
            console.log('🔄 Reconectando a la base de datos...');
            handleDisconnect();
        }
    });
}

// Iniciar conexión
handleDisconnect();

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../')));

// Rutas para páginas HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/vistas/registro.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../vistas/registro.html'));
});

app.get('/vistas/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../vistas/login.html'));
});

// ✅ REGISTRO MODIFICADO - Sin teléfono y dirección obligatorios
app.post('/registro', async (req, res) => {
    const { nombre, email, password, confirmPassword } = req.body;

    const dominiosValidos = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

    function validarDominio(email) {
        const dominio = email.split('@')[1].toLowerCase();
        return dominiosValidos.includes(dominio);
    }

    if (!validarDominio(email)) {
        return res.status(400).json({ success: false, message: 'Dominio de correo no válido' });
    }

    if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, message: 'Nombre, email y contraseña son obligatorios' });
    }

    if (confirmPassword && password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Las contraseñas no coinciden' });
    }

    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    try {
        const checkUserQuery = 'SELECT * FROM usuario WHERE email = ?';
        conexion.query(checkUserQuery, [email], async (error, results) => {
            if (error) {
                console.error("Error verificando usuario:", error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor' });
            }

            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'El email ya está registrado' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const insertUserQuery = 'INSERT INTO usuario (nombre, email, contraseña, numero_telefono, direccion) VALUES (?, ?, ?, NULL, NULL)';
            
            conexion.query(insertUserQuery, [nombre, email, hashedPassword], (error, results) => {
                if (error) {
                    console.error("Error insertando usuario:", error);
                    return res.status(500).json({ success: false, message: 'Error al registrar usuario: ' + error.message });
                }

                console.log("Usuario registrado con ID:", results.insertId);
                res.status(200).json({ success: true, message: 'Usuario registrado exitosamente' });
            });
        });
    } catch (error) {
        console.error("Error en el proceso de registro:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ✅ Ruta para login de usuario
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });
    }

    try {
        const query = 'SELECT * FROM usuario WHERE email = ?';
        conexion.query(query, [email], async (error, results) => {
            if (error) {
                console.error("Error buscando usuario:", error);
                return res.status(500).json({ success: false, message: 'Error interno del servidor' });
            }

            if (results.length === 0) {
                return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
            }

            const usuario = results[0];
            const passwordMatch = await bcrypt.compare(password, usuario.contraseña);
            
            if (!passwordMatch) {
                return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
            }

            if (usuario.estado !== 'activo') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Tu cuenta está ' + (usuario.estado === 'bloqueado' ? 'bloqueada' : 'inactiva') 
                });
            }

            res.status(200).json({ 
                success: true, 
                message: 'Login exitoso',
                usuario: {
                    id: usuario.id_usuario,
                    nombre: usuario.nombre,
                    email: usuario.email
                }
            });
        });
    } catch (error) {
        console.error("Error en el proceso de login:", error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// ✅ RUTAS PARA PRODUCTOS

app.get('/productos', (req, res) => {
    const query = 'SELECT p.*, u.nombre as usuario_nombre FROM productos p JOIN usuario u ON p.id_usuario = u.id_usuario ORDER BY p.fecha_publicacion DESC';
    
    conexion.query(query, (error, results) => {
        if (error) {
            console.error("Error obteniendo productos:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener productos' });
        }
        
        res.status(200).json({ success: true, productos: results });
    });
});

app.post('/publicar-producto', (req, res) => {
    const { titulo, categoria, estado, descripcion, precio, ciudad, barrio, contacto, id_usuario } = req.body;
    
    if (!titulo || !categoria || !estado || !descripcion || !precio || !ciudad || !barrio || !contacto || !id_usuario) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }
    
    if (descripcion.length < 50) {
        return res.status(400).json({ success: false, message: 'La descripción debe tener al menos 50 caracteres' });
    }
    
    const query = 'INSERT INTO productos (titulo, categoria, estado, descripcion, precio, ciudad, barrio, contacto, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)';
    
    conexion.query(query, [titulo, categoria, estado, descripcion, precio, ciudad, barrio, contacto, id_usuario], (error, results) => {
        if (error) {
            console.error("Error insertando producto:", error);
            return res.status(500).json({ success: false, message: 'Error al publicar producto' });
        }
        
        console.log("Producto publicado con ID:", results.insertId);
        res.status(200).json({ success: true, message: 'Producto publicado exitosamente', id: results.insertId });
    });
});

app.post('/subir-imagen-producto/:id', upload.single('foto'), (req, res) => {
    const productId = req.params.id;
    const image = req.file;
    
    if (!image) {
        return res.status(400).json({ success: false, message: 'No se ha subido ninguna imagen' });
    }
    
    const query = 'UPDATE productos SET foto = ?, foto_nombre = ? WHERE id_producto = ?';
    
    conexion.query(query, [image.buffer, image.originalname, productId], (error, results) => {
        if (error) {
            console.error("Error subiendo imagen:", error);
            return res.status(500).json({ success: false, message: 'Error al subir imagen' });
        }
        
        res.status(200).json({ success: true, message: 'Imagen subida exitosamente' });
    });
});

app.get('/imagen-producto/:id', (req, res) => {
    const productId = req.params.id;
    const query = 'SELECT foto, foto_nombre FROM productos WHERE id_producto = ?';
    
    conexion.query(query, [productId], (error, results) => {
        if (error) {
            console.error("Error obteniendo imagen:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener imagen' });
        }
        
        if (results.length === 0 || !results[0].foto) {
            return res.status(404).json({ success: false, message: 'Imagen no encontrada' });
        }
        
        const image = results[0].foto;
        const imageName = results[0].foto_nombre || 'producto.jpg';
        
        res.writeHead(200, {
            'Content-Type': 'image/jpeg',
            'Content-Length': image.length,
            'Content-Disposition': `inline; filename="${imageName}"`
        });
        
        res.end(image);
    });
});

app.get('/productos-usuario/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;
    
    const query = `
        SELECT p.*, 
               (SELECT COUNT(*) FROM intercambio i WHERE i.id_producto1 = p.id_producto OR i.id_producto2 = p.id_producto) as intercambios_realizados
        FROM productos p 
        WHERE p.id_usuario = ? 
        ORDER BY p.fecha_publicacion DESC
    `;
    
    conexion.query(query, [idUsuario], (error, results) => {
        if (error) {
            console.error("Error obteniendo productos del usuario:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener productos' });
        }
        
        res.status(200).json({ success: true, productos: results });
    });
});

app.delete('/producto/:id', (req, res) => {
    const productId = req.params.id;
    
    if (!productId || isNaN(productId)) {
        console.log("❌ ID inválido:", productId);
        return res.status(400).json({ success: false, message: 'ID de producto inválido' });
    }

    const checkQuery = 'SELECT * FROM productos WHERE id_producto = ?';
    
    conexion.query(checkQuery, [productId], (error, results) => {
        if (error) {
            console.error("❌ Error en consulta de verificación:", error);
            return res.status(500).json({ success: false, message: 'Error al verificar producto' });
        }
        
        if (results.length === 0) {
            console.log("❌ Producto no encontrado ID:", productId);
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }
        
        const deleteQuery = 'DELETE FROM productos WHERE id_producto = ?';
        
        conexion.query(deleteQuery, [productId], (error, results) => {
            if (error) {
                console.error("❌ Error eliminando producto:", error);
                return res.status(500).json({ success: false, message: 'Error al eliminar producto: ' + error.message });
            }
            
            console.log("✅ Producto eliminado exitosamente ID:", productId);
            res.status(200).json({ 
                success: true, 
                message: 'Producto eliminado exitosamente',
                deletedId: productId
            });
        });
    });
});

app.get('/producto/:id', (req, res) => {
    const productId = req.params.id;
    
    const query = `
        SELECT p.*, u.nombre as vendedor_nombre, u.numero_telefono, u.email 
        FROM productos p 
        JOIN usuario u ON p.id_usuario = u.id_usuario 
        WHERE p.id_producto = ?
    `;
    
    conexion.query(query, [productId], (error, results) => {
        if (error) {
            console.error("Error obteniendo producto:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener producto' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }
        
        const producto = results[0];
        const vendedor = {
            id: producto.id_usuario,
            nombre: producto.vendedor_nombre,
            telefono: producto.numero_telefono,
            email: producto.email
        };
        
        delete producto.vendedor_nombre;
        delete producto.numero_telefono;
        delete producto.email;
        
        res.status(200).json({ 
            success: true, 
            producto: producto,
            vendedor: vendedor
        });
    });
});

app.put('/producto/:id', upload.single('foto'), (req, res) => {
    const idProducto = req.params.id;
    const { titulo, descripcion, precio, categoria, estado, ciudad, barrio, contacto } = req.body;
    const foto = req.file;

    if (!titulo || !descripcion || !precio || !categoria || !estado || !ciudad || !barrio || !contacto) {
        return res.status(400).json({ success: false, message: 'Datos obligatorios incompletos' });
    }

    let query = `
        UPDATE productos 
        SET titulo = ?, descripcion = ?, precio = ?, categoria = ?, estado = ?, ciudad = ?, barrio = ?, contacto = ?
        WHERE id_producto = ?
    `;
    let values = [titulo, descripcion, precio, categoria, estado, ciudad, barrio, contacto, idProducto];

    if (foto) {
        query = `
            UPDATE productos 
            SET titulo = ?, descripcion = ?, precio = ?, categoria = ?, estado = ?, ciudad = ?, barrio = ?, contacto = ?, foto = ?, foto_nombre = ?
            WHERE id_producto = ?
        `;
        values = [titulo, descripcion, precio, categoria, estado, ciudad, barrio, contacto, foto.buffer, foto.originalname, idProducto];
    }

    conexion.query(query, values, (error, results) => {
        if (error) {
            console.error("Error al actualizar producto:", error);
            return res.status(500).json({ success: false, message: 'Error al actualizar el producto' });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }
        res.status(200).json({ success: true, message: 'Producto actualizado correctamente' });
    });
});

app.put('/marcar-vendido/:id', (req, res) => {
    const { id } = req.params;
    const { disponible } = req.body;

    if (typeof disponible !== 'boolean') {
        return res.status(400).json({ success: false, message: 'El campo disponible debe ser true o false' });
    }

    const query = 'UPDATE productos SET disponible = ? WHERE id_producto = ?';

    conexion.query(query, [disponible, id], (error, results) => {
        if (error) {
            console.error("Error actualizando producto:", error);
            return res.status(500).json({ success: false, message: 'Error al actualizar producto' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        res.status(200).json({ success: true, message: 'Estado del producto actualizado' });
    });
});

// ✅ RUTAS PARA USUARIOS

app.get('/usuario/:id', (req, res) => {
    const userId = req.params.id;
    
    const query = 'SELECT id_usuario, nombre, email, numero_telefono, direccion, fecha_registro, verificado, estado FROM usuario WHERE id_usuario = ?';
    
    conexion.query(query, [userId], (error, results) => {
        if (error) {
            console.error("Error obteniendo usuario:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener información del usuario' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        res.status(200).json({ success: true, usuario: results[0] });
    });
});

app.put('/usuario/:id', (req, res) => {
    const userId = req.params.id;
    const { nombre, numero_telefono, direccion, bio } = req.body;
    
    const query = 'UPDATE usuario SET nombre = ?, numero_telefono = ?, direccion = ?, bio = ? WHERE id_usuario = ?';
    
    conexion.query(query, [nombre, numero_telefono, direccion, bio, userId], (error, results) => {
        if (error) {
            console.error("Error actualizando usuario:", error);
            return res.status(500).json({ success: false, message: 'Error al actualizar información del usuario' });
        }
        
        res.status(200).json({ success: true, message: 'Información actualizada correctamente' });
    });
});

// ✅ RUTAS PARA FAVORITOS

app.post('/favoritos/agregar', (req, res) => {
    const { id_usuario, id_producto } = req.body;
    
    if (!id_usuario || !id_producto) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }
    
    const checkProductQuery = 'SELECT * FROM productos WHERE id_producto = ?';
    conexion.query(checkProductQuery, [id_producto], (error, results) => {
        if (error) {
            console.error("❌ Error verificando producto:", error);
            return res.status(500).json({ success: false, message: 'Error al verificar producto' });
        }
        
        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }
        
        const checkFavoriteQuery = 'SELECT * FROM favoritos WHERE id_usuario = ? AND id_producto = ?';
        conexion.query(checkFavoriteQuery, [id_usuario, id_producto], (error, results) => {
            if (error) {
                console.error("❌ Error verificando favorito:", error);
                return res.status(500).json({ success: false, message: 'Error al verificar favorito' });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ success: false, message: 'El producto ya está en favoritos' });
            }
            
            const insertQuery = 'INSERT INTO favoritos (id_usuario, id_producto) VALUES (?, ?)';
            conexion.query(insertQuery, [id_usuario, id_producto], (error, results) => {
                if (error) {
                    console.error("❌ Error agregando a favoritos:", error);
                    return res.status(500).json({ success: false, message: 'Error al agregar a favoritos' });
                }
                
                res.status(200).json({ 
                    success: true, 
                    message: 'Producto agregado a favoritos',
                    id_favorito: results.insertId
                });
            });
        });
    });
});

app.post('/favoritos/eliminar', (req, res) => {
    const { id_usuario, id_producto } = req.body;
    
    if (!id_usuario || !id_producto) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }
    
    const deleteQuery = 'DELETE FROM favoritos WHERE id_usuario = ? AND id_producto = ?';
    conexion.query(deleteQuery, [id_usuario, id_producto], (error, results) => {
        if (error) {
            console.error("❌ Error eliminando de favoritos:", error);
            return res.status(500).json({ success: false, message: 'Error al eliminar de favoritos' });
        }
        
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado en favoritos' });
        }
        
        res.status(200).json({ 
            success: true, 
            message: 'Producto eliminado de favoritos'
        });
    });
});

app.get('/favoritos/usuario/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;
    
    const query = `
        SELECT p.*, u.nombre as usuario_nombre, f.fecha_agregado 
        FROM favoritos f 
        JOIN productos p ON f.id_producto = p.id_producto 
        JOIN usuario u ON p.id_usuario = u.id_usuario 
        WHERE f.id_usuario = ? 
        ORDER BY f.fecha_agregado DESC
    `;
    
    conexion.query(query, [idUsuario], (error, results) => {
        if (error) {
            console.error("❌ Error obteniendo favoritos:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener favoritos' });
        }
        
        res.status(200).json({ 
            success: true, 
            favoritos: results 
        });
    });
});

app.get('/favoritos/verificar/:idUsuario/:idProducto', (req, res) => {
    const { idUsuario, idProducto } = req.params;
    
    const query = 'SELECT * FROM favoritos WHERE id_usuario = ? AND id_producto = ?';
    conexion.query(query, [idUsuario, idProducto], (error, results) => {
        if (error) {
            console.error("❌ Error verificando favorito:", error);
            return res.status(500).json({ success: false, message: 'Error al verificar favorito' });
        }
        
        res.status(200).json({ 
            success: true, 
            esFavorito: results.length > 0 
        });
    });
});

// ✅ RUTAS PARA EL CHAT

app.get('/chat/conversaciones/:idUsuario', (req, res) => {
    const idUsuario = parseInt(req.params.idUsuario);
    
    if (!idUsuario || isNaN(idUsuario)) {
        return res.status(400).json({ success: false, message: 'ID de usuario inválido' });
    }

    const query = `
        SELECT 
            c.*,
            CASE 
                WHEN c.id_usuario1 = ? THEN u2.id_usuario
                ELSE u1.id_usuario
            END as otro_usuario_id,
            CASE 
                WHEN c.id_usuario1 = ? THEN u2.nombre
                ELSE u1.nombre
            END as otro_usuario_nombre,
            CASE 
                WHEN c.id_usuario1 = ? THEN u2.email
                ELSE u1.email
            END as otro_usuario_email,
            (SELECT COUNT(*) FROM mensajes m WHERE m.id_conversacion = c.id_conversacion AND m.id_remitente != ? AND m.leido = FALSE) as mensajes_no_leidos,
            (SELECT m.mensaje FROM mensajes m WHERE m.id_conversacion = c.id_conversacion ORDER BY m.fecha_envio DESC LIMIT 1) as ultimo_mensaje,
            (SELECT m.fecha_envio FROM mensajes m WHERE m.id_conversacion = c.id_conversacion ORDER BY m.fecha_envio DESC LIMIT 1) as fecha_ultimo_mensaje
        FROM conversaciones c
        JOIN usuario u1 ON c.id_usuario1 = u1.id_usuario
        JOIN usuario u2 ON c.id_usuario2 = u2.id_usuario
        WHERE c.id_usuario1 = ? OR c.id_usuario2 = ?
        ORDER BY c.fecha_ultimo_mensaje DESC
    `;
    
    conexion.query(query, [idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario], (error, results) => {
        if (error) {
            console.error("❌ Error obteniendo conversaciones:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener conversaciones: ' + error.message });
        }
        
        res.status(200).json({ 
            success: true, 
            conversaciones: results 
        });
    });
});

app.post('/chat/conversacion', (req, res) => {
    const { id_usuario1, id_usuario2 } = req.body;
    
    if (!id_usuario1 || !id_usuario2) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }
    
    const [minId, maxId] = [Math.min(id_usuario1, id_usuario2), Math.max(id_usuario1, id_usuario2)];
    
    const query = `
        SELECT c.*, 
               u1.nombre as usuario1_nombre,
               u2.nombre as usuario2_nombre
        FROM conversaciones c
        JOIN usuario u1 ON c.id_usuario1 = u1.id_usuario
        JOIN usuario u2 ON c.id_usuario2 = u2.id_usuario
        WHERE c.id_usuario1 = ? AND c.id_usuario2 = ?
    `;
    
    conexion.query(query, [minId, maxId], (error, results) => {
        if (error) {
            console.error("❌ Error buscando conversación:", error);
            return res.status(500).json({ success: false, message: 'Error al buscar conversación' });
        }
        
        if (results.length > 0) {
            return res.status(200).json({ 
                success: true, 
                conversacion: results[0],
                existe: true
            });
        }
        
        const insertQuery = 'INSERT INTO conversaciones (id_usuario1, id_usuario2) VALUES (?, ?)';
        conexion.query(insertQuery, [minId, maxId], (error, results) => {
            if (error) {
                console.error("❌ Error creando conversación:", error);
                return res.status(500).json({ success: false, message: 'Error al crear conversación' });
            }
            
            const getQuery = `
                SELECT c.*, 
                       u1.nombre as usuario1_nombre,
                       u2.nombre as usuario2_nombre
                FROM conversaciones c
                JOIN usuario u1 ON c.id_usuario1 = u1.id_usuario
                JOIN usuario u2 ON c.id_usuario2 = u2.id_usuario
                WHERE c.id_conversacion = ?
            `;
            
            conexion.query(getQuery, [results.insertId], (error, conversacionResults) => {
                if (error) {
                    console.error("❌ Error obteniendo conversación creada:", error);
                    return res.status(500).json({ success: false, message: 'Error al obtener conversación' });
                }
                
                res.status(200).json({ 
                    success: true, 
                    conversacion: conversacionResults[0],
                    existe: false
                });
            });
        });
    });
});

app.post('/chat/mensaje', (req, res) => {
    const { id_conversacion, id_remitente, mensaje } = req.body;
    
    if (!id_conversacion || !id_remitente || !mensaje) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }
    
    const insertQuery = 'INSERT INTO mensajes (id_conversacion, id_remitente, mensaje) VALUES (?, ?, ?)';
    conexion.query(insertQuery, [id_conversacion, id_remitente, mensaje], (error, results) => {
        if (error) {
            console.error("❌ Error enviando mensaje:", error);
            return res.status(500).json({ success: false, message: 'Error al enviar mensaje: ' + error.message });
        }
        
        // Actualizar fecha del último mensaje en la conversación
        const updateQuery = 'UPDATE conversaciones SET fecha_ultimo_mensaje = CURRENT_TIMESTAMP WHERE id_conversacion = ?';
        conexion.query(updateQuery, [id_conversacion], (error, updateResults) => {
            if (error) {
                console.error("❌ Error actualizando conversación:", error);
            }
            
            console.log("✅ Mensaje enviado ID:", results.insertId);
            
            // Obtener el mensaje recién creado con información del remitente
            const getMessageQuery = `
                SELECT m.*, u.nombre as remitente_nombre 
                FROM mensajes m 
                JOIN usuario u ON m.id_remitente = u.id_usuario 
                WHERE m.id_mensaje = ?
            `;
            
            conexion.query(getMessageQuery, [results.insertId], (error, messageResults) => {
                if (error) {
                    console.error("❌ Error obteniendo mensaje:", error);
                    return res.status(500).json({ success: false, message: 'Error al obtener mensaje' });
                }
                
                res.status(200).json({ 
                    success: true, 
                    mensaje: messageResults[0]
                });
            });
        });
    });
});

// Obtener mensajes de una conversación - VERSIÓN CORREGIDA
app.get('/chat/mensajes/:idConversacion', (req, res) => {
    const idConversacion = parseInt(req.params.idConversacion);
    
    console.log("📍 Obteniendo mensajes de conversación:", idConversacion);
    
    if (!idConversacion || isNaN(idConversacion)) {
        return res.status(400).json({ success: false, message: 'ID de conversación inválido' });
    }

    const query = `
        SELECT m.*, u.nombre as remitente_nombre
        FROM mensajes m
        JOIN usuario u ON m.id_remitente = u.id_usuario
        WHERE m.id_conversacion = ?
        ORDER BY m.fecha_envio ASC
    `;
    
    conexion.query(query, [idConversacion], (error, results) => {
        if (error) {
            console.error("❌ Error obteniendo mensajes:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener mensajes: ' + error.message });
        }
        
        console.log("✅ Mensajes encontrados:", results.length);
        res.status(200).json({ 
            success: true, 
            mensajes: results 
        });
    });
});

// Marcar mensajes como leídos - VERSIÓN CORREGIDA
app.post('/chat/mensajes/leer', (req, res) => {
    const { id_conversacion, id_usuario } = req.body;
    
    console.log("📍 Marcando mensajes como leídos - Conversación:", id_conversacion, "Usuario:", id_usuario);
    
    if (!id_conversacion || !id_usuario) {
        return res.status(400).json({ success: false, message: 'Datos incompletos' });
    }

    const query = 'UPDATE mensajes SET leido = TRUE WHERE id_conversacion = ? AND id_remitente != ? AND leido = FALSE';
    
    conexion.query(query, [id_conversacion, id_usuario], (error, results) => {
        if (error) {
            console.error("❌ Error marcando mensajes como leídos:", error);
            return res.status(500).json({ success: false, message: 'Error al marcar mensajes como leídos: ' + error.message });
        }
        
        console.log("✅ Mensajes marcados como leídos:", results.affectedRows);
        res.status(200).json({ 
            success: true, 
            mensajes_actualizados: results.affectedRows 
        });
    });
});

// Ruta para buscar usuarios (para iniciar nuevos chats)
app.get('/chat/usuarios', (req, res) => {
    const searchTerm = req.query.search || '';
    
    console.log("📍 Buscando usuarios:", searchTerm);
    
    let query = `
        SELECT id_usuario, nombre, email, fecha_registro
        FROM usuario 
        WHERE estado = 'activo'
    `;
    
    const params = [];
    
    if (searchTerm) {
        query += ' AND (nombre LIKE ? OR email LIKE ?)';
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
    }
    
    query += ' ORDER BY nombre LIMIT 20';
    
    conexion.query(query, params, (error, results) => {
        if (error) {
            console.error("❌ Error buscando usuarios:", error);
            return res.status(500).json({ success: false, message: 'Error al buscar usuarios' });
        }
        
        console.log("✅ Usuarios encontrados:", results.length);
        res.status(200).json({ 
            success: true, 
            usuarios: results 
        });
    });
});


/// ✅ ENDPOINT MEJORADO PARA OBTENER CALIFICACIONES DE UN PRODUCTO
app.get('/calificaciones/producto/:idProducto', (req, res) => {
    const { idProducto } = req.params;
    const idUsuario = req.query.idUsuario; // Opcional: ID del usuario actual
    
    console.log('📊 Obteniendo calificaciones para producto:', idProducto, 'Usuario:', idUsuario);
    
    // 1. Calcular promedio y total de calificaciones
    const promedioQuery = `
        SELECT 
            AVG(calificacion) as promedio, 
            COUNT(*) as total 
        FROM calificaciones_producto 
        WHERE id_producto = ?
    `;
    
    conexion.query(promedioQuery, [idProducto], (error, promedioResult) => {
        if (error) {
            console.error('❌ Error en consulta de promedio:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al obtener calificaciones' 
            });
        }
        
        // 2. Obtener distribución por estrellas
        const distribucionQuery = `
            SELECT 
                calificacion, 
                COUNT(*) as cantidad 
            FROM calificaciones_producto 
            WHERE id_producto = ? 
            GROUP BY calificacion 
            ORDER BY calificacion
        `;
        
        conexion.query(distribucionQuery, [idProducto], (error, distribucionResult) => {
            if (error) {
                console.error('❌ Error en consulta de distribución:', error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al obtener distribución' 
                });
            }
            
            // 3. Formatear distribución (llenar con 0s las estrellas sin calificaciones)
            const distribucion = [0, 0, 0, 0, 0];
            distribucionResult.forEach(item => {
                distribucion[item.calificacion - 1] = item.cantidad;
            });
            
            // 4. Verificar si el usuario actual ya calificó
            let usuarioCalifico = false;
            let calificacionUsuario = 0;
            
            if (idUsuario) {
                const usuarioQuery = 'SELECT calificacion FROM calificaciones_producto WHERE id_producto = ? AND id_usuario = ?';
                conexion.query(usuarioQuery, [idProducto, idUsuario], (error, usuarioResult) => {
                    if (!error && usuarioResult.length > 0) {
                        usuarioCalifico = true;
                        calificacionUsuario = usuarioResult[0].calificacion;
                    }
                    
                    const responseData = {
                        promedios: {
                            promedio: parseFloat(promedioResult[0]?.promedio) || 0,
                            total: promedioResult[0]?.total || 0
                        },
                        distribucion: distribucion,
                        usuarioCalifico: usuarioCalifico,
                        calificacionUsuario: calificacionUsuario
                    };
                    
                    console.log('📈 Datos de calificaciones enviados:', responseData);
                    
                    res.json({
                        success: true,
                        data: responseData
                    });
                });
            } else {
                const responseData = {
                    promedios: {
                        promedio: parseFloat(promedioResult[0]?.promedio) || 0,
                        total: promedioResult[0]?.total || 0
                    },
                    distribucion: distribucion,
                    usuarioCalifico: false,
                    calificacionUsuario: 0
                };
                
                console.log('📈 Datos de calificaciones enviados:', responseData);
                
                res.json({
                    success: true,
                    data: responseData
                });
            }
        });
    });
});

// ✅ ENDPOINT PARA GUARDAR CALIFICACIÓN - AGREGAR ESTO A TU conexion.js
app.post('/calificaciones/calificar', (req, res) => {
    const { id_producto, id_usuario, calificacion } = req.body;
    
    console.log('⭐ Guardando calificación:', { id_producto, id_usuario, calificacion });
    
    // Validaciones
    if (!id_producto || !id_usuario || !calificacion) {
        return res.status(400).json({ 
            success: false, 
            message: 'Faltan campos requeridos' 
        });
    }
    
    if (calificacion < 1 || calificacion > 5) {
        return res.status(400).json({ 
            success: false, 
            message: 'La calificación debe estar entre 1 y 5' 
        });
    }
    
    // Verificar si ya existe una calificación
    const checkQuery = 'SELECT * FROM calificaciones_producto WHERE id_producto = ? AND id_usuario = ?';
    conexion.query(checkQuery, [id_producto, id_usuario], (error, existingRating) => {
        if (error) {
            console.error('❌ Error verificando calificación existente:', error);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al verificar calificación' 
            });
        }
        
        if (existingRating.length > 0) {
            // Actualizar calificación existente
            const updateQuery = 'UPDATE calificaciones_producto SET calificacion = ? WHERE id_producto = ? AND id_usuario = ?';
            conexion.query(updateQuery, [calificacion, id_producto, id_usuario], (error, result) => {
                if (error) {
                    console.error('❌ Error actualizando calificación:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Error al actualizar calificación' 
                    });
                }
                
                console.log('✅ Calificación actualizada');
                res.json({ 
                    success: true, 
                    message: 'Calificación actualizada correctamente'
                });
            });
        } else {
            // Insertar nueva calificación
            const insertQuery = `
                INSERT INTO calificaciones_producto (id_producto, id_usuario, calificacion) 
                VALUES (?, ?, ?)
            `;
            
            conexion.query(insertQuery, [id_producto, id_usuario, calificacion], (error, result) => {
                if (error) {
                    console.error('❌ Error insertando calificación:', error);
                    return res.status(500).json({ 
                        success: false, 
                        message: 'Error al guardar calificación' 
                    });
                }
                
                console.log('✅ Calificación guardada ID:', result.insertId);
                res.json({ 
                    success: true, 
                    message: 'Calificación guardada correctamente',
                    id_calificacion: result.insertId
                });
            });
        }
    });
});

// ✅ Actualizar producto
app.put('/producto/:id', upload.single('foto'), (req, res) => {
    console.log("Datos recibidos para actualización:", req.body);
    const idProducto = req.params.id;
    const { titulo, descripcion, precio, categoria, estado, ciudad, barrio, contacto } = req.body;
    const foto = req.file;

    console.log("EDIT PRODUCTO llamado. id:", idProducto);
    console.log("req.body:", req.body);
    console.log("req.file:", req.file);

    if (!titulo || !descripcion || !precio || !categoria || !estado || !ciudad || !barrio || !contacto) {
      return res.status(400).json({ success: false, message: 'Datos obligatorios incompletos' });
    }

    let query = `
      UPDATE productos 
      SET titulo = ?, descripcion = ?, precio = ?, categoria = ?, estado = ?, ciudad = ?, barrio = ?, contacto = ?
      WHERE id_producto = ?
    `;
    let values = [titulo, descripcion, precio, categoria, estado, ciudad, barrio, contacto, idProducto];

    if (foto) {
      console.log("Hay foto, se incluirá en la actualización");
      query = `
        UPDATE productos 
        SET titulo = ?, descripcion = ?, precio = ?, categoria = ?, estado = ?, ciudad = ?, barrio = ?, contacto = ?, foto = ?, foto_nombre = ?
        WHERE id_producto = ?
      `;
      values = [titulo, descripcion, precio, categoria, estado, ciudad, barrio, contacto, foto.buffer, foto.originalname, idProducto];
    }

    console.log("SQL a ejecutar:", query);
    console.log("Valores:", values);

    conexion.query(query, values, (error, results) => {
      if (error) {
        console.error("Error al actualizar producto:", error);
        return res.status(500).json({ success: false, message: 'Error al actualizar el producto' });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'Producto no encontrado' });
      }
      res.status(200).json({ success: true, message: 'Producto actualizado correctamente' });
    });
});


// ✅ Marcar producto como vendido
app.put('/marcar-vendido/:id', (req, res) => {
    const { id } = req.params;
    const { disponible } = req.body;
    console.log("Entrando a marcar-vendido:", id);
    console.log("req.body.disponible tipo:", typeof disponible, "valor:", disponible);


    if (typeof disponible !== 'boolean') {
        return res.status(400).json({ success: false, message: 'El campo disponible debe ser true o false' });
    }

    const query = 'UPDATE productos SET disponible = ? WHERE id_producto = ?';

    conexion.query(query, [disponible, id], (error, results) => {
        if (error) {
            console.error("Error actualizando producto:", error);
            return res.status(500).json({ success: false, message: 'Error al actualizar producto' });
        }

        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Producto no encontrado' });
        }

        res.status(200).json({ success: true, message: 'Estado del producto actualizado' });
    });
});

// ✅ RUTA CREAR SUBASTA - VERSIÓN CORREGIDA
app.post("/crear-subasta", upload.single("foto"), async (req, res) => {
    try {
        console.log("📍 Creando subasta...");
        console.log("Datos recibidos:", req.body);
        console.log("Archivo recibido:", req.file);

        const { titulo, descripcion, precio_inicial, id_usuario, duracion_horas } = req.body;
        const foto = req.file;

        // Validaciones
        if (!titulo || !descripcion || !precio_inicial || !id_usuario) {
            return res.status(400).json({ 
                success: false, 
                message: 'Faltan campos obligatorios' 
            });
        }

        if (!foto) {
            return res.status(400).json({ 
                success: false, 
                message: 'Debes subir una imagen' 
            });
        }

        // Calcular fecha de fin
        const duracion = duracion_horas || 24; // Por defecto 24 horas
        const fechaFin = new Date();
        fechaFin.setHours(fechaFin.getHours() + parseInt(duracion));

        // ⭐ Insertar subasta con foto
        const query = `
            INSERT INTO subastas 
            (titulo, descripcion, precio_inicial, precio_actual, id_usuario, fecha_fin, foto, foto_nombre, estado) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'activa')
        `;

        const params = [
            titulo, 
            descripcion, 
            precio_inicial, 
            precio_inicial, // precio_actual inicia igual al inicial
            id_usuario, 
            fechaFin,
            foto.buffer, 
            foto.originalname
        ];

        conexion.query(query, params, (error, results) => {
            if (error) {
                console.error("❌ Error insertando subasta:", error);
                return res.status(500).json({ 
                    success: false, 
                    message: 'Error al crear subasta: ' + error.message 
                });
            }

            console.log("✅ Subasta creada con ID:", results.insertId);
            res.status(200).json({ 
                success: true, 
                message: 'Subasta creada exitosamente',
                id_subasta: results.insertId
            });
        });

    } catch (error) {
        console.error("❌ Error en crear-subasta:", error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor: ' + error.message 
        });
    }
});


app.get('/subastas', (req, res) => {
    const query = `
        SELECT s.*, u.nombre AS vendedor 
        FROM subastas s
        JOIN usuario u ON s.id_usuario = u.id_usuario
        WHERE s.estado = 'activa'
        ORDER BY s.fecha_inicio DESC
    `;

    conexion.query(query, (error, results) => {
        if (error) {
            console.error("❌ Error obteniendo subastas:", error);
            return res.status(500).json({ success: false, message: "Error al obtener subastas" });
        }

        res.status(200).json({ success: true, subastas: results });
    });
});

app.get('/subastas/:id', (req, res) => {
    const id = req.params.id;

    const query = `
        SELECT s.*, u.nombre AS vendedor 
        FROM subastas s
        JOIN usuario u ON s.id_usuario = u.id_usuario
        WHERE id_subasta = ?
    `;

    conexion.query(query, [id], (error, results) => {
        if (error) {
            console.error("❌ Error obteniendo subasta:", error);
            return res.status(500).json({ success: false, message: "Error al obtener subasta" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Subasta no encontrada" });
        }

        res.status(200).json({ success: true, subasta: results[0] });
    });
});

app.post('/subastas/pujar', (req, res) => {
    const { id_subasta, id_usuario, monto } = req.body;

    if (!id_subasta || !id_usuario || !monto) {
        return res.status(400).json({ success: false, message: "Datos incompletos" });
    }

    const checkQuery = "SELECT * FROM subastas WHERE id_subasta = ? AND estado = 'activa'";
    
    conexion.query(checkQuery, [id_subasta], (error, results) => {
        if (error) {
            console.error("❌ Error verificando subasta:", error);
            return res.status(500).json({ success: false });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Subasta no activa" });
        }

        const subasta = results[0];

        if (monto <= subasta.precio_actual) {
            return res.status(400).json({ success: false, message: "La puja debe ser mayor al precio actual" });
        }

        // Registrar puja
        const pujaQuery = "INSERT INTO pujas (id_subasta, id_usuario, monto) VALUES (?, ?, ?)";

        conexion.query(pujaQuery, [id_subasta, id_usuario, monto], (error) => {
            if (error) {
                console.error("❌ Error registrando puja:", error);
                return res.status(500).json({ success: false });
            }

            // Actualizar precio actual
            const updateQuery = "UPDATE subastas SET precio_actual = ? WHERE id_subasta = ?";

            conexion.query(updateQuery, [monto, id_subasta], () => {
                res.status(200).json({ success: true, message: "Puja realizada con éxito" });
            });
        });
    });
});

app.get('/subastas/imagen/:id', (req, res) => {
    const id = req.params.id;

    const query = "SELECT foto, foto_nombre FROM subastas WHERE id_subasta = ?";

    conexion.query(query, [id], (error, results) => {
        if (error || results.length === 0 || !results[0].foto) {
            return res.status(404).json({ success: false, message: "Imagen no encontrada" });
        }

        res.writeHead(200, {
            "Content-Type": "image/jpeg",
            "Content-Length": results[0].foto.length
        });

        res.end(results[0].foto);
    });
});

setInterval(() => {
    const query = `
        UPDATE subastas 
        SET estado = 'finalizada'
        WHERE fecha_fin < NOW() AND estado = 'activa'
    `;
    conexion.query(query);
}, 60000);


// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
    console.log(`Registro: http://localhost:${port}/vistas/registro.html`);
    console.log(`Login: http://localhost:${port}/vistas/login.html`);
});

