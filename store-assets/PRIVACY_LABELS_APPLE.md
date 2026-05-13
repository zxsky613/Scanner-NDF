# Privacy Labels — Guide pas-à-pas pour App Store Connect

> **À quoi ça sert ?** Apple exige, **en plus de l'URL de la politique de confidentialité**,
> que vous remplissiez un formulaire structuré dans App Store Connect appelé **App Privacy** (anciennement Privacy Nutrition Labels).
> Ce formulaire devient les "étiquettes de confidentialité" que les utilisateurs voient sur la fiche App Store **avant** de télécharger.
>
> **Important** : ces réponses doivent **correspondre exactement** au texte de votre politique
> (`https://dabars-web.vercel.app/privacy`). Si Apple détecte une incohérence, votre soumission est rejetée.

---

## Comment y accéder

1. Connectez-vous à https://appstoreconnect.apple.com
2. **My Apps** → **DABAR's**
3. Menu de gauche → **App Privacy**
4. Cliquez **Get Started** (1ère fois) ou **Edit** (mises à jour)

---

## Section 1 — Data Collection

### Question : « Do you or your third-party partners collect data from this app? »

**Réponse : `Yes, we collect data from this app`**

> Justification : votre app collecte au moins email + nom + contenu utilisateur (notes, photos).

---

## Section 2 — Data Types (cocher pour chaque catégorie)

Voici **exactement** ce qu'il faut cocher pour DABAR's, basé sur votre code :

### ✅ **Contact Info** (à cocher)

| Sous-type | Cocher ? | Détails à renseigner |
|---|---|---|
| **Name** | ✅ Oui | `full_name` collecté à l'inscription |
| **Email Address** | ✅ Oui | utilisé comme identifiant de connexion |
| Phone Number | ❌ Non | non collecté |
| Physical Address | ❌ Non | non collecté |
| Other User Contact Info | ❌ Non | non collecté |

### ✅ **User Content** (à cocher)

| Sous-type | Cocher ? | Détails |
|---|---|---|
| **Photos or Videos** | ✅ Oui | photos de tickets de caisse |
| **Audio Data** | ❌ Non | jamais |
| Gameplay Content | ❌ Non | non applicable |
| Customer Support | ❌ Non | pas de chat support intégré |
| **Other User Content** | ✅ Oui | données saisies (notes, montants, fournisseurs, projets) |

### ✅ **Identifiers** (à cocher)

| Sous-type | Cocher ? | Détails |
|---|---|---|
| **User ID** | ✅ Oui | `auth.users.id` Supabase (UUID interne) |
| Device ID | ❌ Non | pas d'IDFA, pas d'identifiant publicitaire |

### ✅ **Diagnostics** (à cocher si vous gardez les logs minimaux)

| Sous-type | Cocher ? | Détails |
|---|---|---|
| **Crash Data** | ✅ Oui | logs d'erreurs serveur côté Supabase |
| **Performance Data** | ❌ Non | sauf si vous ajoutez Sentry/Datadog plus tard |
| **Other Diagnostic Data** | ✅ Oui | journaux de connexion |

### ❌ **Tout le reste : NE PAS cocher**

