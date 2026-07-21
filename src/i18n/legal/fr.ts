/** Textes juridiques (FR) — alignés Apple App Store (Guideline 5.1.1, 5.1.1(v), Privacy Labels) et RGPD.
 *  À faire valider par un professionnel avant mise en production. */

const mentionsBody = `Le service « {{tradeName}} » (l’« Application ») couvre une application mobile iOS / Android et un site web associé. Il est édité par {{companyName}}, {{legalForm}}, dont le siège social est situé {{addressLine}}, {{country}} (l’« Éditeur »).

Immatriculation : {{registrationNumber}}. Numéro de TVA intracommunautaire : {{vatNumber}}.

Contact : {{contactEmail}}.

Directeur de la publication : {{publicationDirector}}.

Hébergement des données : le stockage des données personnelles est assuré via l’infrastructure du prestataire {{hostName}} ({{hostWebsite}}), dans une région de l’Union européenne conformément au paramétrage du projet. Siège social du prestataire (information réglementaire) : {{hostAddress}}. Le site web public est hébergé par Vercel Inc. (https://vercel.com).

Propriété intellectuelle : les éléments de l’Application (textes, interface, marques, logos) sont protégés. Toute reproduction ou représentation non autorisée est interdite.

Réclamations : adressez vos demandes à {{contactEmail}}.

Droit applicable : droit français et, le cas échéant, droit de l’Union européenne. Litiges : tribunaux compétents du ressort du siège social de l’Éditeur, sous réserve des dispositions impératives, notamment en matière de travail et de droit de la consommation.`;

