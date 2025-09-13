from flask import Flask, render_template, session, jsonify
import os

from python.login import login_bp
from python.registro import registro_bp
from python.metodos_de_pago import metodos_de_pago_bp
from python.productos import productos_bp, obtener_productos

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.urandom(24)

app.register_blueprint(login_bp)
app.register_blueprint(registro_bp)
app.register_blueprint(metodos_de_pago_bp)
app.register_blueprint(productos_bp)


@app.route("/menu")
def menu():
    return render_template("menu.html")

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/producto")
def producto():
    return render_template("producto.html")

@app.route('/logout')
def logout():
    # Solo eliminamos claves específicas relacionadas con la sesión del usuario
    session.pop('usuario', None)
    return render_template("index.html")

@app.route("/productos")
def productos():
    return render_template("productos.html")

@app.route("/api/productos")
def api_productos():
    return jsonify(obtener_productos())

if __name__ == "__main__":
    app.run(debug=True, port=5000)
