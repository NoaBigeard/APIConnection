const express = require("express");
const router = express.Router();
const utilisateurController = require("../Controller/utilisateur.controller");
const stripeController = require("../Controller/stripe.controller");
const { authMiddleware } = require("../Middleware/auth.middleware");
const { upload } = require("../Utils/upload");

//Stripe ##################################################################################################
router.get(
  "/session-status",
  authMiddleware(10),
  stripeController.sessionStatusController,
);
router.get(
  "/subscription-plans",
  authMiddleware(10),
  stripeController.getSubscriptionPlansController,
);
router.post(
  "/customer-portal",
  authMiddleware(10),
  stripeController.customerPortalController,
);
router.post(
  "/create-checkout-session",
  authMiddleware(10),
  stripeController.createCheckoutSessionController,
);
router.post(
  "/create-subscription-checkout",
  authMiddleware(10),
  stripeController.createSubscriptionCheckout,
);

//Cart ##################################################################################################
router.get(
  "/carts/active",
  authMiddleware(10),
  utilisateurController.getActiveCartController,
);
router.post(
  "/carts/insert",
  authMiddleware(10),
  utilisateurController.addToCartController,
);
router.post(
  "/carts/delete",
  authMiddleware(10),
  utilisateurController.removeFromCart,
);
router.post(
  "/carts/clear",
  authMiddleware(10),
  utilisateurController.clearCartController,
);

//Inscription/connection ##################################################################################################

router.post("/inscription", utilisateurController.userInscriptionController);
//Peut-être plus nécessaire maintenant vu que la route /inscription l'utilise
router.post(
  "/inscriptionMail",
  utilisateurController.inscriptionMailController,
);
router.post(
  "/verifyMail",
  utilisateurController.verificationAuthenticateCodeController,
);
// router.get("/getUser", utilisateurController.getUserController);
router.post("/connection", utilisateurController.connectionController);

router.post("/resetPassword", utilisateurController.resetPasswordController);
router.patch(
  "/updatePassword/:token",
  utilisateurController.updatePasswordController,
);

//Table ##################################################################################################
router.patch(
  "/articles/:id/update/photos",
  authMiddleware(50),
  upload.array("photos", 5),
  utilisateurController.addPhotosController,
);

router.patch(
  "/articles/:id/restore",
  authMiddleware(10),
  utilisateurController.restoreController,
);

router.post(
  "/:table/insert",
  authMiddleware(50),
  upload.array("photos", 5),
  utilisateurController.insertTableController,
);

router.patch(
  "/:table/:id/update",
  authMiddleware(10),
  upload.array("photos", 5),
  utilisateurController.updateTableController,
);

router.patch(
  "/:table/delete",
  authMiddleware(50),
  utilisateurController.softDeleteController,
);

router.patch(
  "/:table/:id/delete",
  authMiddleware(50),
  utilisateurController.softDeleteController,
);

//Les dernières
router.get("/getMe", authMiddleware(10), utilisateurController.getMeController);

router.get("/:table", utilisateurController.getTableController);
router.get(
  "/:table/:uuid([0-9a-fA-F-]{36})",
  utilisateurController.getTableController,
);
router.get("/:table/:id(\\d+)", utilisateurController.getTableController);

module.exports = router;
