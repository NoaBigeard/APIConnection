const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: "./.env" });
const { generateServiceFiles } = require("./Utils/template");
const { initAllowedTables } = require("./Model/generic.model");
const { apiKeyMiddleware } = require("./Middleware/auth.middleware");
const { accessLog } = require("./utils/logger");
//Stripe
const stripe = require("stripe")(process.env.STRIPE_API_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = `http://localhost:${PORT}`;

app.use(express.static("public"));
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

Promise.all([initAllowedTables(), generateServiceFiles()]).then(() => {
  const utilisateurRoutes = require("./Routes/utilisateur");
  app.use(apiKeyMiddleware);
  app.use(accessLog);
  app.use("/utilisateur", utilisateurRoutes);
  app.listen(PORT, () => {
    console.log(`Serveur lancé sur ${DOMAIN} + Stripe`);
  });
});
