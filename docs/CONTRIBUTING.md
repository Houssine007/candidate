# Guide de Contribution

## 1. Standards de Code

### 1.1 Python

- Suivre PEP 8 pour le style de code
- Utiliser le typage statique (type hints)
- Maximum 88 caractères par ligne
- Docstrings en format Google
- Nommage explicite des variables et fonctions

### 1.2 FastAPI

- Utiliser les modèles Pydantic pour la validation
- Documenter les endpoints avec OpenAPI
- Gérer les erreurs de manière cohérente
- Utiliser les dépendances FastAPI

### 1.3 SQLAlchemy

- Utiliser les modèles déclaratifs
- Éviter les requêtes SQL brutes
- Utiliser les sessions de manière appropriée
- Gérer les transactions

## 2. Conventions de Nommage

### 2.1 Fichiers et Dossiers

- Utiliser le snake_case pour les noms de fichiers
- Préfixer les fichiers de test avec `test_`
- Organiser les modules par fonctionnalité

### 2.2 Variables et Fonctions

- Variables : snake_case
- Fonctions : snake_case
- Classes : PascalCase
- Constantes : UPPER_CASE

### 2.3 Base de Données

- Tables : snake_case, pluriel
- Colonnes : snake_case
- Clés étrangères : `{table_name}_id`

## 3. Processus de Développement

### 3.1 Workflow Git

1. Créer une branche pour chaque fonctionnalité
2. Nommer les branches : `feature/`, `bugfix/`, `hotfix/`
3. Faire des commits atomiques
4. Écrire des messages de commit clairs
5. Créer des Pull Requests

### 3.2 Revue de Code

- Vérifier la qualité du code
- S'assurer que les tests passent
- Vérifier la documentation
- Valider les performances

## 4. Tests

### 4.1 Écrire des Tests

- Tests unitaires pour chaque fonction
- Tests d'intégration pour les API
- Tests de performance
- Mocks pour les dépendances externes

### 4.2 Exécuter les Tests

```bash
# Tests unitaires
pytest tests/unit

# Tests d'intégration
pytest tests/integration

# Tous les tests avec couverture
pytest --cov=app tests/
```

## 5. Documentation

### 5.1 Code

- Documenter toutes les fonctions
- Expliquer les algorithmes complexes
- Commenter le code non évident
- Maintenir la documentation à jour

### 5.2 API

- Documenter tous les endpoints
- Fournir des exemples
- Décrire les erreurs possibles
- Maintenir la documentation OpenAPI

## 6. Bonnes Pratiques

### 6.1 Sécurité

- Ne jamais commiter de secrets
- Valider toutes les entrées
- Utiliser des requêtes paramétrées
- Gérer les permissions

### 6.2 Performance

- Optimiser les requêtes
- Utiliser le caching
- Gérer les ressources
- Monitorer les performances

### 6.3 Maintenance

- Garder les dépendances à jour
- Nettoyer le code mort
- Refactorer régulièrement
- Suivre les bonnes pratiques

## 7. Environnement de Développement

### 7.1 Configuration

- Utiliser des variables d'environnement
- Configurer les outils de développement
- Maintenir les fichiers de configuration
- Documenter les dépendances

### 7.2 Outils Recommandés

- IDE : VS Code ou PyCharm
- Linter : flake8
- Formatter : black
- Type checker : mypy

## 8. Support

### 8.1 Questions

- Utiliser les issues GitHub
- Documenter les problèmes connus
- Fournir des exemples
- Maintenir une FAQ

### 8.2 Contribution

- Bienvenue à tous les contributeurs
- Respecter le code de conduite
- Être constructif
- Partager les connaissances 