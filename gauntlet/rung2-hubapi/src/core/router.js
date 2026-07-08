import { userRoutes } from "../resources/users.js";
import { orderRoutes } from "../resources/orders.js";
import { productRoutes } from "../resources/products.js";
import { paymentRoutes } from "../resources/payments.js";
import { refundRoutes } from "../resources/refunds.js";
import { cartRoutes } from "../resources/carts.js";
import { couponRoutes } from "../resources/coupons.js";
import { reviewRoutes } from "../resources/reviews.js";
import { addresseRoutes } from "../resources/addresses.js";
import { shipmentRoutes } from "../resources/shipments.js";
import { invoiceRoutes } from "../resources/invoices.js";
import { categoryRoutes } from "../resources/categories.js";
import { wishlistRoutes } from "../resources/wishlists.js";
import { notificationRoutes } from "../resources/notifications.js";
import { sessionRoutes } from "../resources/sessions.js";
import { webhookRoutes } from "../resources/webhooks.js";
import { apikeyRoutes } from "../resources/apikeys.js";
import { auditRoutes } from "../resources/audits.js";
import { inventoryRoutes } from "../resources/inventory.js";
import { shippingRoutes } from "../resources/shipping.js";
import { failure } from "./errors.js";

const routes = {
  ...userRoutes,
  ...orderRoutes,
  ...productRoutes,
  ...paymentRoutes,
  ...refundRoutes,
  ...cartRoutes,
  ...couponRoutes,
  ...reviewRoutes,
  ...addresseRoutes,
  ...shipmentRoutes,
  ...invoiceRoutes,
  ...categoryRoutes,
  ...wishlistRoutes,
  ...notificationRoutes,
  ...sessionRoutes,
  ...webhookRoutes,
  ...apikeyRoutes,
  ...auditRoutes,
  ...inventoryRoutes,
  ...shippingRoutes,
};

export function dispatch(action, req = {}) {
  const handler = routes[action];
  if (!handler) return failure("unknown_action");
  if (!req.user) return failure("unauthenticated");
  return handler(req);
}

export function actions() {
  return Object.keys(routes).sort();
}
