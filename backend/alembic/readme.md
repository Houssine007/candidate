# 📦 Alembic Migrations – Recruitment Platform

Ce dossier gère les migrations de la base de données PostgreSQL via **Alembic**, utilisé avec **SQLAlchemy**.  
Les migrations permettent de versionner et faire évoluer le schéma de manière propre, contrôlée et traçable.

---

## 🚀 1. Configuration & Structure

alembic/
│── env.py # Configuration Alembic (charge Base.metadata)
│── script.py.mako # Template utilisé pour générer les migrations
│── versions/ # Dossier contenant les fichiers de migration
alembic.ini # Fichier de configuration principal

yaml
Copier le code

- **alembic.ini** → contient l’URL DB (via `DATABASE_URL`) et les options globales  
- **env.py** → charge les modèles SQLAlchemy pour l’autogénération  
- **versions/** → contient toutes les révisions appliquées au schéma

Le projet est déjà initialisé : **aucun `alembic init` n’est nécessaire**.

---

## 🛠️ 2. Commandes Principales

⚠️ Toujours exécuter depuis `backend/` avec le venv actif.

### 🔍 Vérifier l’état des migrations
```bash
alembic current     # Révision actuelle dans la DB
alembic heads       # Les dernières révisions (HEAD)
alembic history     # Historique complet
🆕 Générer une nouvelle migration
Après modification des modèles dans app/models/ :

bash
Copier le code
alembic revision --autogenerate -m "description_du_changement"
➡️ Ensuite vérifier le fichier généré dans alembic/versions/
➡️ Ajuster si besoin (ex : seed, index, modifications manuelles)

⬆️ Appliquer les migrations
bash
Copier le code
alembic upgrade head   # Applique tout jusqu’au HEAD
alembic upgrade +1     # Migration suivante
alembic downgrade -1   # Annule une migration
alembic downgrade base # Reset total (attention aux données)
🔀 Merger des branches (si plusieurs heads)
bash
Copier le code
alembic merge <rev1> <rev2> -m "merge revisions"
🏷️ Marquer la DB manuellement (désynchronisation)
bash
Copier le code
alembic stamp head
🌱 3. Seeding des Données
Les données de test sont intégrées dans les migrations (ex : 002_seed_data.py).

❌ Ne pas exécuter les fichiers directement :

bash
Copier le code
python alembic/versions/002_seed_data.py
✔️ Toujours via Alembic :

bash
Copier le code
alembic upgrade head
📌 4. Bonnes Pratiques
Toujours utiliser l’autogénération :

bash
Copier le code
alembic revision --autogenerate -m "..."
Noms de tables : snake_case pluriel

Colonnes : snake_case

Foreign keys : {table_name}_id

Vérifier les diffs avant push

Sauvegarder avant migrations en staging/prod :

bash
Copier le code
pg_dump db > backup.sql
📜 5. Historique des Révisions
<base> → 001 : Migration initiale (users, companies, etc.)

001 → 002 : Seeding des données

002 → b6e074afeb8a : Ajout de la table candidates

Migrations futures → ajoutées dans versions/