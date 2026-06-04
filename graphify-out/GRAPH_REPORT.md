# Graph Report - C:/IUT/StageS4/APIConnection  (2026-06-02)

## Corpus Check
- Corpus is ~18,951 words - fits in a single context window. You may not need a graph.

## Summary
- 535 nodes · 903 edges · 46 communities (31 shown, 15 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.86)
- Token cost: 174,239 input · 43,559 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Stripe Checkout & Payments|Stripe Checkout & Payments]]
- [[_COMMUNITY_Data Services & SQL Schema|Data Services & SQL Schema]]
- [[_COMMUNITY_Server Bootstrap & Middleware|Server Bootstrap & Middleware]]
- [[_COMMUNITY_Auth & Business Concepts|Auth & Business Concepts]]
- [[_COMMUNITY_Users Service & Auth|Users Service & Auth]]
- [[_COMMUNITY_Project Dependencies|Project Dependencies]]
- [[_COMMUNITY_DB Init & Connection|DB Init & Connection]]
- [[_COMMUNITY_Articles & Photos Services|Articles & Photos Services]]
- [[_COMMUNITY_TableBuilder Query Builder|TableBuilder Query Builder]]
- [[_COMMUNITY_Photos Service|Photos Service]]
- [[_COMMUNITY_Categories Service|Categories Service]]
- [[_COMMUNITY_Discount Code Service|Discount Code Service]]
- [[_COMMUNITY_Colors Service|Colors Service]]
- [[_COMMUNITY_Orders Service|Orders Service]]
- [[_COMMUNITY_Cart Items Service|Cart Items Service]]
- [[_COMMUNITY_Carts Service|Carts Service]]
- [[_COMMUNITY_Comments Service|Comments Service]]
- [[_COMMUNITY_Configurations Service|Configurations Service]]
- [[_COMMUNITY_Favorites Service|Favorites Service]]
- [[_COMMUNITY_Sizes Service|Sizes Service]]
- [[_COMMUNITY_InsertUpdate Methods|Insert/Update Methods]]
- [[_COMMUNITY_Social Icons Sprite|Social Icons Sprite]]
- [[_COMMUNITY_Helper Utils|Helper Utils]]
- [[_COMMUNITY_Email Verification Frontend|Email Verification Frontend]]
- [[_COMMUNITY_Hero Banner Imagery|Hero Banner Imagery]]
- [[_COMMUNITY_Favicon Branding|Favicon Branding]]
- [[_COMMUNITY_Access Logging|Access Logging]]
- [[_COMMUNITY_Vite Build Tool|Vite Build Tool]]
- [[_COMMUNITY_VSCode Extensions|VSCode Extensions]]
- [[_COMMUNITY_Vue.js Framework|Vue.js Framework]]
- [[_COMMUNITY_Stripe Controller|Stripe Controller]]
- [[_COMMUNITY_Utilisateur Controller|Utilisateur Controller]]
- [[_COMMUNITY_Auth Middleware|Auth Middleware]]
- [[_COMMUNITY_Connection Service|Connection Service]]
- [[_COMMUNITY_Password Update Service|Password Update Service]]
- [[_COMMUNITY_Helper File|Helper File]]
- [[_COMMUNITY_parseQuery|parseQuery]]
- [[_COMMUNITY_Logger Utils|Logger Utils]]
- [[_COMMUNITY_Mailer (Brevo)|Mailer (Brevo)]]
- [[_COMMUNITY_Template  cleanFields|Template / cleanFields]]
- [[_COMMUNITY_README|README]]

