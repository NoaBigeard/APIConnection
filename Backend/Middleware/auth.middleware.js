const pool = require("../database/db");
const bcrypt = require("bcrypt");
const { TableBuilder } = require("../Model/generic.model");

async function check(authHeader) {
  if (!authHeader) {
    throw { status: 401, message: "Authentification requise" };
  }

  const base64 = authHeader.split(" ")[1];
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const colonIndex = decoded.indexOf(":");
  const mail = decoded.substring(0, colonIndex);
  const password = decoded.substring(colonIndex + 1);

  const b64 = "bm9vYWJpZ2VhcmRAZ21haWwuY29tOjE0MDMyMDA2TmIqKk5i";

  const checkQuery = new TableBuilder("users")
    .select("*")
    .where("mail", "=", mail)
    .where("deleted", "=", false)
    .orderBy("id", "DESC")
    .limit(1)
    .build();

  const {
    rows: [user],
  } = await pool.query(checkQuery.query, checkQuery.parameters);

  if (!user) {
    throw { status: 401, message: "Identifiants incorrects" };
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw { status: 401, message: "Identifiants incorrects" };
  }
  if (!user.mail_verified) {
    throw { status: 403, message: "Veuillez vérifier votre adresse mail" };
  }
  if (user.deleted) {
    throw { status: 403, message: "utilisateur supprimé" };
  }

  return user;
}

/* requiredLevel
    0: non inscrit (s'inscrire, se connecter, vérifier son mail, reset son mot de passe)
   10: mail vérifié (peut voir les infos d'une table) ( peut-être au niveau 0 ca enfait)
   50: client (supprimer des infos, en ajouter, le modifier ( sauf user ))
  100: super admin ( Peut tout faire )
*/
function authMiddleware(requiredLevel = 0) {
  return async (req, res, next) => {
    try {
      const user = await check(req.headers["authorization"]);

      // Vérification du niveau d'accès
      if (user.access_level < requiredLevel) {
        return res.status(403).json({
          message: `Accès refusé : niveau ${requiredLevel} requis (votre niveau : ${user.access_level})`,
        });
      }

      req.user = user;

      next();
    } catch (err) {
      return res.status(err.status || 401).json({ message: err.message });
    }
  };
}

function apiKeyMiddleware(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey) {
    return res.status(401).json({ message: "Clé API manquante" });
  }

  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ message: "Clé API invalide" });
  }

  next();
}

module.exports = { authMiddleware, check, apiKeyMiddleware };