| Catégorie | À cocher ? |
|---|---|
| Health & Fitness | ❌ Non |
| Financial Info | ❌ Non *(les notes de frais ne sont **pas** des données financières au sens Apple — ce sont des "User Content")* |
| Location | ❌ Non *(votre app ne demande pas la localisation)* |
| Sensitive Info | ❌ Non |
| Contacts | ❌ Non |
| Search History | ❌ Non |
| Browsing History | ❌ Non |
| Purchases | ❌ Non |
| Usage Data | ❌ Non *(pas d'analytics tiers)* |
| Surroundings (camera/photo passive) | ❌ Non |

---

## Section 3 — Pour chaque catégorie cochée, Apple pose 3 questions

### Question A : `How is this data used?` (cocher tout ce qui s'applique)

Pour **toutes** les catégories cochées plus haut (Contact Info, User Content, Identifiers, Diagnostics) :

- ✅ **App Functionality** *(l'app a besoin de ces données pour fonctionner — c'est votre cas principal)*
- ❌ Analytics *(non, pas d'analytics)*
- ❌ Product Personalization *(non)*
- ❌ App Personalization *(non)*
- ❌ Developer's Advertising or Marketing *(non)*
- ❌ Third-Party Advertising *(non)*
- ❌ **Other Purposes** *(non)*

### Question B : `Is this data linked to the user's identity?`

Pour **TOUTES** les catégories cochées : **`Yes, data is linked to the user's identity`**

> Justification : votre app sait qui est l'utilisateur (login email + UUID), donc toute donnée collectée est intrinsèquement liée à son identité.

### Question C : `Is this data used to track the user?`

Pour **TOUTES** les catégories cochées : **`No, data is not used to track the user`**

> Justification : aucun IDFA lu, aucun partage avec data brokers/réseaux pub, aucun cross-app tracking.
> Votre policy le déclare explicitement (section 2 — "App Tracking Transparency").

---

## Section 4 — Récapitulatif visuel attendu

Une fois soumis, voici à quoi ressembleront vos labels sur l'App Store :

```
Data Linked to You
   👤 Contact Info        — Name, Email Address
   📄 User Content        — Photos or Videos, Other User Content
   🆔 Identifiers         — User ID
   🐛 Diagnostics         — Crash Data, Other Diagnostic Data

Data Not Linked to You
   (rien)

Data Used to Track You
   (rien)
```

C'est **l'objectif visuel** que vos utilisateurs verront. Sobre, clair, honnête.

---

## Section 5 — Champs annexes obligatoires dans App Store Connect

### Privacy Policy URL
```
https://dabars-web.vercel.app/privacy
```
(ou votre domaine custom si configuré : `https://app.dabarfrance.com/privacy`)

### Privacy Choices URL (optionnel mais recommandé)
> Apple permet d'indiquer une page où l'utilisateur peut gérer ses choix de confidentialité.
> Vous pouvez pointer vers la même page `/privacy` (les sections 10 et 11 décrivent comment exercer les droits).

### Account Deletion URL (NOUVEAU — exigé depuis juin 2022)
Apple Guideline 5.1.1(v) demande où l'utilisateur peut supprimer son compte. Deux options :

- **Option 1 (recommandée) :** déclarer que la suppression se fait **dans l'app** (Réglages → Supprimer mon compte). C'est ce que votre app permet déjà via l'Edge Function `delete-account`. Cocher "Account deletion can be initiated from within the app".

- **Option 2 :** fournir une URL web. Si vous voulez ajouter ce chemin au site, dites-le moi et j'ajoute une page `/delete-account` qui explique la procédure.

### Data Retention
Apple peut demander la durée de conservation. Réponse alignée avec votre policy :
- Compte actif : durée de la relation contractuelle.
- Données comptables : jusqu'à 10 ans (obligation légale française).

---

## Section 6 — Catégorie d'âge (Age Rating)

App Store Connect → **App Information** → **Age Rating** → **Edit**

Réponses recommandées pour DABAR's (toutes en "None" sauf cas particulier) :

| Question | Réponse |
|---|---|
| Cartoon or Fantasy Violence | None |
| Realistic Violence | None |
| Sexual Content or Nudity | None |
| Profanity or Crude Humor | None |
| Alcohol, Tobacco, or Drug Use | None |
| Mature/Suggestive Themes | None |
| Horror/Fear Themes | None |
| Gambling | None |
| Medical/Treatment Information | None |
| Unrestricted Web Access | **No** *(votre app n'a pas de webview ouvert sur internet)* |
| Made for Kids | **No** |

→ Apple calcule automatiquement : **rating "4+"**.

> Note : votre policy fixe 16 ans minimum (RGPD), mais le rating App Store est différent — il indique l'absence de contenu inapproprié, pas l'âge minimum d'usage. Vous pouvez avoir un rating "4+" et restreindre l'accès aux 16+ via votre policy/CGU.

---

## Section 7 — Réservé aux apps qui demandent des permissions

Pour chaque permission demandée (déclarée dans `app.json`), Apple vérifie que :
1. Le texte d'usage (`NSCameraUsageDescription`, etc.) est clair et précis.
2. La policy explique l'usage.

### NSCameraUsageDescription
- **Texte actuel** (`app.json`) : *"L'application a besoin d'accéder à votre caméra pour scanner les tickets de caisse."* ✅ OK, conforme.
- **Section policy** : section 3 (couverte). ✅

### NSPhotoLibraryUsageDescription
- **Texte actuel** : *"L'application a besoin d'accéder à vos photos pour importer des justificatifs."* ✅ OK.
- **Section policy** : section 3 (couverte). ✅

> ⚠️ Votre `app.json` Android demande aussi `RECORD_AUDIO`. **Si vous n'utilisez pas le micro, retirez cette permission** — Apple/Google peuvent rejeter pour permissions superflues. À vérifier.

---

## Section 8 — Avant la soumission, checklist finale

- [ ] Privacy Labels remplis (sections 2 et 3 ci-dessus)
- [ ] Privacy Policy URL = `https://dabars-web.vercel.app/privacy`
- [ ] Account deletion = activé "in-app" (vérifier qu'on peut bien supprimer son compte depuis Réglages)
- [ ] Age Rating calculé automatiquement à "4+"
- [ ] App Description (en français + anglais) ne mentionne **aucune** fonctionnalité non implémentée
- [ ] Build TestFlight validé sans crash sur iPhone récent (iOS 17+)
- [ ] Captures d'écran des principaux écrans : Login, Liste de notes, Nouvelle note, Réglages avec **Supprimer mon compte** visible (Apple regarde particulièrement)

---

## En cas de rejet d'Apple

Apple est très strict sur 3 points :
1. **Suppression de compte non visible** dans l'app → vérifiez le chemin Réglages → Compte et données → Supprimer.
2. **Privacy Labels incohérents** avec la policy → relisez les deux côte à côte.
3. **Permissions non justifiées** dans la policy → si vous ajoutez une permission, ajoutez le paragraphe correspondant dans `src/i18n/legal/fr.ts` section 3, puis redéployez Vercel.

Si rejet, Apple envoie un message dans App Store Connect → onglet **Resolution Center**. Lisez attentivement, corrigez **uniquement** ce qu'ils pointent, puis resoumettez.

---

**Dernière mise à jour de ce guide** : 5 mai 2026
**Aligné sur** : politique de confidentialité v2 (`https://dabars-web.vercel.app/privacy`)
