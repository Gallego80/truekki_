from flask import Blueprint, render_template, request
import mysql.connector

productos_bp = Blueprint("productos", __name__, url_prefix="/productos")


@productos_bp.route("/productos", methods=["GET", "POST"]) #definir la ruta 
def login():
    if request.method == "GET":
        return render_template("productos.html")

def obtener_productos():

    mysql.connector.connect(
        host="localhost",
        user="root",
        password="",
        database="truekki",
        port=3306
    )
    # Aquí conecta con DB y retorna lista de dicts con productos
    # Ejemplo dummy:
    return [
        {
            'nombre': 'Camisa Barcelona',
            'descripcion': 'Camisa oficial del Barcelona',
            'categoria': 'ropa',
            'estado': 'nuevo',
            'precio': 50.00,
            'fecha': '2025-09-06',
        }
    ]