## God Nodes (most connected - your core abstractions)
1. `cleanFields()` - 86 edges
2. `addUuidIfNeeded()` - 32 edges
3. `TableBuilder` - 31 edges
4. `errorLog()` - 22 edges
5. `check()` - 17 edges
6. `PostgreSQL Pool` - 15 edges
7. `TableBuilder (SQL query builder)` - 14 edges
8. `Configurations Service` - 11 edges
9. `cleanFields` - 10 edges
10. `createCheckoutSessionByTypeController()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `userInscriptionService` --implements--> `Email Two-Factor Authentication Code`  [INFERRED]
  Backend/Service/users.service.js → Ce qu'il faut faire.txt
- `Project Requirements / TODO Spec` --references--> `Soft-delete (deleted flag) pattern`  [EXTRACTED]
  Ce qu'il faut faire.txt → Backend/Database/createTable.sql
- `getCartCheckoutDetails` --shares_data_with--> `Stripe Checkout`  [INFERRED]
  Backend/Service/users.service.js → Ce qu'il faut faire.txt
- `deleteUsersService` --implements--> `Access Level Authorization`  [INFERRED]
  Backend/Service/users.service.js → Ce qu'il faut faire.txt
- `checkPermission` --implements--> `Access Level Authorization`  [INFERRED]
  Backend/Utils/helper.js → Ce qu'il faut faire.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Stripe checkout session creation flow** — stripe_createCheckoutSessionByType, users_service, utilisateur_getActiveCartForUser, stripe_getCartLineItems, utilisateur_getCartDetails [EXTRACTED 1.00]
- **Post-payment user/address/order sync** — stripe_sessionStatusController, users_service, stripe_upsertCheckoutAddress, stripe_upsertCheckoutOrder, configuration_getConfigurationModel [EXTRACTED 1.00]
- **Generic CRUD stack (builder + pool + dynamic dispatch)** — generic_TableBuilder, db_pool, concept_dynamic_service_dispatch, utilisateur_getTableController [INFERRED 0.85]
- **User Inscription with Email 2FA Code** — users_userInscriptionService, mailer_sendMail, configurations_service, concept_two_factor_auth [INFERRED 0.75]
- **Auto Service File Generation** — template_generateServiceFiles, template_generateTemplate, concept_service_generation [INFERRED 0.75]
- **Standard CRUD Service Pattern** — configurations_service, discountcode_service, template_generateTemplate [INFERRED 0.75]

## Communities (46 total, 15 thin omitted)

### Community 0 - "Stripe Checkout & Payments"
Cohesion: 0.05
Nodes (62): buildStripeLineItem(), { cleanFields }, createCheckoutSessionByTypeController(), createCheckoutSessionController(), createSubscriptionCheckout(), { errorLog }, {
  getActiveCartForUser,
  getCartDetails,
}, getCartLineItems() (+54 more)

### Community 1 - "Data Services & SQL Schema"
Cohesion: 0.10
Nodes (38): Addresses Service, Articles Service, check (basic-auth verifier), Cart Items Service, Carts Service, Categories Service, Colors Service, Comments Service (+30 more)

### Community 2 - "Server Bootstrap & Middleware"
Cohesion: 0.07
Nodes (30): apiKeyMiddleware, authMiddleware (access-level guard), { accessLog }, { apiKeyMiddleware }, app, cors, express, { generateServiceFiles } (+22 more)

### Community 3 - "Auth & Business Concepts"
Cohesion: 0.09
Nodes (33): Access Level Authorization, HTTP Basic Auth, Integer Price Storage (x100), Auto Service File Generation from DB Tables, Stripe Checkout, Email Two-Factor Authentication Code, Configurations Service, Discount Code Service (+25 more)

### Community 4 - "Users Service & Auth"
Cohesion: 0.08
Nodes (25): bcrypt, { check }, { checkPermission }, { cleanFields }, evaluatePassword(), getAllUsersService(), getCartCheckoutDetails(), getCode() (+17 more)

### Community 5 - "Project Dependencies"
Cohesion: 0.07
Nodes (29): dependencies, aws-sdk, @aws-sdk/client-s3, bcrypt, bucket, cors, dotenv, express (+21 more)

### Community 6 - "DB Init & Connection"
Cohesion: 0.08
Nodes (19): { Pool }, createTables, fs, insertDatas, path, pool, pool, { addUuidIfNeeded } (+11 more)

### Community 7 - "Articles & Photos Services"
Cohesion: 0.08
Nodes (22): addPhotosController(), uploadAWSController(), addPhotosService(), { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllArticlesService() (+14 more)

### Community 8 - "TableBuilder Query Builder"
Cohesion: 0.08
Nodes (13): TableBuilder, { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllMailService(), getMailByIdService(), insertMailService() (+5 more)

### Community 9 - "Photos Service"
Cohesion: 0.09
Nodes (21): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllPhotosService(), getPhotosByIdService(), insertPhotosService(), pool (+13 more)

### Community 10 - "Categories Service"
Cohesion: 0.13
Nodes (13): check(), { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllCategoriesService(), getCategoriesByIdService(), pool (+5 more)

### Community 11 - "Discount Code Service"
Cohesion: 0.14
Nodes (12): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllDiscountcodeService(), getDiscountcodeByIdService(), insertDiscountcodeService(), pool (+4 more)

### Community 12 - "Colors Service"
Cohesion: 0.14
Nodes (12): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllColorsService(), getColorsByIdService(), insertColorsService(), pool (+4 more)

### Community 13 - "Orders Service"
Cohesion: 0.14
Nodes (12): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllOrdersService(), getOrdersByIdService(), pool, {
  sendMailInscription,
  sendMailResetPassword,
} (+4 more)

### Community 14 - "Cart Items Service"
Cohesion: 0.14
Nodes (12): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllCart_itemsService(), getCart_itemsByIdService(), insertCart_itemsService(), pool (+4 more)

### Community 15 - "Carts Service"
Cohesion: 0.15
Nodes (11): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllCartsService(), getCartsByIdService(), pool, {
  sendMailInscription,
  sendMailResetPassword,
} (+3 more)

### Community 16 - "Comments Service"
Cohesion: 0.15
Nodes (11): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllCommentsService(), getCommentsByIdService(), pool, {
  sendMailInscription,
  sendMailResetPassword,
} (+3 more)

### Community 17 - "Configurations Service"
Cohesion: 0.15
Nodes (11): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllConfigurationsService(), getConfigurationsByIdService(), pool, {
  sendMailInscription,
  sendMailResetPassword,
} (+3 more)

### Community 18 - "Favorites Service"
Cohesion: 0.15
Nodes (11): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllFavoritesService(), getFavoritesByIdService(), pool, {
  sendMailInscription,
  sendMailResetPassword,
} (+3 more)

### Community 19 - "Sizes Service"
Cohesion: 0.15
Nodes (11): { addUuidIfNeeded }, bcrypt, { check }, { cleanFields }, getAllSizesService(), getSizesByIdService(), pool, {
  sendMailInscription,
  sendMailResetPassword,
} (+3 more)

### Community 20 - "Insert/Update Methods"
Cohesion: 0.33
Nodes (11): insertArticlesService(), updateArticlesService(), insertCartsService(), insertCategoriesService(), insertCommentsService(), insertConfigurationsService(), insertFavoritesService(), insertOrdersService() (+3 more)

### Community 21 - "Social Icons Sprite"
Cohesion: 0.43
Nodes (7): Bluesky Icon, Discord Icon, Documentation Icon, GitHub Icon, Social Icon, Icons SVG Sprite Sheet, X (Twitter) Icon

### Community 22 - "Helper Utils"
Cohesion: 0.40
Nodes (4): getTableColumns(), parseQuery(), pool, { v4: uuidv4 }

### Community 23 - "Email Verification Frontend"
Cohesion: 0.50
Nodes (3): App.vue (Email Verification Page), Frontend main.js, verificationAuthenticateCodeService

### Community 24 - "Hero Banner Imagery"
Cohesion: 0.50
Nodes (4): Layer Connection Metaphor, Hero Banner Image, Purple Accent Branding, Stacked 3D Layers Motif

### Community 25 - "Favicon Branding"
Cohesion: 1.00
Nodes (3): APIConnection Frontend Branding, Lightning Bolt Favicon, Vite Logo

## Knowledge Gaps
- **254 isolated node(s):** `recommendations`, `{ sendMail }`, `{ errorLog }`, `{ stripeClient }`, `{
  getActiveCartForUser,
  getCartDetails,
}` (+249 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cleanFields()` connect `Insert/Update Methods` to `Stripe Checkout & Payments`, `Users Service & Auth`, `DB Init & Connection`, `Articles & Photos Services`, `TableBuilder Query Builder`, `Photos Service`, `Categories Service`, `Discount Code Service`, `Colors Service`, `Orders Service`, `Cart Items Service`, `Carts Service`, `Comments Service`, `Configurations Service`, `Favorites Service`, `Sizes Service`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `insertTableController (dynamic dispatch)` connect `Data Services & SQL Schema` to `Server Bootstrap & Middleware`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `Users Service (referenced)` connect `Data Services & SQL Schema` to `Auth & Business Concepts`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `recommendations`, `{ sendMail }`, `{ errorLog }` to the rest of the system?**
  _254 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Stripe Checkout & Payments` be split into smaller, more focused modules?**
  _Cohesion score 0.0525879917184265 - nodes in this community are weakly interconnected._
- **Should `Data Services & SQL Schema` be split into smaller, more focused modules?**
  _Cohesion score 0.09581646423751687 - nodes in this community are weakly interconnected._
- **Should `Server Bootstrap & Middleware` be split into smaller, more focused modules?**
  _Cohesion score 0.07130124777183601 - nodes in this community are weakly interconnected._