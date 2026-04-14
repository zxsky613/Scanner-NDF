# Dabar's — Application de notes de frais

Application mobile multiplateforme (iOS/Android) de gestion de notes de frais avec scan intelligent de tickets de caisse.

## Stack Technique

- **Frontend** : React Native (Expo), TypeScript, NativeWind (Tailwind CSS)
- **Backend** : Supabase (Auth, Database, Storage)
- **i18n** : i18next, react-i18next, expo-localization (FR/EN/ZH)
- **Caméra & vision** : expo-camera + **Groq** (Llama 4 Scout visuel)
- **Export** : xlsx (fichiers .xlsx)

## Installation

```bash
cd ExpenseApp
npm install
npx expo start
```

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

### 3. Storage Policies (Supabase Dashboard)

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
