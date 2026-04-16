/** Textes juridiques (FR) — modèles à faire valider par un professionnel avant mise en production. */

const mentionsBody = `L’application mobile « {{tradeName}} » (l’« Application ») est éditée par {{companyName}}, {{legalForm}}, dont le siège social est situé {{addressLine}}, {{country}} (l’« Éditeur »).

Immatriculation : {{registrationNumber}}. Numéro de TVA intracommunautaire : {{vatNumber}}.

Contact : {{contactEmail}}.

Directeur de la publication : {{publicationDirector}}.

Hébergement des données : le stockage des données personnelles de l’Application est assuré via l’infrastructure du prestataire {{hostName}} ({{hostWebsite}}), dans une région de l’Union européenne conformément au paramétrage du projet. Siège social du prestataire (information réglementaire) : {{hostAddress}}.

Propriété intellectuelle : les éléments de l’Application (textes, interface, marques, logos) sont protégés. Toute reproduction ou représentation non autorisée est interdite.

Réclamations : adressez vos demandes à {{contactEmail}}.

Droit applicable : droit français et, le cas échéant, droit de l’Union européenne. Litiges : tribunaux compétents du ressort du siège social de l’Éditeur, sous réserve des dispositions impératives, notamment en matière de travail.`;

const privacyBody = `La présente politique décrit le traitement des données personnelles dans le cadre de l’Application « {{tradeName}} », éditée par {{companyName}} ({{contactEmail}}), en tant que responsable de traitement. L’Application est réservée aux salariés et collaborateurs autorisés de l’Éditeur.

Données collectées : identifiants de compte (nom, e-mail, rôle professionnel, service le cas échéant), contenus que vous saisissez (notes de frais, montants, fournisseurs, projets, pièces jointes / images de justificatifs), journaux techniques minimaux (connexion, diagnostic) et préférences (ex. langue).

Finalités : création et gestion du compte ; gestion des notes de frais et des workflows internes (validation, export) ; gestion des projets et informations commerciales associées ; sécurité, prévention de la fraude ; amélioration du service ; obligations légales et comptables le cas échéant.

Bases légales : exécution du contrat de travail ou du lien contractuel avec l’Éditeur / mesures précontractuelles ; intérêt légitime (sécurité, amélioration proportionnée) ; obligations légales ; consentement lorsque requis (ex. certaines fonctionnalités optionnelles).

Destinataires : personnel autorisé de l’Éditeur ; sous-traitants techniques, notamment {{hostName}} pour l’hébergement et la base de données ({{hostWebsite}}), dans une région européenne du service.

Localisation et transferts : les données métier sont stockées dans l’Union européenne (paramétrage régional du projet). L’Éditeur ne vise pas de transferts de données personnelles vers des pays situés hors de l’Espace économique européen sans garanties prévues par le RGPD (clauses types de la Commission, décision d’adéquation, etc.). Le siège social du prestataire d’hébergement peut être situé hors UE ; les flux contractuels et techniques sont encadrés pour assurer la conformité.

Analyse par intelligence artificielle : certaines fonctions d’analyse de justificatifs peuvent s’appuyer sur le prestataire Groq. L’Éditeur exige une configuration et des engagements contractuels tels que ces traitements ne donnent pas lieu à des transferts hors EEE sans mécanisme conforme au RGPD. La réalité technique et contractuelle doit être vérifiée lors du déploiement et tenue à jour.

Durées de conservation : pendant la durée de la relation contractuelle / professionnelle, puis durées nécessaires aux obligations légales, comptables et probatoires ; certains journaux de sécurité peuvent être conservés pour une durée limitée.

Vos droits : accès, rectification, effacement, limitation, opposition, portabilité lorsque applicable, et définition de directives post-mortem (selon la loi française). Pour exercer vos droits : {{contactEmail}}. Réclamation auprès de la CNIL (www.cnil.fr).

Sécurité : mesures techniques et organisationnelles appropriées ; les mots de passe sont gérés via le prestataire d’authentification ; les échanges avec les serveurs utilisent le chiffrement TLS lorsque pris en charge par la configuration déployée.

Modifications : l’Éditeur peut mettre à jour cette politique. Dernière mise à jour indiquée à titre de suivi : {{documentsLastUpdated}}.`;

const termsBody = `Les présentes conditions générales d’utilisation (« CGU ») régissent l’accès et l’utilisation de l’Application « {{tradeName}} », éditée par {{companyName}} ({{contactEmail}}).

Acceptation : l’utilisation de l’Application implique l’acceptation des CGU et de la politique de confidentialité.

Compte : vous devez fournir des informations exactes ; vous êtes responsable de la confidentialité de vos identifiants. L’Éditeur peut suspendre ou supprimer un compte en cas de violation grave ou de risque pour la sécurité.

Usage : l’Application est strictement réservée aux salariés et collaborateurs autorisés de l’Éditeur (gestion interne des notes de frais et informations associées). Tout compte est créé ou validé par l’Éditeur. Vous ne devez pas porter atteinte à la sécurité des systèmes, contourner les contrôles d’accès, introduire des contenus illicites ou malwares, ou utiliser l’Application de manière abusive.

Contenus : vous demeurez propriétaire des données que vous saisissez ; vous garantissez disposer des droits nécessaires sur les pièces jointes. Vous concédez à l’Éditeur une licence limitée pour héberger, sauvegarder et traiter ces contenus aux fins du service.

Services tiers : l’Application peut s’appuyer sur des prestataires (hébergement, authentification, etc.). Leur utilisation est soumise à leurs conditions.

Disponibilité : l’Éditeur vise une disponibilité raisonnable mais ne garantit pas l’absence d’interruption ; la maintenance peut entraîner des coupures temporaires.

Responsabilité : dans les limites du droit applicable, l’Éditeur n’est pas responsable des dommages indirects ou pertes de données résultant d’un cas de force majeure, d’une faute de l’utilisateur ou d’un tiers. La responsabilité totale de l’Éditeur, si elle est engagée, sera limitée aux montants habituellement admis pour ce type de services professionnels internes, sauf faute lourde ou dol.

Résiliation : vous pouvez cesser d’utiliser l’Application ; l’Éditeur peut mettre fin à l’accès en cas de manquement aux CGU.

Droit applicable : droit français. Litiges : compétence des tribunaux du ressort du siège social de l’Éditeur, sous réserve des règles impératives du droit du travail et du droit de l’Union européenne lorsque applicables.`;

export default {
  sectionTitle: 'Informations légales',
  openMentions: 'Mentions légales',
  openPrivacy: 'Politique de confidentialité',
  openTerms: "Conditions générales d'utilisation",
  footerNotice:
    'Ces documents sont fournis à titre informatif et ne remplacent pas un conseil juridique. Dernière mise à jour des informations éditeur : {{documentsLastUpdated}}.',
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
