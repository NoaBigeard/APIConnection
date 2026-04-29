const pool = require("../database/db");
const bcrypt = require("bcrypt");
const { TableBuilder } = require("../Model/generic.model");

async function check(authHeader) {
  if (!authHeader) {
    throw { status: 401, message: "Authentification requise" };
  }

  const base64 = authHeader.split(" ")[1];
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const [mail, password] = decoded.split(":");

  const checkQuery = new TableBuilder("users")
    .select("*")
    .where("mail", "=", mail)
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
module.exports = { authMiddleware, check };
