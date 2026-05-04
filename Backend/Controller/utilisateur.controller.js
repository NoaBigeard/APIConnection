const { sendMail } = require("../Utils/mailer");
const { errorLog } = require("../utils/logger");

async function userInscriptionController(req, res) {
  try {
    const usersService = require("../Service/users.service");
    req.body.ip_address = req.ip;
    req.body.user_agent = req.get("user-agent");
    const result = await usersService.userInscriptionService(req.body);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 800;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function inscriptionMailController(req, res) {
  try {
    await sendMail({ mail: req.body.mail, type: "inscription" });
    return res.status(200).json({ message: "Mail envoyé avec succès !" });
  } catch (err) {
    console.error(err);
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(500).json({ message: "Erreur lors de l'envoi du mail" });
  }
}

async function verificationAuthenticateCodeController(req, res) {
  try {
    const usersService = require("../Service/users.service");
    const result = await usersService.verificationAuthenticateCodeService(
      req.body,
    );
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function connectionController(req, res) {
  try {
    const usersService = require("../Service/users.service");
    const result = await usersService.connectionService(req.body);
    console.log("body reçu:", req.body);
    console.log("headers:", req.headers.authorization);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 800;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}
// ######################################################################## User resetPassword ########################################################################
async function resetPasswordController(req, res) {
  try {
    const usersService = require("../Service/users.service");
    const result = await usersService.resetPasswordService(req.body);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 800;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function updatePasswordController(req, res) {
  try {
    const usersService = require("../Service/users.service");
    const { token } = req.params;
    const { newPassword, confirmationNewPassword } = req.body;

    const result = await usersService.updatePasswordService(
      token,
      newPassword,
      confirmationNewPassword,
    );

    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function getMeController(req, res) {
  try {
    const usersService = require("../Service/users.service");
    const result = await usersService.getMeService({
      authHeader: req.headers["authorization"],
    });
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

//######################################################################## Generic method ########################################################################

function capitalize(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

async function insertTableController(req, res) {
  try {
    const table = req.params.table.trim();
    if (table === "users") {
      req.body.ip_address = req.ip;
      req.body.user_agent = req.get("user-agent");
    }
    console.log("table:", req.params.table);
    console.log("body:", req.body);
    const service = require(`../Service/${table}.service.js`);
    const result = await service[`insert${capitalize(table)}Service`](req.body);
    return res.status(201).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function getTableController(req, res) {
  try {
    const table = req.params.table.trim();
    const id = req.params.id || null;
    const { parseQuery } = require("../Utils/helper");
    const query = parseQuery(req);

    const service = require(`../Service/${table}.service.js`);
    const result = id
      ? await service[`get${capitalize(table)}ByIdService`](id, query)
      : await service[`getAll${capitalize(table)}Service`](query);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function softDeleteController(req, res) {
  try {
    const table = req.params.table.trim();
    const id = req.params.id || null;

    if (table === "users" && (!req.user || req.user.access_level < 100)) {
      return res.status(403).json({
        message:
          "Accès refusé : niveau 100 requis pour supprimer un utilisateur",
      });
    }

    const service = require(`../Service/${table}.service.js`);
    const result = await service[`delete${capitalize(table)}Service`](id);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function updateTableController(req, res) {
  try {
    const table = req.params.table.trim();
    const id = req.params.id || null;
    const service = require(`../Service/${table}.service.js`);
    const result = await service[`update${capitalize(table)}Service`](
      id,
      req.body,
      req.user,
    );
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function uploadAWSController(req, res) {
  try {
    const { uploadAWSService } = require("../Utils/upload");
    if (!req.file) throw { status: 400, message: "Aucun fichier envoyé" };
    const result = await uploadAWSService(req.file);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    return res.status(status).json({ message });
  }
}

module.exports = {
  userInscriptionController,
  inscriptionMailController,
  verificationAuthenticateCodeController,
  connectionController,
  resetPasswordController,
  updatePasswordController,
  getMeController,
  getTableController,
  insertTableController,
  softDeleteController,
  updateTableController,
  uploadAWSController,
};
