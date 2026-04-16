/** Legal texts (EN) — aligned with DABAR SAS; have counsel review before release. */

const mentionsBody = `The mobile application “{{tradeName}}” (the “App”) is published by {{companyName}}, a French {{legalForm}}, with its registered office at {{addressLine}}, {{country}} (the “Publisher”).

Registration: {{registrationNumber}}. VAT number: {{vatNumber}}.

Contact: {{contactEmail}}.

Publication director: {{publicationDirector}}.

Hosting: personal data for the App is processed using {{hostName}} infrastructure ({{hostWebsite}}) in a European Union region as configured for the project. The provider’s registered office (regulatory disclosure): {{hostAddress}}.

Intellectual property: App materials (text, UI, trademarks, logos) are protected. Any unauthorized reproduction is prohibited.

Complaints: please contact {{contactEmail}}.

Governing law: French law and, where applicable, EU law. Disputes: courts with jurisdiction over the Publisher’s registered office, subject to mandatory rules (including employment law where applicable).`;

const privacyBody = `This policy describes how personal data is processed in the “{{tradeName}}” App, published by {{companyName}} ({{contactEmail}}), as data controller. The App is reserved for employees and authorized collaborators of the Publisher.

Data collected: account identifiers (name, email, professional role, department where applicable), content you enter (expense reports, amounts, suppliers, projects, attachments / receipt images), minimal technical logs (sign-in, diagnostics), and preferences (e.g. language).

Purposes: account creation and administration; expense management and internal workflows (approval, export); project and related commercial information; security and fraud prevention; service improvement; legal and accounting obligations where applicable.

Legal bases: employment or contractual relationship with the Publisher / pre-contractual measures; legitimate interests (security, proportionate improvements); legal obligations; consent where required (e.g. certain optional features).

Recipients: authorized Publisher staff; technical subprocessors, including {{hostName}} for hosting and database services ({{hostWebsite}}) in a European region of the service.

Location and transfers: operational data is stored in the European Union (regional project settings). The Publisher does not intend to transfer personal data to countries outside the European Economic Area without GDPR safeguards (standard contractual clauses, adequacy decisions, etc.). The hosting provider’s corporate seat may be outside the EU; contractual and technical measures are in place to support compliance.

Artificial intelligence: some receipt analysis features may rely on the provider Groq. The Publisher requires configuration and contractual commitments such that processing does not result in transfers outside the EEA without a GDPR-compliant mechanism. Technical and contractual reality should be verified at deployment and kept up to date.

Retention: for the duration of the employment or professional relationship, then as required for legal, accounting and evidential purposes; certain security logs may be kept for a limited period.

Your rights: access, rectification, erasure, restriction, objection, portability where applicable, and instructions for the processing of your data after death (where French law applies). To exercise your rights: {{contactEmail}}. You may lodge a complaint with a supervisory authority (in France: CNIL).

Security: appropriate technical and organizational measures; passwords are managed via the authentication provider; communications with servers use TLS encryption where supported by the deployed configuration.

Changes: the Publisher may update this policy. Last update of publisher-facing information (tracking): {{documentsLastUpdated}}.`;

const termsBody = `These Terms of Use (“Terms”) govern access to and use of the “{{tradeName}}” App published by {{companyName}} ({{contactEmail}}).

Acceptance: using the App means you accept these Terms and the Privacy Policy.

Account: you must provide accurate information and keep your credentials confidential. The Publisher may suspend or delete an account in case of serious breach or security risk.

Use: the App is strictly for employees and authorized collaborators of the Publisher (internal expense management and related information). Accounts are created or approved by the Publisher. You must not harm system security, bypass access controls, upload unlawful content or malware, or misuse the App.

Content: you remain the owner of data you submit; you warrant you have the rights needed for attachments. You grant the Publisher a limited license to host, back up and process that content to provide the service.

Third-party services: the App may rely on providers (hosting, authentication, etc.), subject to their terms.

Availability: the Publisher aims for reasonable availability but does not guarantee uninterrupted service; maintenance may cause temporary outages.

Liability: to the extent permitted by law, the Publisher is not liable for indirect damages or data loss due to force majeure, user or third-party fault. Total liability, if any, is limited as commonly accepted for this type of internal professional tool, except in cases of gross negligence or willful misconduct.

Termination: you may stop using the App; the Publisher may end access for breach of these Terms.

Governing law: French law. Disputes: courts with jurisdiction over the Publisher’s registered office, subject to mandatory rules of employment law and EU law where applicable.`;

export default {
  sectionTitle: 'Legal information',
  openMentions: 'Legal notice',
  openPrivacy: 'Privacy policy',
  openTerms: 'Terms of use',
  footerNotice:
    'These documents are for information only and do not replace legal advice. Last update of publisher information: {{documentsLastUpdated}}.',
  documents: {
    mentions: {
      title: 'Legal notice',
      body: mentionsBody,
    },
    privacy: {
      title: 'Privacy policy',
      body: privacyBody,
    },
    terms: {
      title: 'Terms of use',
      body: termsBody,
    },
  },
};
