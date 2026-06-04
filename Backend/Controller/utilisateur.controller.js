const { sendMail } = require("../Utils/mailer");
const { errorLog } = require("../utils/logger");
const { stripeClient } = require("../Utils/stripeAPI");
const pool = require("../Database/db");
const { v4: uuidv4 } = require("uuid");
const { TableBuilder } = require("../Model/generic.model");
const { cleanFields } = require("../Utils/template");
const { getConfigurationModel } = require("../Model/configuration.model");

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
    // console.log("body reçu:", req.body);
    // console.log("headers:", req.headers.authorization);
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

async function getActiveCartForUser(userId) {
  const cartQuery = new TableBuilder("carts")
    .select("*")
    .where("id_users", "=", userId)
    .where("status", "=", "active")
    .where("deleted", "=", false)
    .orderBy("id", "DESC")
    .limit(1)
    .build();

  const {
    rows: [cart],
  } = await pool.query(cartQuery.query, cartQuery.parameters);

  if (cart) return cart;

  const insertQuery = new TableBuilder("carts")
    .insert({ uuid: uuidv4(), id_users: userId, status: "active" })
    .build();

  const result = await pool.query(insertQuery.query, insertQuery.parameters);
  return result.rows[0] || null;
}

async function getCartDetails(cartId) {
  const query = `
    SELECT
      ci.id,
      ci.uuid,
      ci.id_cart,
      ci.id_article,
      ci.quantity,
      ci.size,
      ci.color,
      ci.creation_date,
      ci.change_date,
      a.uuid AS article_uuid,
      a.title,
      a.ttc_price,
      a.ht_price,
      a.tva_price,
      COALESCE(
        (
          SELECT json_agg(
            json_build_object(
              'id', p.id,
              'uuid', p.uuid,
              'url_photo', p.url_photo,
              'display_orders', p.display_orders
            ) ORDER BY p.display_orders ASC
          )
          FROM photos p
          WHERE p.id_article = a.id AND p.deleted = false
        ),
        '[]'::json
      ) AS photos
    FROM cart_items ci
    JOIN articles a ON a.id = ci.id_article
    WHERE ci.id_cart = $1
      AND ci.deleted = false
      AND a.deleted = false
    ORDER BY ci.id ASC
  `;

  const result = await pool.query(query, [cartId]);
  return cleanFields(result.rows);
}

