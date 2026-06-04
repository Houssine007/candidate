# 🚀 Recruitment Platform - SaaS RH Full-Stack

## 📝 Overview
**Recruitment Platform** est une solution SaaS B2B conçue pour digitaliser et optimiser l'intégralité des processus RH et opérationnels des entreprises. Bien plus qu'un simple outil de recrutement, il s'agit d'un **hub intégré** permettant de piloter les employés, les tâches, les formations et la mobilité interne. 

Le système s'articule autour de deux piliers :
1. **Un espace privé sécurisé** : Dashboard modulaire pour la gestion interne (recrutement, paie, formations).
2. **Un site public global** : Job board pour les candidats et vitrine marketing pour la vente du SaaS (pricing, démos).

---

## 👁️ Vision & Idée

### La Vision
Transformer la fonction RH des PME et ETI en un système **agile, zéro papier et conforme** (norme NF 461 pour l'archivage). L'objectif est de réduire les coûts opérationnels jusqu'à 50% tout en accélérant les processus d'embauche via la signature électronique et les analytics RH.

### Idée Clé : Le "Tout-en-un RH"
* **Multi-tenant isolé** : Chaque entreprise possède son propre espace sécurisé.
* **Agilité** : Centralisation des données pour une gestion centrée sur l'humain.
* **Compétitivité** : Utilisation de la data pour booster la performance de l'entreprise.

---

## 🎯 Stratégie Business

| Catégorie | Détails |
| :--- | :--- |
| **Cible** | Entreprises (PME/ETI), DRH, Recruteurs. |
| **Modèle** | Abonnements mensuels (Base + Add-ons par module). |
| **Différenciateurs** | Conformité légale, intégrations RH (DPAE, mutuelles), futur matching IA. |

---

## 📚 Documentation

| Fichier | Description |
| :--- | :--- |
| 🏗️ [ARCHITECTURE.md](./ARCHITECTURE.md) | Stack technique et diagrammes. |
| 💡 [VISION_IDEE.md](./VISION_IDEE.md) | Détails approfondis de la vision. |
| 📅 [PLANNING.md](./PLANNING.md) | Roadmap du projet. |
| ⚙️ [SETUP.md](./SETUP.md) | Guide d'installation. |
| 🔌 [API.md](./API.md) | Documentation des endpoints. |
| 🛡️ [SECURITY.md](./SECURITY.md) | Protocoles de sécurité. |
| 🧪 [TESTS.md](./TESTS.md) | Stratégie de tests. |
| 🚀 [DEPLOYMENT.md](./DEPLOYMENT.md) | Guide de déploiement. |
| ❓ [FAQ.md](./FAQ.md) | Questions courantes. |

---

## 👥 Contributeurs & Contact

* **Lead Dev :** Houssine
* **Contact :** [Insérer l'email ici]


# /create recruiter 

Pour réponse à ta question : OUI, c'est tout à fait normal que ça demande user_id, et c'est même obligatoire.

Voici pourquoi (c'est la force de ton architecture) :

Table 
User
 : C'est pour la connexion (email/mot de passe).
Table 
Recruiter
 : C'est le "badge professionnel" de l'utilisateur.
Donc, pour créer un recruteur valide, tu dois dire "Ce badge Recruteur appartient à l'Utilisateur X et il travaille pour l'Entreprise Y".