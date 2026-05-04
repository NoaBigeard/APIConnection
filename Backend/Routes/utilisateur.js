const express = require("express");
const router = express.Router();
const utilisateurController = require("../Controller/utilisateur.controller");
const { authMiddleware } = require("../Middleware/auth.middleware");
const { upload } = require("../Utils/upload");

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

// ######################## AWS upload ########################
router.post(
  "/upload",
  authMiddleware(10),
  upload.single("file"),
  utilisateurController.uploadAWSController,
);

router.post(
  "/:table/insert",
  authMiddleware(50),
  utilisateurController.insertTableController,
);

router.patch(
  "/:table/:id/update",
  authMiddleware(50),
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
router.get(
  "/:table",
  authMiddleware(10),
  utilisateurController.getTableController,
);
router.get(
  "/:table/:id",
  authMiddleware(10),
  utilisateurController.getTableController,
);

module.exports = router;
