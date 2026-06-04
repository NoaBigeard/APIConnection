const { sendMail } = require("../Utils/mailer");
const { errorLog } = require("../utils/logger");
const { stripeClient } = require("../Utils/stripeAPI");
const {
  getActiveCartForUser,
  getCartDetails,
} = require("./utilisateur.controller");
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

async function createCheckoutSessionByTypeController(req, res) {
  try {
    const usersService = require("../Service/users.service");
    const currentUser = await usersService.getUsersByIdService(req.user.id);

    if (!currentUser) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    const isPremium =
      currentUser?.is_premium &&
      currentUser?.premium_until &&
      new Date(currentUser.premium_until) > new Date();

    const stripeCustomerId = currentUser?.stripe_customer_id || undefined;
    const paymentType =
      req.body.typePayment ||
      req.body.paymentType ||
      (req.body.priceId ? "subscription" : "payment");

    switch (paymentType) {
      case "subscription": {
        const { priceId } = req.body;

        if (!priceId) {
          return res.status(400).json({ message: "Le priceId est requis" });
        }

        if (!stripeCustomerId) {
          return res.status(403).json({
            message:
              "Vous devez effectuer un achat avant de pouvoir vous abonner",
          });
        }

        try {
          const session = await stripeClient.checkout.sessions.create({
            customer: stripeCustomerId,
            mode: "subscription",
            payment_method_types: ["card"],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${FRONT_DOMAIN}/about?subscription=success`,
            cancel_url: `${FRONT_DOMAIN}/about?subscription=cancel`,
          });

          return res.status(200).json({ url: session.url });
        } catch (subscriptionErr) {
          errorLog(subscriptionErr, `${req.method} ${req.originalUrl}`);
          return res.status(500).json({
            message: "Erreur lors de la création de la session d'abonnement",
            details: subscriptionErr.message,
          });
        }
      }

      case "payment": {
        const { uuid, size, color, quantity, cart_id, cartId } = req.body;

        try {
          let lineItems = [];

          if (cart_id || cartId) {
            const cart = await getActiveCartForUser(currentUser.id);

            if (!cart || String(cart.id) !== String(cart_id || cartId)) {
              return res.status(404).json({ message: "Panier introuvable" });
            }

            lineItems = await getCartLineItems(cart.id);
          } else {
            const {
              getArticlesByUuidService,
            } = require("../Service/articles.service");
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

          if (isPremium && lineItems.length > 0) {
            lineItems = lineItems.map((item) => {
              if (item.price_data) {
                item.price_data.unit_amount = Math.round(
                  item.price_data.unit_amount * 0.8,
                );
                if (item.price_data.product_data) {
                  item.price_data.product_data.name = `${item.price_data.product_data.name} (Réduction Membre)`;
                }
              }
              return item;
            });
          }

          const session = await stripeClient.checkout.sessions.create({
            ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
            line_items: lineItems,
            custom_fields: [
              {
                key: "firstname",
                label: { type: "custom", custom: "Prénom" },
                type: "text",
                text: { minimum_length: 1, maximum_length: 50 },
              },
              {
                key: "lastname",
                label: { type: "custom", custom: "Nom de famille" },
                type: "text",
                text: { minimum_length: 1, maximum_length: 50 },
              },
            ],
            invoice_creation: { enabled: true },
            mode: "payment",
            allow_promotion_codes: true,
            billing_address_collection: "required",
            phone_number_collection: { enabled: true },
            payment_method_types: ["card"],
            success_url: `${FRONT_DOMAIN}/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${FRONT_DOMAIN}/cancel?session_id={CHECKOUT_SESSION_ID}`,
          });

          return res.status(200).json({ url: session.url });
        } catch (paymentErr) {
          errorLog(paymentErr, `${req.method} ${req.originalUrl}`);
          return res.status(500).json({
            message: "Erreur lors de la création de la session de paiement",
            details: paymentErr.message,
          });
        }
      }

      default:
        return res.status(400).json({
          message:
            "typePayment invalide. Valeurs attendues: payment ou subscription",
        });
    }
  } catch (err) {
    errorLog(err, `${req.method} ${req.originalUrl}`);
    return res.status(500).json({ message: err.message });
  }
}

async function createCheckoutSessionController(req, res) {
  return createCheckoutSessionByTypeController(req, res);
}

async function customerPortalController(req, res) {
  try {
    const user = req.user;

    if (!user.stripe_customer_id) {
      return res.status(400).json({ message: "Aucun compte Stripe associé" });
    }

    const portalSession = await stripeClient.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${FRONT_DOMAIN}/about`,
    });

    return res.status(200).json({ url: portalSession.url });
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

        const savedAddress = await upsertCheckoutAddress({
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

async function getSubscriptionPlansController(req, res) {
  try {
    const usersService = require("../Service/users.service");

    const currentUser = await usersService.getUsersByIdService(req.user.id);

    // Le statut premium dépend désormais de la date présente en BDD
    const isPremium =
      currentUser?.is_premium &&
      currentUser?.premium_until &&
      new Date(currentUser.premium_until) > new Date();

    const PRODUCT_ID = process.env.STRIPE_PLANS_KEY;
    const prices = await stripeClient.prices.list({
      product: PRODUCT_ID,
      active: true,
      expand: ["data.product"],
    });

    const plans = prices.data.map((price) => ({
      priceId: price.id,
      amount: price.unit_amount / 100,
      interval: price.recurring ? price.recurring.interval : "month",
      productName: price.product.name,
      productDescription: price.product.description,
      productImage: price.product.images[0] || null,
    }));

    return res.status(200).json({ plans, isPremium });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

async function createSubscriptionCheckout(req, res) {
  req.body = { ...req.body, typePayment: "subscription" };
  return createCheckoutSessionByTypeController(req, res);
}

async function stripeWebhookController(req, res) {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripeClient.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error(`Erreur de signature Webhook: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "invoice_payment.paid":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;

        const subscriptionId =
          invoice.subscription ||
          invoice.parent?.subscription_details?.subscription;

        if (!subscriptionId) {
          break;
        }

        const customerId = invoice.customer;
        const subscription =
          await stripeClient.subscriptions.retrieve(subscriptionId);

        const periodEnd =
          subscription.current_period_end ||
          subscription.items?.data?.[0]?.current_period_end;

        if (!periodEnd) {
          console.error("[ERREUR] Impossible de trouver current_period_end");
          break;
        }

        const premiumUntil = new Date(periodEnd * 1000).toISOString();

        const result = await pool.query(
          `UPDATE users SET is_premium = $1, premium_until = $2, stripe_subscription_id = $3 
     WHERE stripe_customer_id = $4 AND deleted = false`,
          [true, premiumUntil, subscriptionId, customerId],
        );

        if (result.rowCount === 0) {
          console.error(
            `[ATTENTION] Aucun user trouvé pour customer ${customerId}`,
          );
        } else {
          console.log(
            `[BDD SUCCÈS] User ${customerId} est maintenant Premium jusqu'au ${premiumUntil}`,
          );
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer;
        const customerEmail = session.customer_details?.email;

        if (customerId && customerEmail) {
          await pool.query(
            `UPDATE users SET stripe_customer_id = $1 WHERE mail = $2 AND deleted = false AND stripe_customer_id IS NULL`,
            [customerId, customerEmail],
          );
          console.log(
            `[WEBHOOK] Customer ID ${customerId} sauvegardé pour ${customerEmail}`,
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        const subscriptionId = subscription.id;
        const premiumUntil = new Date(
          subscription.current_period_end * 1000,
        ).toISOString();

        if (subscription.status === "active") {
          const query = `UPDATE users SET is_premium = $1, premium_until = $2, stripe_subscription_id = $3 WHERE stripe_customer_id = $4`;
          await pool.query(query, [
            true,
            premiumUntil,
            subscriptionId,
            customerId,
          ]);
          console.log(`[WEBHOOK] Abonnement mis à jour pour ${customerId}.`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        const query = `
          UPDATE users 
          SET is_premium = $1, premium_until = $2 
          WHERE stripe_customer_id = $3
        `;
        const values = [false, new Date().toISOString(), customerId];

        await pool.query(query, values);
        console.log(
          `[WEBHOOK] L'abonnement du client ${customerId} a été annulé ou a expiré.`,
        );
        break;
      }

      default:
        console.log(`Événement Stripe non géré : ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (dbErr) {
    console.error("Erreur BDD lors du traitement du webhook:", dbErr.message);
    return res
      .status(500)
      .json({ error: "Database update failed", details: dbErr.message });
  }
}

module.exports = {
  sessionStatusController,
  createCheckoutSessionController,
  customerPortalController,
  getSubscriptionPlansController,
  stripeWebhookController,
  createSubscriptionCheckout,
};
