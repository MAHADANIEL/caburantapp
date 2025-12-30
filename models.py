from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Livraison(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    livreur = db.Column(db.String(100), nullable=False)
    client = db.Column(db.String(100), nullable=False)
    volume = db.Column(db.Float, nullable=False)
    date = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            "livreur": self.livreur,
            "client": self.client,
            "volume": self.volume,
            "date": self.date
        }

class ConfigStock(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    stock_initial = db.Column(db.Float, default=0.0)
    stock_actuel = db.Column(db.Float, default=0.0)
    derniere_maj = db.Column(db.DateTime, default=datetime.utcnow)