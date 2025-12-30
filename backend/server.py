from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from models import db, Livraison, ConfigStock
from datetime import datetime

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION DE LA BASE (SUPABASE) ---
# J'ai retiré les crochets [] autour du mot de passe
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres.ygryutmzkxouxtibvtqu:QpUX0WP6YeUgEdsX@aws-1-eu-west-3.pooler.supabase.com:6543/postgres'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

# Création des tables sur Supabase au démarrage
with app.app_context():
    db.create_all()
    if not ConfigStock.query.first():
        db.session.add(ConfigStock(stock_initial=0.0, stock_actuel=0.0))
        db.session.commit()

# --- ROUTES ---

@app.route('/')
def home():
    return "Serveur CarburantApp connecté à Supabase et opérationnel !"

@app.route('/api/update_stock', methods=['POST'])
def update_stock():
    data = request.json
    try:
        config = ConfigStock.query.first()
        if 'volume_actuel' in data:
            config.stock_actuel = float(data['volume_actuel'])
        if 'volume_max' in data:
            config.stock_initial = float(data['volume_max'])
        
        config.derniere_maj = datetime.utcnow()
        db.session.commit()
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/api/get_config_stock', methods=['GET'])
def get_config_stock():
    config = ConfigStock.query.first()
    return jsonify({
        "stock_initial": config.stock_initial,
        "stock_actuel": config.stock_actuel
    })

@app.route('/api/livraison', methods=['POST'])
def enregistrer_livraison():
    data = request.json
    try:
        nouvelle_livraison = Livraison(
            livreur=data['livreur'],
            client=data['client'],
            volume=float(data['volume']),
            date=data['date']
        )
        db.session.add(nouvelle_livraison)
        
        config = ConfigStock.query.first()
        config.stock_actuel -= float(data['volume'])
        
        db.session.commit()
        return jsonify({"status": "success"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"status": "error", "message": str(e)}), 400

@app.route('/api/historique', methods=['GET'])
def get_historique():
    livraisons = Livraison.query.order_by(Livraison.id.desc()).all()
    return jsonify([l.to_dict() for l in livraisons])

if __name__ == '__main__':
    # Utilisation du port dynamique pour l'hébergement (Render/Heroku)
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port)