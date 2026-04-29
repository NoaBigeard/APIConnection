const express = require("express");
const cors = require("cors");
require("dotenv").config({ path: "./.env" });
const { generateServiceFiles } = require("./Utils/template");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

generateServiceFiles().then(() => {
  const utilisateurRoutes = require("./Routes/utilisateur");
  app.use("/utilisateur", utilisateurRoutes);

  app.listen(PORT, () => {
    console.log(`Serveur lancé sur http://localhost:${PORT}`);
  });
});
