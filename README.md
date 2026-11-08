# OCD Live

Réservation Next.js 14 en 5 écrans, espace `/admin`, Supabase, Resend, WhatsApp/Twilio, paiements et notifications.

## Installation

1. Créer le projet Supabase.
2. Dans le SQL Editor, exécuter `supabase/schema.sql`, puis pour une base existante exécuter `supabase/payments.sql`.
3. Créer les utilisateurs admin dans Authentication > Users, puis insérer leurs UUID dans `admins`.
4. Copier `.env.example` vers `.env.local` et renseigner les variables.
5. Installer et lancer : `npm install` puis `npm run dev`.
6. Sur Vercel, ajouter les mêmes variables, le domaine dans `NEXT_PUBLIC_SITE_URL`, puis déployer.

La section recrutement et `/api/apply` ont été supprimées. La table `applications` reste intacte dans la base et peut être conservée ou migrée séparément.

## Règle métier des paiements

- Le statut de réservation reste `pending` jusqu'à validation manuelle de l'équipe.
- Les montants affichés et enregistrés proviennent de la table `packages`, côté serveur.
- Le paiement est demandé après acceptation.
- Un paiement en ligne n'est confirmé que par webhook signé. La redirection cliente ne confirme rien.
- Les paiements sont idempotents par couple `provider/provider_ref`.
- `payments` et les preuves Supabase Storage sont réservés aux admins.

## Configuration FedaPay

1. Créer un compte marchand et terminer le KYC.
2. Récupérer les clés API sandbox puis production.
3. Dans le dashboard, ajouter `https://TON-DOMAINE/api/payments/webhook/fedapay`.
4. Définir `FEDAPAY_WEBHOOK_SECRET`, `FEDAPAY_API_KEY` et `FEDAPAY_SECRET`.
5. Vérifier les événements de transaction payée dans le dashboard et tester en sandbox.

## Configuration CinetPay

1. Créer le compte marchand, fournir les pièces KYC et sélectionner les moyens mobiles disponibles.
2. Récupérer `site_id` et les clés API.
3. Ajouter `https://TON-DOMAINE/api/payments/webhook/cinetpay`.
4. Renseigner `CINETPAY_SITE_ID`, `CINETPAY_API_KEY` et `CINETPAY_WEBHOOK_SECRET`.
5. Vérifier un paiement sandbox et observer l'entrée dans `payments`.

Choix UEMOA recommandé : comparer les conditions contractuelles FedaPay/CinetPay (taux, settlement, moyen de retrait, disponibilité T-Money/Flooz), puis utiliser celui proposé le plus favorablement au Togo. Les autres pays africains passent par Flutterwave.

## Configuration Flutterwave

1. Créer le compte marchand et terminer la vérification.
2. Récupérer les clés API du pays cible.
3. Ajouter le webhook `https://TON-DOMAINE/api/payments/webhook/flutterwave`.
4. Définir le même secret `FLUTTERWAVE_WEBHOOK_SECRET` dans Flutterwave et Vercel.
5. Tester une transaction sandbox, puis activer le mode live.

## Configuration PayPal Checkout

1. Créer une application PayPal Business via le portail développeur.
2. Ajouter un webhook dirigé vers `https://TON-DOMAINE/api/payments/webhook/paypal`.
3. Copier son Webhook ID.
4. Renseigner `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`.
5. Utiliser `https://api-m.sandbox.paypal.com` puis l'API production PayPal.
6. Le webhook est vérifié par PayPal à chaque notification.

Carte bancaire internationale : l'activer seulement via l'agrégateur choisi (Flutterwave ou fournisseur conforme) et tenir les clés PCI hors du frontend.

## Virement et espèces

- Le client peut envoyer une preuve JPEG/PNG/WebP/PDF (10 Mo maximum) sur `/api/payments/proof`.
- La preuve est enregistrée dans le bucket privé `payment-proofs`.
- Seuls les admins peuvent lire les preuves.
- Le bouton **Marquer comme payé** ou un webhook valide met le statut à `paid`.
- Chaque paiement confirmé envoie son reçu au client et avertit Bouvann via Telegram/e-mail/WhatsApp selon la configuration `notify.js`.

## Admin

Le filtre **Paiement** affiche les statuts `unpaid`, `processing`, `paid`, `failed` et `refunded`. L'export CSV contient aussi le statut de paiement. Les réglages acompte et taux sont disponibles dans l'onglet Packages.

## Variables nécessaires

Voir `.env.example`. Les clés secrets doivent rester côté serveur et ne jamais être ajoutées à une variable `NEXT_PUBLIC_*`.

## Ce qu'il faut fournir

- Comptes marchands FedaPay/CinetPay, Flutterwave et PayPal.
- Pièces KYC, statuts juridiques, RIB et justificatif de domaine.
- Coordonnées bancaires officielles et nom du bénéficiaire.
- Numéros T-Money/Flooz et politique de retrait.
- E-mails admin, e-mail d'envoi Resend, domaine vérifié.
- Numero WhatsApp Twilio de production et templates approuvés.
- Telegram Bot/Chat ID si conservé.
- Comptes Bouvann, taux de conversion validés et pourcentage d'acompte souhaité.
