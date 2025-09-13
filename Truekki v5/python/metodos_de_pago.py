from flask import Blueprint , request, jsonify
import stripe

metodos_de_pago_bp = Blueprint("metodos_de_pago", __name__)


