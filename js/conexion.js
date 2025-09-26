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

// Conexión a MySQL
let conexion = mysql.createConnection({
    host: 'localhost',
    database: 'truekki',
    user: 'root',
    password: ''
});

conexion.connect(function(error){
    if(error){
        console.error("Error de conexión:", error);
    }else{
        console.log("¡Conexión exitosa!");
    }
});

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

    // Validación de email
    if (!validarDominio(email)) {
        return res.status(400).json({ success: false, message: 'Dominio de correo no válido' });
    }

    // ✅ VALIDACIÓN CORREGIDA - Solo campos esenciales
    if (!nombre || !email || !password) {
        return res.status(400).json({ success: false, message: 'Nombre, email y contraseña son obligatorios' });
    }

    // Validar confirmación de contraseña si está presente
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
            
            // ✅ INSERT modificado - teléfono y dirección como NULL por defecto
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

    // Validaciones básicas
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email y contraseña son obligatorios' });
    }

    try {
        // Buscar usuario por email
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

            // Verificar contraseña
            const passwordMatch = await bcrypt.compare(password, usuario.contraseña);
            
            if (!passwordMatch) {
                return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
            }

            // Verificar si el usuario está activo
            if (usuario.estado !== 'activo') {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Tu cuenta está ' + (usuario.estado === 'bloqueado' ? 'bloqueada' : 'inactiva') 
                });
            }

            // Login exitoso
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

// ✅ NUEVAS RUTAS PARA PRODUCTOS

// Obtener todos los productos
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

// Publicar nuevo producto (sin imagen)
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

// Subir imagen de producto
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

// Obtener imagen de producto
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

// ✅ Obtener productos de un usuario con conteo de intercambios
app.get('/productos-usuario/:idUsuario', (req, res) => {
    const idUsuario = req.params.idUsuario;

    console.log("🔎 Buscando productos del usuario:", idUsuario);

    const query = `
        SELECT p.*, 
               (
                   SELECT COUNT(*) 
                   FROM intercambio_detalle d
                   JOIN intercambio i ON d.id_intercambio = i.id_intercambio
                   WHERE d.id_producto = p.id_producto
               ) AS intercambios_realizados
        FROM productos p
        WHERE p.id_usuario = ?
        ORDER BY p.fecha_publicacion DESC
    `;

    conexion.query(query, [idUsuario], (error, results) => {
        if (error) {
            console.error("❌ Error obteniendo productos del usuario:", error);
            return res.status(500).json({ success: false, message: 'Error al obtener productos' });
        }

        res.status(200).json({ success: true, productos: results });
    });
});

// ✅ Ruta para actualizar información del usuario
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

// ✅ Ruta para obtener un producto específico con información del vendedor
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

// ✅ Ruta para eliminar producto - VERSIÓN CORREGIDA
app.delete('/producto/:id', (req, res) => {
    const productId = req.params.id;
    
    if (!productId || isNaN(productId)) {
        console.log("❌ ID inválido:", productId);
        return res.status(400).json({ success: false, message: 'ID de producto inválido' });
    }

    // Primero verificamos que el producto exista
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
        
        // Eliminar el producto
        const deleteQuery = 'DELETE FROM productos WHERE id_producto = ?';
        
        conexion.query(deleteQuery, [productId], (error, results) => {
            if (error) {
                console.error("❌ Error eliminando producto:", error);
                return res.status(500).json({ success: false, message: 'Error al eliminar producto: ' + error.message });
            }
            
            console.log(" Producto eliminado exitosamente ID:", productId);
            res.status(200).json({ 
                success: true, 
                message: 'Producto eliminado exitosamente',
                deletedId: productId
            });
        });
    });
});


// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
    console.log(`Registro: http://localhost:${port}/vistas/registro.html`);
    console.log(`Login: http://localhost:${port}/vistas/login.html`);
});
