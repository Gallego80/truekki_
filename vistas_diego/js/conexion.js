let mysql = require('mysql');
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

let conexion = mysql.createConnection({
    host: 'localhost',
    database: 'truekki',
    user: 'root',
    password: ''
});

conexion.connect(function(error){
    if(error){
        console.error("Error de conexión:", error);
    } else {
        console.log("¡Conexión exitosa!");
    }
});

app.use(express.static(path.join(__dirname, '../')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/vistas/registro.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../vistas/registro.html'));
});

app.get('/vistas/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../vistas/login.html'));
});

app.post('/registro', async (req, res) => {
    const { nombre, email, password, confirmPassword, telefono, direccion } = req.body;

    const dominiosValidos = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];

    function validarDominio(email) {
        const dominio = email.split('@')[1].toLowerCase();
        return dominiosValidos.includes(dominio);
    }   


    if (!validarDominio(email)) {
        return res.status(400).json({ success: false, message: 'Dominio de correo no válido' });
    }


    if (!nombre || !email || !password || !confirmPassword || !telefono || !direccion) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios' });
    }

    if (password !== confirmPassword) {
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

            const insertUserQuery = 'INSERT INTO usuario (nombre, email, contraseña, numero_telefono, direccion) VALUES (?, ?, ?, ?, ?)';
            conexion.query(insertUserQuery, [nombre, email, hashedPassword, telefono, direccion], (error, results) => {
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

app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
    console.log(`Registro: http://localhost:${port}/vistas/registro.html`);
    console.log(`Login: http://localhost:${port}/vistas/login.html`);
});
