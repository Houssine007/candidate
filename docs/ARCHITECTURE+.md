# 🏗️ Architecture Technique - Recruitment Platform

Ce document détaille les choix technologiques et les orientations structurelles du projet, de la phase MVP jusqu'au passage à l'échelle.

---

## 🛠️ Stack Technologique

| Composant | Technologie | Description |
| :--- | :--- | :--- |
| **Backend** | **FastAPI (Python)** | API haute performance, asynchrone et auto-documentée. |
| **Frontend** | **Next.js (TypeScript)** | Framework React pour le site public (SEO) et l'application privée. |
| **Base de données** | **PostgreSQL** | Base relationnelle robuste pour la gestion multi-tenant. |
| **ORM** | **SQLAlchemy** | Gestion des modèles de données et requêtes SQL. |
| **Authentification** | **JWT & Roles Enum** | Sécurisation par jetons et gestion des permissions par rôles. |
| **Outillage** | **Alembic, Pytest, Orval** | Migrations DB, tests automatisés et génération de clients API. |

---

## 📂 Architecture Multi-Tenant

Le système repose sur une isolation logique des données par entreprise :
* **Stratégie :** Isolation par colonne `company_id`.
* **Fonctionnement :** Chaque requête utilisateur est filtrée systématiquement : 
  `query.filter(company_id == current_company_id)`.
* **Avantage :** Simplicité de maintenance et coût d'infrastructure réduit pour le démarrage.

---

## 🔄 Flux de Données (Diagrammes)

### Flux Général
```text
[Utilisateur Externe]  --> [Site Public Next.js] --> [Job Board / Apply] --> [API Publique FastAPI]
                                                                                   |
[Utilisateur Interne]  --> [Espace Privé Next.js] --> [Dashboard RH]     --> [API Tenant FastAPI]
                                                                                   |
                                                                         [Postgres (filtre company_id)]


                                        
                                        
                                        Deux Scénarios Architecturaux
Scénario 1 : MVP (Monolithe Modulaire – Recommandé pour start)

Un seul FastAPI avec routes séparées (/public/* vs /tenant/*).
Avantages : Simple, rapide à dev (1 dev suffit), coût bas.
Inconvénients : Moins scalable si 1000+ tenants (tout crash si bug).
Quand ? : Maintenant, pour MVP et premiers clients.

Scénario 2 : Microservices (Pour scale)

Split en services indépendants (Docker/K8s) :
auth-svc : Login/JWT.
public-svc : Job board/marketing.
core-rh-svc : Employés, tâches, formations.
recruitment-svc : Offres/matching.

Gateway (Traefik) route requêtes.
Avantages : Scale indépendant (ex. recrutement heavy → plus de replicas), teams séparées.
Inconvénients : Plus complexe (déploiement, comm inter-services via Kafka/RabbitMQ).
Quand ? : Après 50 clients ou 1M+ users.

Transition : Commence par monolithe, refactor en microservices quand besoin.                               