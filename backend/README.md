# Backend - Plateforme de Recrutement

## Prérequis

- Python 3.8+
- PostgreSQL 12+
- pip (gestionnaire de paquets Python)

## Installation

1. **Créer un environnement virtuel** :
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows
```

2. **Installer les dépendances** :
```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

3. **Configurer la base de données** :
- Créer une base de données PostgreSQL
- Configurer les variables d'environnement dans `.env`
- Exécuter les migrations :
```bash
alembic upgrade head
```

4. **Charger les données initiales** :
```bash
python scripts/seed_data.py
```

## Démarrage

1. **Démarrer le serveur de développement** :
```bash
python run.py
```
Le serveur sera accessible à l'adresse : http://localhost:8000

2. **Documentation API** :
- Swagger UI : http://localhost:8000/docs
- ReDoc : http://localhost:8000/redoc

## Tests

1. **Exécuter tous les tests** :
```bash
python run_tests.py
```

2. **Exécuter des tests spécifiques** :
```bash
# Tests unitaires
pytest tests/unit/

# Tests d'intégration
pytest tests/integration/

# Tests avec couverture
pytest --cov=app tests/
```

## Structure du Projet

```
backend/
├── alembic/              # Migrations de base de données
├── app/
│   ├── api/             # Points d'entrée API
│   ├── core/            # Configuration et utilitaires
│   ├── models/          # Modèles de données
│   ├── schemas/         # Schémas Pydantic
│   └── services/        # Logique métier
├── scripts/             # Scripts utilitaires
├── tests/               # Tests
│   ├── unit/           # Tests unitaires
│   └── integration/    # Tests d'intégration
├── .env                 # Variables d'environnement
├── requirements.txt     # Dépendances de production
└── requirements-dev.txt # Dépendances de développement
```

## Fonctionnalités

- Authentification et autorisation
- Gestion des profils candidats et recruteurs
- Gestion des offres d'emploi
- Système de matching
- Gestion des candidatures
- Notifications
- Gestion des entretiens
- API RESTful complète

## Sécurité

- Authentification JWT
- Validation des données
- Protection CORS
- Gestion des rôles
- Hachage des mots de passe
- Protection contre les injections SQL

## Support

Pour toute question ou problème, veuillez créer une issue dans le dépôt GitHub. 