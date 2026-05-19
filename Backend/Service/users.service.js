const pool = require("../database/db");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const { TableBuilder } = require("../Model/generic.model");
const { cleanFields } = require("../Utils/template");
const { check } = require("../Middleware/auth.middleware");
const utilisateurModel = require("../Model/utilisateur.model");
const { sendMail } = require("../Utils/mailer");
const { checkPermission } = require("../Utils/helper");

//console.log("Dans le fichier users")
// ######################################################################## INSERT ########################################################################
async function insertUsersService(data) {
  if (!data.uuid) data.uuid = uuidv4();
  if (data.password) {
    data.password = await bcrypt.hash(data.password, 10);
  }
  const insertQuery = new TableBuilder("users").insert(data).build();
  const result = await pool.query(insertQuery.query, insertQuery.parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## GET ALL ########################################################################
async function getAllUsersService({
  limit,
  offset,
  orderBy,
  orderAttr,
  fields,
  filter,
} = {}) {
  const builder = new TableBuilder("users").select("*");

  if (fields) builder.select(fields.join(", "));

  if (filter) {
    const [column, operator, value] = filter;
    const operatorList = {
      gt: ">",
      lt: "<",
      ge: ">=",
      le: "<=",
      eq: "=",
      neq: "!=",
    };
    builder.where(column, operatorList[operator] || "=", value);
    builder.where("deleted", "=", false);
  } else {
    builder.where("deleted", "=", false);
  }

  builder
    .limit(limit || 10)
    .offset(offset || 0)
    .orderBy(orderBy || "id", orderAttr || "ASC");

  const { query, parameters } = builder.build();
  const result = await pool.query(query, parameters);
  return cleanFields(result.rows);
}

// ######################################################################## GET ONE  ########################################################################
async function getUsersByIdService(id, { fields } = {}) {
  const builder = new TableBuilder("users").select("*");

  if (fields) builder.select(fields.join(", "));

  builder.where("id", "=", id).where("deleted", "=", false);

  const { query, parameters } = builder.build();
  const result = await pool.query(query, parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## UPDATE ########################################################################
async function updateUsersService(id, data, requestingUser) {
  checkPermission(requestingUser, parseInt(id));

  const query = new TableBuilder("users")
    .update(data)
    .where("id", "=", id)
    .build();

  const result = await pool.query(query.query, query.parameters);
  return cleanFields(result.rows[0]);
}

//######################################################################## SOFT DELETE ########################################################################
async function deleteUsersService(id) {
  const queryUser = new TableBuilder("users")
    .select("access_level")
    .where("id", "=", id)
    .limit(1)
    .build();
  const {
    rows: [user],
  } = await pool.query(queryUser.query, queryUser.parameters);

  if (!user) {
    throw { status: 404, message: "Utilisateur introuvable" };
  }

  if (user.access_level >= 100)
    throw {
      status: 403,
      message: "Vous ne pouvez pas supprimer un super administrateur",
    };

  const builder = new TableBuilder("users").update({ deleted: true });

  if (id) {
    builder.where("id", "=", id).where("deleted", "=", false);
  } else {
    builder.where("deleted", "=", false);
  }

  const query = builder.build();
  const result = await pool.query(query.query, query.parameters);

  if (id && result.rows.length === 0) {
    throw { status: 404, message: "Utilisateur introuvable" };
  }

  return {
    message: id
      ? `L'élément avec l'id ${id} de la table users a bien été supprimé`
      : `${result.rows.length} éléments de la table users ont bien été supprimés`,
  };
}

function getCode(length) {
  let max = Number("1".padEnd(length + 1, 0));
  return `${Math.floor(Math.random() * max)}`.padStart(length, 0);
}

function evaluatePassword(password) {
  const checks = {
    length: password.length >= 12,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
    "no-repeat": !/(.)\1{2,}/.test(password),
  };

  return { checks };
}

async function userInscriptionService(user) {
  const mail = user.mail;
  const password = user.password;
  const { checks } = evaluatePassword(password);
  if (!checks.length) {
    throw {
      status: 400,
      message: "Le mot de passe doit contenir au moins 12 caractères",
    };
  }

  if (!checks.lowercase) {
    throw {
      status: 400,
      message: "Le mot de passe doit contenir au moins une minuscule",
    };
  }

  if (!checks.uppercase) {
    throw {
      status: 400,
      message: "Le mot de passe doit contenir au moins une majuscule",
    };
  }

  if (!checks.digit) {
    throw {
      status: 400,
      message: "Le mot de passe doit contenir au moins un chiffre",
    };
  }

  if (!checks.special) {
    throw {
      status: 400,
      message: "Le mot de passe doit contenir au moins un caractère spécial",
    };
  }

  //Récupérer la valeur de la config
  const configQuery = new TableBuilder("configurations")
    .orderBy("id", "DESC")
    .build();
  const result = await pool.query(configQuery.query, configQuery.parameters);
  const config = result.rows[0];
  const nbLengthCode = config?.nb_two_factor_authentification;

  const checkQuery = new TableBuilder("users")
    .where("mail", "=", mail)
    .limit(1)
    .build();

  const {
    rows: [existingUser],
  } = await pool.query(checkQuery.query, checkQuery.parameters);

  if (existingUser) {
    throw { status: 802, statusCode: "802", message: "Email déjà utilisé" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const needCode = nbLengthCode > 0;
  const authenticateCode = needCode ? getCode(nbLengthCode) : null;

  const insertQueryBuilder = new TableBuilder("users").insert({
    uuid: uuidv4(),
    first_name: user.first_name || "",
    name: user.name || "",
    password: passwordHash,
    authentication_code: authenticateCode,
    user_agent: user.user_agent || null,
    mail,
    ip_address: user.ip_address || null,
    phone: user.phone || null,
    sex: user.sex || null,
    access_level: 0,
    mail_verified: !needCode,
  });

  const buildResult = insertQueryBuilder.build();

  const {
    rows: [createdUser],
  } = await pool.query(buildResult.query, buildResult.parameters);

  if (needCode) {
    await sendMail({
      mail: createdUser.mail,
      type: "inscription",
      variables: { code: createdUser.authentication_code },
    });
  }

  return {
    message: "Compte créé avec succès, veuillez vérifier votre compte !",
    id: createdUser.id,
    //A enlever plus tard c'est pour gagner du temps
    authentication_code: createdUser.authentication_code,
  };
}
// ######################################################################## User inscription mail ########################################################################
async function verificationAuthenticateCodeService(body) {
  const code = body.code;

  const verifyQuery = new TableBuilder("users")
    .where("authentication_code", "=", code)
    .where("mail_verified", "=", false)
    .build();

  const {
    rows: [existingUser],
  } = await pool.query(verifyQuery.query, verifyQuery.parameters);

  if (!existingUser) {
    throw { status: 400, message: "Code incorrect ou compte déjà vérifié" };
  }

  const updateQuery = new TableBuilder("users")
    .update({ mail_verified: true, access_level: 10 })
    .where("id", "=", existingUser.id)
    .build();

  await pool.query(updateQuery.query, updateQuery.parameters);

  return {
    message: "Compte vérifié avec succès !",
  };
}

// ######################################################################## User connection ########################################################################

async function connectionService(body) {
  const mail = body.mail;
  const password = body.password;

  const user = await utilisateurModel.connectionModel(mail);
  if (!user) {  
    throw { status: 400, message: "Le mail ou le mot de passe est incorrect" };
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw { status: 400, message: "Le mail ou le mot de passe est incorrect" };
  }

  if (!user.mail_verified) {
    throw {
      status: 403,
      message: "Veuillez vérifier votre adresse mail avant de vous connecter.",
    };
  }

  return {
    message: "Bon retour parmi nous !",
  };
}

// ######################################################################## User resetPassword ########################################################################

async function resetPasswordService(body) {
  const mail = body.mail;

  const checkQuery = new TableBuilder("users")
    .where("mail", "=", mail)
    .limit(1)
    .build();

  const {
    rows: [existingUser],
  } = await pool.query(checkQuery.query, checkQuery.parameters);

  if (!existingUser) {
    throw { status: 803, message: "Aucun compte n'est relié à ce mail" };
  }

  const token = uuidv4();
  const saveTokenQuery = new TableBuilder("users")
    .update({ token, token_expiry: new Date(Date.now() + 15 * 60 * 1000) })
    .where("mail", "=", mail)
    .build();

  await pool.query(saveTokenQuery.query, saveTokenQuery.parameters);

  await sendMail({
    mail,
    type: "reset_password",
    variables: { link: `${process.env.LINK_FRONT}/reset?token=${token}` },
  });

  return {
    message: "Vous avez reçu un mail pour réinitialiser votre mot de passe",
    token,
  };
}

async function updatePasswordService(
  token,
  newPassword,
  confirmationNewPassword,
) {
  if (!token || !newPassword || !confirmationNewPassword) {
    throw {
      status: 804,
      message: "Un ou plusieurs champs ne sont pas remplis",
    };
  }

  if (newPassword !== confirmationNewPassword) {
    throw { status: 400, message: "Les mots de passe ne correspondent pas" };
  }

  const checkQuery = new TableBuilder("users")
    .where("token", "=", token)
    .where("token_expiry", ">", new Date())
    .build();

  const {
    rows: [existingUser],
  } = await pool.query(checkQuery.query, checkQuery.parameters);

  if (!existingUser) {
    throw { status: 400, message: "Token invalide ou expiré" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const resetQuery = new TableBuilder("users")
    .update({
      password: passwordHash,
      token: null,
      token_expiry: null,
    })
    .where("token", "=", token)
    .build();

  await pool.query(resetQuery.query, resetQuery.parameters);

  return { message: "Votre mot de passe a bien été réinitialisé" };
}

async function getMeService({ authHeader }) {
  const user = await check(authHeader);
  const cleaned = await cleanFields([user]);
  return cleaned[0];
}

async function getCartCheckoutDetails(cartId) {
  const query = `
    SELECT 
      ci.id,
      ci.quantity,
      ci.size,
      ci.color,
      a.title,
      a.ttc_price
    FROM cart_items ci
    JOIN articles a ON ci.id_article = a.id
    WHERE ci.id_cart = $1 
      AND ci.deleted = false 
      AND a.deleted = false
  `;

  const result = await pool.query(query, [cartId]);
  return cleanFields(result.rows);
}
module.exports = {
  insertUsersService,
  getAllUsersService,
  getUsersByIdService,
  updateUsersService,
  deleteUsersService,
  userInscriptionService,
  verificationAuthenticateCodeService,
  connectionService,
  resetPasswordService,
  updatePasswordService,
  getMeService,
  getCartCheckoutDetails,
};
