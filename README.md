# Dabar's — Application de notes de frais

Application multiplateforme (**iOS / Android / Web**) de gestion de notes de frais avec scan intelligent de tickets de caisse.

Le code est unique : la même base React Native (Expo) est compilée pour mobile **et** pour le navigateur via `react-native-web`. Les écrans détectent `Platform.OS === 'web'` et adaptent leur layout (sidebar gauche, panneaux étendus, raccourcis souris) pour les utilisateurs Commerciaux / Manager / Finance qui pilotent depuis un PC.

## Stack Technique

- **Frontend mobile** : React Native (Expo), TypeScript, NativeWind (Tailwind CSS)
- **Frontend web** : `react-native-web` (même code) + layouts desktop dédiés (`src/config/webLayout.ts`, `src/components/WebDesktopSidebar.tsx`)
- **Backend** : Supabase (Auth, Database, Storage, Edge Functions)
- **i18n** : i18next, react-i18next, expo-localization (FR/EN/ZH)
- **Caméra & vision** : expo-camera + **Groq** (Llama 4 Scout visuel) — sur le web, l'extraction passe par l'Edge Function `extract-receipt`
- **Export** : xlsx (fichiers .xlsx)
- **Hébergement web** : Vercel (`vercel.json` à la racine d'`ExpenseApp/`)

## Installation

```bash
cd ExpenseApp
npm install
npx expo start          # mobile (Expo Go / simulateurs)
npm run web             # version web en local (http://localhost:8082)
```

## Déploiement Web (Vercel)

Le site web est généré par `expo export -p web` (sortie : `dist/`). Le fichier `vercel.json` pilote tout :
build, fallback SPA pour React Navigation, cache long sur les assets `_expo/static/...`.

### Option 1 — CLI (le plus rapide)

```bash
cd ExpenseApp
npm i -g vercel         # une seule fois
vercel login
vercel                  # 1er deploy : preview
vercel --prod           # deploy en production
```

Au premier `vercel`, choisissez :
- **Set up and deploy** → `Y`
- **Which scope ?** → votre compte / équipe
- **Link to existing project ?** → `N` (création nouveau projet)
- **Project name** → `dabars-web` (ou autre)
- **In which directory is your code located ?** → `./` (vous êtes déjà dans `ExpenseApp/`)
- Vercel détecte `vercel.json` et utilise `expo export -p web`.

### Option 2 — Git + Dashboard Vercel

1. Pushez le repo sur GitHub.
2. Sur [vercel.com](https://vercel.com) → **Add New Project** → importez le repo.
3. **Root Directory** = `ExpenseApp` (très important, pas la racine du repo).
4. Framework Preset : **Other** (laissez Vercel lire `vercel.json`).
5. **Deploy**.

### Variables d'environnement à configurer sur Vercel

Dans **Project Settings → Environment Variables**, ajoutez (Production + Preview) :

| Clé                              | Valeur                                                  |
| -------------------------------- | ------------------------------------------------------- |
| `EXPO_PUBLIC_SUPABASE_URL`       | URL de votre projet Supabase                            |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY`  | Clé anonyme publique Supabase                           |

> Le scan IA web passe par l'Edge Function `extract-receipt` côté Supabase — la clé Groq n'est **pas** nécessaire dans Vercel. Assurez-vous d'avoir exécuté :
> ```bash
> supabase secrets set GROQ_API_KEY=gsk_...
> supabase functions deploy extract-receipt
> ```

### Domaine personnalisé

Vercel donne d'office une URL `*.vercel.app`. Pour un domaine custom :
**Project → Settings → Domains** → ajoutez `app.votredomaine.com` et suivez les instructions DNS (CNAME).

## Configuration

### 1. Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Exécutez le schéma SQL : `supabase/schema.sql`
3. Créez un bucket Storage nommé `receipts`
4. Mettez à jour `src/config/supabase.ts` avec vos clés :

```typescript
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

### 2. API IA (Groq)

1. Créez une clé sur [console.groq.com](https://console.groq.com).
2. Dans `.env` à la racine d’`ExpenseApp` :

```env
EXPO_PUBLIC_GROQ_API_KEY=gsk_votre_cle
```

3. **Redémarrez** le serveur Expo après toute modification du `.env`.

**Pourquoi le scan peut « ne rien faire »**

- **Expo Web** : le navigateur bloque en général l’appel direct à Groq (CORS). Le flux Web utilise une **Edge Function** Supabase `extract-receipt` qui appelle Groq côté serveur.
  - Installez la [Supabase CLI](https://supabase.com/docs/guides/cli), reliez le projet, puis :
    ```bash
    supabase secrets set GROQ_API_KEY=gsk_votre_cle
    supabase functions deploy extract-receipt
    ```
  - Connectez-vous dans l’app avant de lancer un scan (la fonction vérifie un utilisateur authentifié).
- **Mobile** : sous Expo SDK 54, la lecture fichier pour l’image doit passer par `expo-file-system/legacy` (déjà corrigé dans `aiExtraction.ts`).

Fichier de la fonction : `supabase/functions/extract-receipt/index.ts`.

### 3 bis. Suppression de compte (App Store / utilisateur)

Réglages → **Supprimer mon compte** appelle une Edge Function `delete-account` (exigence type Apple 5.1.1(v)).

1. **SQL (une fois)** : exécutez dans le SQL Editor Supabase le fichier  
   `supabase/expenses_reviewed_by_on_delete_set_null.sql`  
   (sinon la suppression du compte peut échouer si d’autres notes référencent cet utilisateur comme « relecteur »).

2. **Déploiement** :
   ```bash
   supabase functions deploy delete-account
   ```
   La clé **service role** est injectée automatiquement côté Supabase ; aucune clé secrète dans l’app mobile.

3. La fonction : met `reviewed_by` à jour, supprime les fichiers du bucket `receipts` sous `{userId}/`, puis supprime l’utilisateur Auth (cascade `profiles`, `expenses` de l’utilisateur, notifications, etc.).

### 4. Storage Policies (Supabase Dashboard)

Ajoutez ces policies au bucket `receipts` :

- **Upload** : Les utilisateurs authentifiés peuvent uploader dans leur propre dossier
- **Read** : Les managers/finance peuvent lire tous les fichiers

## Fonctionnalités

### Interface Employé
- Scan de tickets via caméra ou import d'image
- Extraction IA automatique (date, fournisseur, HT, TVA multi-taux, TTC)
- Formulaire de correction manuelle
- Choix de catégorie (Nourriture, Matériaux, Déplacements)
- Détection automatique des doublons
- Alerte fiscale pour montants > 500€

### Interface Gestionnaire (Accès restreint)
- Tableau de bord global avec statistiques
- Filtres avancés (employé, date, statut, catégorie)
- Validation / rejet avec motif
- Export Excel (.xlsx) complet

### Sécurité (RBAC)
- Rôles : `employee`, `manager`, `finance`
- Row Level Security (RLS) sur toutes les tables
- Les employés ne voient que leurs propres données
- Les managers/finance ont accès à toutes les données

### Multilingue
- Français, English, 中文 (Simplifié)
- Détection automatique de la langue du téléphone
- Sélecteur de langue dans les paramètres
- Formatage des dates adapté (DD/MM/YYYY, MM/DD/YYYY, YYYY/MM/DD)

## Structure du Projet

```
ExpenseApp/
├── App.tsx                          # Point d'entrée
├── src/
│   ├── config/
│   │   ├── supabase.ts              # Client Supabase
│   │   └── constants.ts             # Constantes (API, seuils)
│   ├── i18n/
│   │   ├── index.ts                 # Configuration i18next
│   │   └── locales/
│   │       ├── fr.json              # Français
│   │       ├── en.json              # Anglais
│   │       └── zh.json              # Chinois
│   ├── types/
│   │   └── index.ts                 # Types TypeScript
│   ├── hooks/
│   │   ├── useAuth.ts               # Auth & profil
│   │   └── useExpenses.ts           # CRUD dépenses
│   ├── lib/
│   │   ├── aiExtraction.ts          # Extraction IA
│   │   └── storage.ts               # Upload Supabase Storage
│   ├── utils/
│   │   ├── dateFormat.ts            # Formatage dates/devises
│   │   └── excelExport.ts           # Export Excel
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── RegisterScreen.tsx
│   │   ├── employee/
│   │   │   ├── EmployeeHomeScreen.tsx
│   │   │   ├── NewExpenseScreen.tsx
│   │   │   └── ExpenseDetailScreen.tsx
│   │   ├── admin/
│   │   │   └── AdminDashboardScreen.tsx
│   │   └── settings/
│   │       └── SettingsScreen.tsx
│   └── navigation/
│       └── AppNavigator.tsx          # Navigation tabs + stacks
├── supabase/
│   └── schema.sql                   # Schéma SQL complet
├── tailwind.config.js
├── metro.config.js
└── app.json
```
