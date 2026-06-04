# 🔐 Stratégie de Gestion des Accès (Access Control Strategy)

Ce document détaille la vision technique et fonctionnelle pour la gestion des permissions au sein de **RecruitPro**. Il explique comment nous passons d'un système simple à une infrastructure granulaire capable de s'adapter à toutes les structures d'entreprise.

---

## 1. Le Problème & Les Enjeux
Dans une plateforme SaaS RH Multi-tenant, la sécurité ne se limite pas à "qui est connecté". Elle doit répondre à la question : 
> **"Est-ce que l'Utilisateur A peut effectuer l'Action B sur la Ressource C au sein de l'Entreprise E ?"**

### Les Enjeux :
*   **Confidentialité** : Un employé ne doit pas voir les salaires ou les évaluations de ses collègues.
*   **Hiérarchie** : Un manager doit pouvoir gérer sa branche de l'organigramme sans impacter les autres.
*   **Flexibilité UX** : Le système doit être puissant mais rester simple à configurer pour un DRH non-technique.
*   **Évolutivité** : Notre architecture doit permettre de passer d'un modèle simple à un modèle complexe sans tout réécrire.

---

## 2. Analyse des Scénarios d'Experts

### Scénario A : RBAC (Role-Based Access Control) - *Le Point de Départ*
*   **Concept** : On assigne des **Rôles** (Admin, RH, Manager) aux utilisateurs. Chaque rôle possède une liste de **Permissions** fixes.
*   **Utilisation** : Idéal pour les accès aux fonctionnalités globales (ex: "Accès au module Recrutement").
*   **Transition** : C'est notre base de travail pour le MVP.

### Scénario B : ReBAC (Relation-Based Access Control) - *L'Objectif Cible*
*   **Concept** : Les droits découlent de la **Relation** entre les entités (ex: "Je suis le manager de cette OrgUnit").
*   **Utilisation** : Indispensable pour l'organigramme. Les droits sont hérités le long des branches de l'arbre.
*   **Évolution** : Nous l'ajouterons dès que la structure `OrgUnit` sera pleinement exploitée.

### Scénario C : ABAC (Attribute-Based Access Control) - *Le Futur*
*   **Concept** : Accès basé sur des attributs dynamiques (Heure, IP, Ancienneté).
*   **Utilisation** : Pour des cas de sécurité extrêmes ou des régulations spécifiques.

---

## 3. Notre Solution : L'Approche Hybride (RBAC + Scopes)

Pour garantir la flexibilité demandée sans sacrifier la simplicité, nous adoptons une structure en deux couches :

1.  **Le RÔLE (Quoi ?)** : Définit les actions possibles (ex: "Créer un Job", "Voir un Salaire").
2.  **Le SCOPE (Où ?)** : Définit la portée de ces actions.
    *   *Global* : Toute l'entreprise.
    *   *Unit* : Seulement dans son unité organisationnelle.
    *   *Branch* : Son unité + toutes les sous-unités enfants.
    *   *Self* : Seulement ses propres données.

---

## 4. Evolutivité : "Peut-on changer après ?"
**OUI.** L'architecture est conçue pour être modulaire :

1.  **Phase 1 (MVP)** : Implémentation du **RBAC Simple**. On définit des rôles globaux au niveau de l'entreprise. C'est rapide et fonctionnel.
2.  **Phase 2 (Scalability)** : Introduction des **Scopes**. On ne change pas les rôles, on leur ajoute simplement une dimension géographique/hiérarchique.
3.  **Phase 3 (Enterprise)** : Migration vers un moteur de **Policies** (comme Casbin ou OPA) si un client a des besoins de règles ultra-spécifiques, sans impacter la base de données.

---

## 5. Plan d'Action Technique
*   **Étape 1** : Créer les tables `InternalRole` et `Permission`.
*   **Étape 2** : Lier `employee.internal_role_id`.
*   **Étape 3** : Créer un middleware Backend qui intercepte les requêtes pour vérifier le couple (User, Action).

---
**Verdict Expert :** En commençant par un RBAC propre et modulaire, nous ne nous enfermons dans aucune impasse. C'est la stratégie adoptée par les plus grands SaaS pour permettre une croissance fluide de la complexité.