const privacyBody = `La présente politique de confidentialité décrit le traitement des données personnelles dans le cadre du service « {{tradeName}} » (ci-après l’« Application »), couvrant l’application mobile (iOS / Android) et le site web associé. Le service est édité par {{companyName}} ({{contactEmail}}), agissant en tant que responsable de traitement au sens du Règlement (UE) 2016/679 (RGPD). L’Application est destinée à un usage strictement professionnel par les salariés et collaborateurs autorisés de l’Éditeur ; tout compte est créé ou validé par l’Éditeur.

Public concerné — Âge minimum : l’Application est réservée à un usage professionnel adulte. L’Éditeur fixe l’âge minimum d’utilisation à 16 ans (conformément à l’article 8 du RGPD et à la loi française) et déconseille toute utilisation par des mineurs hors cadre professionnel autorisé. L’Application n’est pas conçue pour des enfants.

1. Catégories de données collectées

L’Application collecte uniquement les données strictement nécessaires à son fonctionnement professionnel :
• Informations de contact : nom complet, adresse e-mail (utilisée comme identifiant de connexion), rôle et service le cas échéant.
• Identifiants : identifiant utilisateur unique généré par le service d’authentification ({{hostName}}).
• Contenu utilisateur : notes de frais saisies (date, fournisseur, montants HT / TTC, TVA, catégorie, projet associé), photographies de tickets de caisse et justificatifs téléchargés (importés depuis la galerie ou capturés via l’appareil photo), commentaires éventuels, projets commerciaux suivis.
• Préférences d’interface : langue choisie (FR / EN / ZH), session d’authentification stockée localement.
• Diagnostics techniques minimaux : journaux de connexion et messages d’erreur (à des fins de sécurité et de support). L’Application n’intègre aucun outil d’analyse comportementale tiers (pas de Google Analytics, pas de Sentry public, pas de Mixpanel, pas de SDK publicitaire).

2. Suivi (App Tracking Transparency)

L’Éditeur déclare expressément que l’Application **NE SUIT PAS** ses utilisateurs au sens du framework Apple App Tracking Transparency :
• aucun identifiant publicitaire (IDFA) n’est lu ;
• aucune donnée n’est partagée avec des courtiers de données ou réseaux publicitaires ;
• aucune corrélation n’est faite entre votre activité dans l’Application et votre activité dans d’autres applications ou sites web tiers.
En conséquence, l’Application ne déclenche pas l’invite « Autorisez-vous… à vous suivre ? » sur iOS.

3. Permissions iOS / Android demandées

L’Application demande votre accord explicite avant d’accéder aux ressources suivantes ; vous pouvez refuser ou révoquer ces accès à tout moment depuis les Réglages de votre appareil :
• Appareil photo (NSCameraUsageDescription) : pour scanner un ticket de caisse. Les images sont chiffrées en transit et stockées dans votre espace de l’Application.
• Bibliothèque de photos (NSPhotoLibraryUsageDescription) : pour importer un justificatif déjà photographié. Aucune autre photo de votre bibliothèque n’est lue.
Sur le site web, l’appareil photo et l’import de fichiers ne sont pas utilisés : la saisie y est manuelle.

4. Finalités et bases légales

Les données sont traitées pour les finalités suivantes :
• gestion du compte et de l’authentification — base légale : exécution du contrat de travail / mesures précontractuelles ;
• gestion des notes de frais (saisie, validation, rejet, export comptable) — base légale : intérêt légitime de l’employeur à organiser les remboursements professionnels ;
• gestion des projets commerciaux et informations associées — base légale : intérêt légitime ;
• sécurité, prévention de la fraude et des accès non autorisés — base légale : intérêt légitime / obligation légale ;
• obligations légales et comptables — base légale : obligation légale (notamment Code de commerce et Code général des impôts) ;
• amélioration du service — base légale : intérêt légitime, dans la limite de la proportionnalité.

5. Notifications

L’Application peut envoyer des notifications in-app (et, le cas échéant, push iOS / Android) concernant l’état de vos notes de frais (validation, rejet, demande d’information). Vous pouvez désactiver les notifications push depuis les Réglages de votre appareil.

6. Destinataires

Les données ne sont accessibles qu’aux personnes autorisées :
• vous-même pour vos propres données ;
• votre hiérarchie / la finance / l’administration de l’Éditeur, dans la limite de leurs rôles respectifs (Row-Level Security en base de données) ;
• les sous-traitants techniques listés ci-dessous, agissant sur instruction de l’Éditeur.

7. Sous-traitants techniques

• {{hostName}} ({{hostWebsite}}) — authentification, base de données et stockage des justificatifs, en région de l’Union européenne.
• Vercel Inc. (https://vercel.com) — hébergement du site web public (pages légales, interface gestion).
• Google LLC / Google Gemini (https://ai.google.dev) — extraction des informations de tickets par intelligence artificielle (analyse d’image). L’image transite via une fonction côté serveur de l’Éditeur ; le prestataire ne conserve pas vos justificatifs au-delà du temps de l’analyse, conformément à sa politique de rétention.
• Apple Inc. / Google LLC — distribution de l’application via App Store / Google Play (pas d’accès au contenu de vos notes).

8. Localisation et transferts hors UE

Les données métier (notes de frais, justificatifs, comptes) sont stockées sur des serveurs situés dans l’Union européenne. Certains prestataires (Google Gemini, Apple, Google) peuvent être situés aux États-Unis ; les transferts éventuels sont encadrés par les clauses contractuelles types de la Commission européenne ou un mécanisme équivalent prévu par le RGPD.

9. Durées de conservation

• Compte actif : tant que vous êtes salarié / collaborateur autorisé.
• Justificatifs et notes de frais : durée requise par les obligations légales et comptables (jusqu’à 10 ans pour les pièces comptables, conformément à l’article L123-22 du Code de commerce).
• Journaux de connexion et de sécurité : 12 mois maximum.
• Données après suppression de compte : voir section 11.

10. Vos droits (RGPD)

Vous disposez à tout moment des droits suivants : accès, rectification, effacement (« droit à l’oubli »), limitation, opposition, portabilité, et définition de directives post-mortem (loi Informatique et Libertés). Pour exercer un droit ou obtenir des informations, écrivez à {{contactEmail}}. En cas de désaccord, vous pouvez introduire une réclamation auprès de la CNIL : www.cnil.fr.

Retrait du consentement : lorsqu’un traitement repose sur le consentement, vous pouvez le retirer à tout moment sans que cela affecte la licéité du traitement effectué avant ce retrait.

11. Suppression de votre compte (Apple Guideline 5.1.1(v))

Vous pouvez supprimer votre compte directement depuis l’Application :
1. Ouvrez l’onglet « Réglages ».
2. Appuyez sur « Supprimer mon compte » dans la section « Compte et données ».
3. Confirmez la suppression définitive.

Lors de la suppression :
• Votre compte d’authentification est supprimé immédiatement.
• Les justificatifs (images) que vous avez stockés dans votre espace personnel du bucket sont effacés.
• Les notes de frais que vous avez créées sont supprimées, sous réserve des obligations légales et comptables : si une note a déjà été validée et intégrée à la comptabilité de l’Éditeur, l’entrée comptable est conservée pour la durée légale (jusqu’à 10 ans), de manière dissociée de votre identité lorsque techniquement possible (anonymisation du champ « relecteur », etc.).
• Vous ne pourrez plus vous reconnecter avec cette adresse e-mail sans nouvelle inscription validée par l’Éditeur.

Vous pouvez également écrire à {{contactEmail}} pour demander la suppression manuelle ou poser toute question sur ce processus.

12. Sécurité

Les mots de passe ne sont jamais stockés en clair : ils sont hachés par {{hostName}} via des algorithmes éprouvés. Les échanges entre l’application et les serveurs sont chiffrés via TLS. La base de données applique des règles d’accès par ligne (Row-Level Security) garantissant qu’un employé ne voit que ses propres notes, et que seuls les rôles « manager » / « finance » accèdent aux notes des autres.

13. Cookies et stockage local

Application mobile : aucun cookie tiers. La session d’authentification est stockée localement via le coffre sécurisé du système d’exploitation (Keychain iOS / Keystore Android via AsyncStorage chiffré).

Site web : aucun cookie publicitaire ni cookie de mesure d’audience tiers. Le navigateur stocke uniquement votre session d’authentification (localStorage) et vos préférences (langue) ; ces éléments sont supprimés à la déconnexion.

14. Modifications

L’Éditeur peut mettre à jour cette politique pour refléter des évolutions techniques ou légales. La date de dernière mise à jour est indiquée ci-dessous : {{documentsLastUpdated}}. En cas de modification substantielle, les utilisateurs actifs sont informés via l’Application.

15. Contact

Pour toute question relative à cette politique ou à vos données : {{contactEmail}}.`;

