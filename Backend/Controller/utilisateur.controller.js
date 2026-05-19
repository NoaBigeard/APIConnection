const { sendMail } = require("../Utils/mailer");
const { errorLog } = require("../utils/logger");
const { stripeClient } = require("../Utils/stripeAPI");
const pool = require("../Database/db");
const { v4: uuidv4 } = require("uuid");
const { TableBuilder } = require("../Model/generic.model");
const { cleanFields } = require("../Utils/template");
const { getConfigurationModel } = require("../Model/configuration.model");

const BACK_DOMAIN =
  process.env.BACK_DOMAIN || `http://localhost:${process.env.PORT || 3000}`;
const FRONT_DOMAIN = process.env.FRONT_DOMAIN || `http://localhost:5173`;

function splitFullName(fullName = "") {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return { first_name: "", name: "" };
  if (parts.length === 1) return { first_name: parts[0], name: "" };

  return {
    first_name: parts[0],
    name: parts.slice(1).join(" "),
  };
}

function mapStripeAddress(address = {}) {
  return {
    country: address.country || null,
    city: address.city || null,
    zip_code: address.postal_code || null,
    street: address.line1 || null,
    additional_address: address.line2 || null,
  };
}

function getStripeCustomFieldValue(session, fieldKey) {
  const field = session?.custom_fields?.find((item) => item.key === fieldKey);

  if (!field) return "";

  return field.text?.value || "";
}

async function getLatestAddressByUserId(idUsers) {
  const query = new TableBuilder("addresses")
    .select("*")
    .where("id_users", "=", idUsers)
    .where("deleted", "=", false)
    .orderBy("id", "DESC")
    .limit(1)
    .build();

  const {
    rows: [address],
  } = await pool.query(query.query, query.parameters);

  return address || null;
}

async function upsertCheckoutAddress({ user, customerDetails }) {
  const stripeAddress = customerDetails?.address;
  if (!stripeAddress) return null;

  const checkoutName = splitFullName(customerDetails?.name || "");

  const latestAddress = await getLatestAddressByUserId(user.id);
  const baseAddress = {
    name: user.name || checkoutName.name || "",
    first_name: user.first_name || checkoutName.first_name || "",
    id_users: user.id,
    ...mapStripeAddress(stripeAddress),
  };

  if (!latestAddress) {
    const insertData = { uuid: uuidv4(), ...baseAddress };
    const insertQuery = new TableBuilder("addresses")
      .insert(insertData)
      .build();
    const result = await pool.query(insertQuery.query, insertQuery.parameters);
    return result.rows[0] || null;
  }

  const updateQuery = new TableBuilder("addresses")
    .update(baseAddress)
    .where("id", "=", latestAddress.id)
    .build();

  const result = await pool.query(updateQuery.query, updateQuery.parameters);
  return result.rows[0] || latestAddress;
}

async function upsertCheckoutOrder({ user, addressId, session, tvaRate }) {
  const existingOrderQuery = new TableBuilder("orders")
    .select("*")
    .where("stripe_session_id", "=", session.id)
    .limit(1)
    .build();

  const {
    rows: [existingOrder],
  } = await pool.query(existingOrderQuery.query, existingOrderQuery.parameters);

  if (existingOrder) return existingOrder;

  const total = session.amount_total || 0;
  const rate = Number(tvaRate || 20);
  const htPrice = rate > 0 ? Math.round(total / (1 + rate / 100)) : total;
  const tvaPrice = total - htPrice;

  const orderData = {
    uuid: uuidv4(),
    orders_number: Number(String(Date.now()).slice(-9)),
    status: "payé",
    state: "nouveau",
    id_address: addressId || null,
    ht_price: htPrice,
    tva_price: tvaPrice,
    ttc_price: total,
    id_users: user.id,
    stripe_session_id: session.id,
  };

  const insertQuery = new TableBuilder("orders").insert(orderData).build();
  const result = await pool.query(insertQuery.query, insertQuery.parameters);
  return result.rows[0] || null;
}

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

function buildStripeLineItem({
  title,
  ttc_price,
  quantity = 1,
  photos = [],
  size,
  color,
  stock,
}) {
  return {
    price_data: {
      unit_amount: Number(ttc_price || 0),
      currency: "eur",
      product_data: {
        name: title || "Article",
        images: photos.length ? [photos[0].url_photo] : [],
        metadata: {
          color: color || "",
          size: size || "",
        },
      },
    },
    quantity: Math.max(1, Number(quantity) || 1),
    ...(stock
      ? {
          adjustable_quantity: {
            enabled: true,
            minimum: 1,
            maximum: Math.max(1, Number(stock) || 1),
          },
        }
      : {}),
  };
}

async function getCartLineItems(cartId) {
  const items = await getCartDetails(cartId);

  return items.map((item) =>
    buildStripeLineItem({
      title: item.title,
      ttc_price: item.ttc_price,
      quantity: item.quantity,
      photos: item.photos || [],
      size: item.size,
      color: item.color,
      stock: item.stock,
    }),
  );
}

