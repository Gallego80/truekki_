from flask import Blueprint, request, redirect, render_template, url_for #importar librerias
import mysql.connector
import bcrypt
import re

registro_bp = Blueprint("registro", __name__) #definir ruta para el app.py
validacion = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$") #control de email basico


@registro_bp.route("/registro", methods=["GET", "POST"])#definir la ruta del registro
def registro():
    if request.method == "GET":
        return render_template("registro.html")
    
    nombre = request.form.get("nombre")
    email = request.form.get("email")
    password = request.form.get("password")
    confirm = request.form.get("confirmPassword") #capturacion de datos
    telefono = request.form.get("telefono")
    direccion = request.form.get("direccion")

    # Validaciones
    if password != confirm:
        return render_template("registro.html", error="❌ Las contraseñas no coinciden")   #validacion de contraseñas

    if not validacion.match(email):
        return render_template("registro.html", error="❌ El correo electrónico no es válido") #validacion de email

    try:
        # hashear la contraseña 
        hashed_password = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

        # Conexión a la base de datos
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="truekki",
            port=3306
        )
        cursor = conn.cursor("SELECT * FROM usuario") #obtencion de los datos de la tabla usuario

        # Insertar en la tabla
        cursor.execute(
            "INSERT INTO usuario (nombre, email, contraseña, numero_telefono, direccion) VALUES (%s, %s, %s, %s, %s)",
            (nombre, email, hashed_password, telefono, direccion)
        )
        conn.commit() #confirmar cambios y que queden guardados permanentemente en la base de datos
        cursor.close() #cerrar el cursor
        conn.close() #cerrar la conexion cuando se ejecute la accion

        print("✅ Usuario registrado con éxito")

        return redirect(url_for("menu"))  # Redirigir al login después de registrarse

    except mysql.connector.Error as err:
        print("⚠️ Error en MySQL:", err)
        return render_template("registro.html", error="❌ Error en el servidor") #imprimir los errores