const termsBody = `Les présentes conditions générales d’utilisation (« CGU ») régissent l’accès et l’utilisation du service « {{tradeName}} » (l’« Application »), couvrant l’application mobile (iOS / Android) et le site web associé, édités par {{companyName}} ({{contactEmail}}).

1. Acceptation

L’utilisation de l’Application implique l’acceptation pleine et entière des présentes CGU et de la politique de confidentialité. Si vous n’acceptez pas ces conditions, n’utilisez pas l’Application.

2. Compte utilisateur

Vous devez fournir des informations exactes lors de l’inscription. Vous êtes responsable de la confidentialité de vos identifiants et de toute action effectuée depuis votre compte. Tout compte est créé ou validé par l’Éditeur. L’Éditeur peut suspendre ou supprimer un compte en cas de violation grave des CGU ou de risque pour la sécurité du système.

3. Suppression de votre compte

Conformément à la Guideline 5.1.1(v) de l’App Store, vous pouvez supprimer votre compte à tout moment depuis l’onglet « Réglages » → « Supprimer mon compte ». Les conséquences techniques et juridiques sont détaillées dans la section 11 de la politique de confidentialité.

4. Usage autorisé

L’Application est strictement réservée aux salariés et collaborateurs autorisés de l’Éditeur, dans le cadre de la gestion interne des notes de frais et des informations associées. Vous vous engagez à :
• ne pas porter atteinte à la sécurité ou à l’intégrité des systèmes ;
• ne pas contourner les contrôles d’accès, RLS, limitations de rôles ;
• ne pas introduire de contenus illicites, malveillants, frauduleux ou contraires aux droits de tiers ;
• ne pas utiliser l’Application à des fins étrangères au cadre professionnel autorisé ;
• ne pas extraire massivement les données par des moyens automatisés.

5. Vos contenus

Vous demeurez propriétaire des données et justificatifs que vous saisissez. Vous garantissez disposer des droits nécessaires sur les pièces jointes (notamment droit à l’image, droits d’auteur). Vous concédez à l’Éditeur une licence non exclusive, limitée à la durée du service et au territoire de mise à disposition, à seule fin d’héberger, sauvegarder, traiter et restituer ces contenus dans le cadre du service.

6. Services tiers

L’Application s’appuie sur des prestataires techniques (hébergement, authentification, distribution App Store / Google Play, analyse IA des justificatifs). Leur usage est détaillé dans la politique de confidentialité et soumis à leurs propres conditions d’utilisation.

7. Disponibilité

L’Éditeur vise une disponibilité raisonnable mais ne garantit pas l’absence d’interruption. Des opérations de maintenance peuvent entraîner des coupures temporaires. L’Éditeur n’est pas responsable des indisponibilités résultant des prestataires tiers ou de cas de force majeure.

8. Propriété intellectuelle

L’interface, les marques, logos, code et textes de l’Application sont la propriété de l’Éditeur ou de ses licenciés. Aucun droit de propriété intellectuelle n’est cédé du fait de l’utilisation de l’Application, hormis le droit limité d’usage défini par les présentes.

9. Responsabilité

Dans les limites du droit applicable, l’Éditeur n’est pas responsable des dommages indirects ou pertes de données résultant d’un cas de force majeure, d’une faute de l’utilisateur ou d’un tiers. La responsabilité totale de l’Éditeur, si elle est engagée, sera limitée aux montants habituellement admis pour ce type de services professionnels internes, sauf faute lourde ou dol.

10. Notifications et communications

L’Éditeur peut vous adresser, dans le cadre du service, des notifications opérationnelles (statut d’une note de frais, demande de complément, alerte de sécurité). Ces communications ne sont pas commerciales et ne nécessitent pas de consentement supplémentaire ; elles peuvent être désactivées au niveau du système d’exploitation pour les notifications push.

11. Résiliation

Vous pouvez cesser d’utiliser l’Application à tout moment et supprimer votre compte (cf. section 3). L’Éditeur peut mettre fin à l’accès en cas de manquement aux CGU, de fin du contrat de travail ou de la relation commerciale.

12. Évolution des CGU

L’Éditeur peut faire évoluer les CGU pour refléter des évolutions techniques, légales ou contractuelles. La poursuite de l’utilisation après notification d’une modification substantielle vaut acceptation.

13. Droit applicable et juridiction

Les présentes CGU sont régies par le droit français. Tout litige relève de la compétence des tribunaux du ressort du siège social de l’Éditeur, sous réserve des règles impératives du droit du travail, du droit de la consommation et du droit de l’Union européenne lorsqu’elles sont applicables.`;

export default {
  sectionTitle: 'Informations légales',
  openMentions: 'Mentions légales',
  openPrivacy: 'Politique de confidentialité',
  openTerms: "Conditions générales d'utilisation",
  footerNotice:
    'Ces documents sont fournis à titre informatif et ne remplacent pas un conseil juridique. Dernière mise à jour : {{documentsLastUpdated}}.',
  documents: {
    mentions: {
      title: 'Mentions légales',
      body: mentionsBody,
    },
    privacy: {
      title: 'Politique de confidentialité',
      body: privacyBody,
    },
    terms: {
      title: "Conditions générales d'utilisation",
      body: termsBody,
    },
  },
};