async function createCheckoutSessionController(req, res) {
  try {
    const { uuid, size, color, quantity, cart_id, cartId } = req.body;
    const usersService = require("../Service/users.service");
    const { getArticlesByUuidService } = require("../Service/articles.service");
    const currentUser = await usersService.getUsersByIdService(req.user.id);

    let lineItems = [];

    if (cart_id || cartId) {
      const cart = await getActiveCartForUser(currentUser.id);

      if (!cart || String(cart.id) !== String(cart_id || cartId)) {
        return res.status(404).json({ message: "Panier introuvable" });
      }

      lineItems = await getCartLineItems(cart.id);
    } else {
      const article = await getArticlesByUuidService(uuid);

      if (!article) {
        return res.status(404).json({ message: "Article introuvable" });
      }

      lineItems = [
        buildStripeLineItem({
          title: article.title,
          ttc_price: article.ttc_price,
          quantity,
          photos: article.photos || [],
          size,
          color,
          stock: article.stock,
        }),
      ];
    }

    let stripeCustomerId = currentUser?.stripe_customer_id || null;
    const latestAddress = await getLatestAddressByUserId(currentUser.id);

    if (!stripeCustomerId) {
      const stripeCustomer = await stripeClient.customers.create({
        email: currentUser.mail,
        name:
          [currentUser.first_name, currentUser.name]
            .filter(Boolean)
            .join(" ") || undefined,
        phone: currentUser.phone || undefined,
        address: latestAddress ? mapStripeAddress(latestAddress) : undefined,
      });

      stripeCustomerId = stripeCustomer.id;
      await usersService.updateUsersService(
        currentUser.id,
        { stripe_customer_id: stripeCustomerId },
        req.user,
      );
    }

    const session = await stripeClient.checkout.sessions.create({
      customer: stripeCustomerId,
      line_items: lineItems,
      custom_fields: [
        {
          key: "firstname",
          label: {
            type: "custom",
            custom: "Prénom",
          },
          type: "text",
          text: {
            minimum_length: 1,
            maximum_length: 50,
          },
        },
        {
          key: "lastname",
          label: {
            type: "custom",
            custom: "Nom de famille",
          },
          type: "text",
          text: {
            minimum_length: 1,
            maximum_length: 50,
          },
        },
      ],

      mode: "payment",
      allow_promotion_codes: true,
      billing_address_collection: "required",

      phone_number_collection: {
        enabled: true,
      },

      payment_method_types: ["card"],
      success_url: `${FRONT_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONT_DOMAIN}/cancel?session_id={CHECKOUT_SESSION_ID}`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function sessionStatusController(req, res) {
  try {
    const { session_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ message: "session_id manquant" });
    }

    const session = await stripeClient.checkout.sessions.retrieve(session_id);
    let lineItems = { data: [] };

    try {
      lineItems = await stripeClient.checkout.sessions.listLineItems(
        session_id,
        {
          expand: ["data.price.product"],
        },
      );
    } catch (lineItemsErr) {
      errorLog(lineItemsErr, `${req.method} ${req.originalUrl}`);
    }

    const usersService = require("../Service/users.service");
    const currentUser = await usersService.getUsersByIdService(req.user.id);
    const customerDetails = session.customer_details || {};
    const checkoutName = splitFullName(customerDetails.name || "");
    const checkoutFirstName =
      getStripeCustomFieldValue(session, "firstname") ||
      checkoutName.first_name;
    const checkoutLastName =
      getStripeCustomFieldValue(session, "lastname") || checkoutName.name;
    let refreshedUser = currentUser;

    let savedAddress = null;
    if (
      (session.status === "complete" || session.payment_status === "paid") &&
      currentUser
    ) {
      try {
        const updateData = {
          first_name: checkoutFirstName || currentUser.first_name || "",
          name: checkoutLastName || currentUser.name || "",
          phone: customerDetails.phone || currentUser.phone || null,
          stripe_customer_id:
            session.customer || currentUser.stripe_customer_id || null,
        };

        await usersService.updateUsersService(
          currentUser.id,
          updateData,
          req.user,
        );

        refreshedUser = await usersService.getUsersByIdService(currentUser.id);

        if (session.customer) {
          await stripeClient.customers.update(session.customer, {
            name: [updateData.first_name, updateData.name]
              .filter(Boolean)
              .join(" "),
            phone: updateData.phone || undefined,
            address: customerDetails.address
              ? mapStripeAddress(customerDetails.address)
              : undefined,
          });
        }

        savedAddress = await upsertCheckoutAddress({
          user: currentUser,
          customerDetails,
        });

        try {
          const config = await getConfigurationModel();
          await upsertCheckoutOrder({
            user: currentUser,
            addressId: savedAddress?.id || null,
            session,
            tvaRate: config?.TVA_rate,
          });
        } catch (orderErr) {
          errorLog(orderErr, `${req.method} ${req.originalUrl}`);
        }
      } catch (syncErr) {
        errorLog(syncErr, `${req.method} ${req.originalUrl}`);
      }
    } else if (
      session.status === "complete" ||
      session.payment_status === "paid"
    ) {
      errorLog(
        new Error("currentUser introuvable pour session-status"),
        `${req.method} ${req.originalUrl}`,
      );
    }

    const items = lineItems.data.map((item) => ({
      name: item.price?.product?.name,
      description: item.price?.product?.description,
      image: item.price?.product?.images?.[0] || null,
      quantity: item.quantity,
      unit_amount: item.price?.unit_amount,
      color: item.price?.product?.metadata?.color || null,
      size: item.price?.product?.metadata?.size || null,
    }));

    return res.status(200).json({
      status: session.status,
      session_url: session.url,
      customer_email: session.customer_details?.email,
      customer_first_name:
        refreshedUser?.first_name || checkoutFirstName || null,
      customer_last_name: refreshedUser?.name || checkoutLastName || null,
      customer_name: session.customer_details?.name,
      customer_phone: session.customer_details?.phone,
      customer_id:
        session.customer || refreshedUser?.stripe_customer_id || null,
      amount_total: session.amount_total,
      currency: session.currency,
      items,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
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
  sessionStatusController,
  createCheckoutSessionController,
};
