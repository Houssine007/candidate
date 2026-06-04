# 🧠 Décision Architecturale : Modèle Hybride Candidat/Tenant

## 📅 Date : 21 Janvier 2026
**Statut** : Validé par le Team Lead

---

## 🚀 Le Problème
Comment concilier un **SaaS Multi-tenant** (données isolées par entreprise) avec un **Job Board Public** (marché ouvert) et un système de **Matching Intelligent** ? 

Les questions clés étaient :
1. Un candidat doit-il appartenir à une seule entreprise ?
2. Comment recommander des profils du "marché" sans briser l'isolation ?
3. Que devient un candidat une fois recruté ?

---

## 💡 La Solution : Le Modèle Hybride

Nous avons opté pour une approche où l'identité est globale mais l'interaction est privée.

### 1. Candidats : Entités Globales ("Le Marché")
Les candidats ne sont **pas** isolés par `company_id`. Ils appartiennent à la plateforme globale.
- **Pourquoi ?** Pour permettre à un candidat de postuler à plusieurs entreprises avec un seul compte et pour permettre au moteur de matching de scanner l'ensemble des talents disponibles pour les proposer aux recruteurs.

### 2. Candidatures (Applications) : Entités Privées ("Le Tenant")
L'isolation SaaS se fait au niveau de l'interaction :
- Une `Application` lie un `Candidate` à un `Job`.
- Puisque le `Job` possède un `company_id`, la candidature devient de facto une donnée privée de l'entreprise.
- **Règle** : Seuls les recruteurs ayant le même `company_id` que le job peuvent voir les détails de la candidature associée.

### 3. Cycle de Vie : Du Candidat à l'Employé
Pour gérer la transition après recrutement :
- **Visibilité** : Ajout d'un flag `is_visible` sur le profil candidat. Si un candidat est recruté, il peut passer en `is_visible = False` pour ne plus apparaître dans les suggestions de matching du marché, tout en gardant son historique.
- **Dualité** : Un utilisateur peut posséder une entrée `Candidate` (pour le marché) et une entrée `Employee` (liée à un `company_id` spécifique) une fois embauché.

---

## 🛠️ Impacts Techniques

### Backend (FastAPI)
- **Table `candidates`** : Pas de `company_id`. Champs techniques : `is_active`, `is_visible`, `is_open_to_work`.
- **Table `jobs`** : Possède obligatoirement un `company_id` (Isolation stricte).
- **Table `applications`** : Filtre d'accès via le `company_id` du job lié.

### Système de Matching
- Le matching scanne la table globale `candidates` filtrée par `is_visible = True`.
- Il compare les `skills` du candidat avec les `requirements` du job/besoin de l'entreprise.

---

## 📜 Résumé pour le futur
> "Le candidat appartient à lui-même (Marché), la candidature appartient à l'entreprise (Tenant)."