async function getActiveCartController(req, res) {
  try {
    const cart = await getActiveCartForUser(req.user.id);
    const items = cart ? await getCartDetails(cart.id) : [];

    return res.status(200).json({
      cart: cleanFields(cart),
      items,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function resolveArticleFromBody(body) {
  const articlesService = require("../Service/articles.service");

  if (body.uuid) {
    return articlesService.getArticlesByUuidService(body.uuid);
  }

  const articleId =
    body.id_article ?? body.articleId ?? body.article_id ?? body.id;

  if (articleId === undefined || articleId === null || articleId === "") {
    return null;
  }

  return articlesService.getArticlesByIdService(articleId);
}

async function addToCartController(req, res) {
  try {
    const article = await resolveArticleFromBody(req.body);

    if (!article) {
      return res.status(404).json({ message: "Article introuvable" });
    }

    const quantity = Math.max(1, parseInt(req.body.quantity, 10) || 1);
    const size = req.body.size || null;
    const color = req.body.color || null;
    const cart = await getActiveCartForUser(req.user.id);

    const existingItemBuilder = new TableBuilder("cart_items")
      .select("*")
      .where("id_cart", "=", cart.id)
      .where("id_article", "=", article.id)
      .where("deleted", "=", false)
      .limit(1);

    if (size !== null) existingItemBuilder.where("size", "=", size);
    if (color !== null) existingItemBuilder.where("color", "=", color);

    const existingItemQuery = existingItemBuilder.build();

    const {
      rows: [existingItem],
    } = await pool.query(existingItemQuery.query, existingItemQuery.parameters);

    if (existingItem) {
      const updateQuery = new TableBuilder("cart_items")
        .update({ quantity: existingItem.quantity + quantity })
        .where("id", "=", existingItem.id)
        .build();

      await pool.query(updateQuery.query, updateQuery.parameters);
    } else {
      const insertQuery = new TableBuilder("cart_items")
        .insert({
          uuid: uuidv4(),
          id_cart: cart.id,
          id_article: article.id,
          quantity,
          size,
          color,
        })
        .build();

      await pool.query(insertQuery.query, insertQuery.parameters);
    }

    const items = await getCartDetails(cart.id);

    return res.status(200).json({
      message: existingItem
        ? "Quantité ajoutée au panier"
        : "Article ajouté au panier",
      cart: cleanFields(cart),
      items,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function removeFromCart(req, res) {
  try {
    const cart = await getActiveCartForUser(req.user.id);
    const article = await resolveArticleFromBody(req.body);
    const itemId =
      req.body.id_cart_item ?? req.body.cart_item_id ?? req.body.id;
    const size = req.body.size || null;
    const color = req.body.color || null;

    let targetItem = null;

    if (itemId) {
      const itemQuery = new TableBuilder("cart_items")
        .select("*")
        .where("id", "=", itemId)
        .where("id_cart", "=", cart.id)
        .where("deleted", "=", false)
        .limit(1)
        .build();

      const {
        rows: [item],
      } = await pool.query(itemQuery.query, itemQuery.parameters);
      targetItem = item || null;
    } else if (article) {
      const itemBuilder = new TableBuilder("cart_items")
        .select("*")
        .where("id_cart", "=", cart.id)
        .where("id_article", "=", article.id)
        .where("deleted", "=", false)
        .limit(1);

      if (size !== null) itemBuilder.where("size", "=", size);
      if (color !== null) itemBuilder.where("color", "=", color);

      const itemQuery = itemBuilder.build();

      const {
        rows: [item],
      } = await pool.query(itemQuery.query, itemQuery.parameters);
      targetItem = item || null;
    }

    if (!targetItem) {
      return res.status(404).json({ message: "Article du panier introuvable" });
    }

    const deleteQuery = new TableBuilder("cart_items")
      .update({ deleted: true })
      .where("id", "=", targetItem.id)
      .build();

    await pool.query(deleteQuery.query, deleteQuery.parameters);

    const items = await getCartDetails(cart.id);

    return res.status(200).json({
      message: "Article retiré du panier",
      cart: cleanFields(cart),
      items,
    });
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function clearCartController(req, res) {
  try {
    const cart = await getActiveCartForUser(req.user.id);

    const clearQuery = new TableBuilder("cart_items")
      .update({ deleted: true })
      .where("id_cart", "=", cart.id)
      .where("deleted", "=", false)
      .build();

    await pool.query(clearQuery.query, clearQuery.parameters);

    return res.status(200).json({
      message: "Panier vidé avec succès",
      cart: cleanFields(cart),
      items: [],
    });
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
    console.log("body:", req.body);
    console.log("files:", req.files);
    if (table === "users") {
      req.body.ip_address = req.ip;
      req.body.user_agent = req.get("user-agent");
    }

    const service = require(`../Service/${table}.service.js`);
    const result = await service[`insert${capitalize(table)}Service`](
      req.body,
      req.files || [],
    );

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
    const uuid = req.params.uuid || null;
    const { parseQuery } = require("../Utils/helper");
    const query = parseQuery(req);

    const service = require(`../Service/${table}.service.js`);
    if (id) {
      const result = await service[`get${capitalize(table)}ByIdService`](
        id,
        query,
      );
      return res.status(200).json(result);
    }
    if (uuid) {
      const result = await service[`get${capitalize(table)}ByUuidService`](
        uuid,
        query,
      );
      return res.status(200).json(result);
    }
    const result = await service[`getAll${capitalize(table)}Service`](query);
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

    console.log("body:", req.body);
    console.log("files:", req.files);
    return res.status(200).json(result);
  } catch (err) {
    const status = err.status || 500;
    const message = err.message || "Erreur serveur";
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(status).json({ message });
  }
}

async function restoreController(req, res) {
  try {
    const id = req.params.id;
    const table = "articles";

    const service = require(`../Service/${table}.service.js`);

    const result = await service.restoreService(id);

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

async function addPhotosController(req, res) {
  try {
    const id = req.params.id;
    const {
      addPhotosService,
      getArticlesByUuidService,
    } = require("../Service/articles.service");
    const result = await addPhotosService(id, req.files || []);
    return res.status(201).json(result);
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
  getActiveCartForUser,
  getCartDetails,
  getActiveCartController,
  addToCartController,
  removeFromCart,
  clearCartController,
  getTableController,
  insertTableController,
  softDeleteController,
  updateTableController,
  uploadAWSController,
  addPhotosController,
  restoreController,
};
