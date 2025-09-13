from flask import Blueprint, request, redirect, render_template, session, url_for #importar librerias
import mysql.connector
import bcrypt

login_bp = Blueprint("login", __name__) #enrutar el login al app

@login_bp.route("/login", methods=["GET", "POST"]) #definir la ruta 
def login():
    if request.method == "GET":
        return render_template("login.html")

    email = request.form.get("email")
    password = request.form.get("password") #capturar el email y password

    try:   #conexion de la base de datos
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password="",
            database="truekki",
            port=3306
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuario WHERE email = %s", (email,))
        usuario = cursor.fetchone()
        cursor.close()
        conn.close()

        if usuario and bcrypt.checkpw(password.encode("utf-8"), usuario["contraseña"].encode("utf-8")):#validacion si el usuario existe y la contraseña es correcta
            session["usuario_id"] = usuario["id_usuario"]
            session["nombre"] = usuario["nombre"]
            session["email"] = usuario["email"]
            print(f"✅ Usuario {email} inició sesión correctamente")
            return redirect(url_for("menu"))  
        else:
            return render_template("login.html", error="❌ Usuario o contraseña incorrectos")#si no existe mostrar error

    except mysql.connector.Error as err:
        print("⚠️ Error en MySQL:", err)
        return "❌ Error en el servidor"  #imprimir error para saber cual es