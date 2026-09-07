import assert from "node:assert/strict";
import {
  PICKUP_NOTIFICATION_TYPES,
  buildCustomerCancelNotification,
} from "./cancel-notifications";

assert.ok(PICKUP_NOTIFICATION_TYPES.includes("pickup_today"));
assert.ok(PICKUP_NOTIFICATION_TYPES.includes("SHIPMENT_BOOKED"));
assert.ok(!PICKUP_NOTIFICATION_TYPES.includes("order_cancelled" as never));
assert.ok(!PICKUP_NOTIFICATION_TYPES.includes("ORDER_PRE_PICKUP_CANCEL" as never));

const withRefund = buildCustomerCancelNotification({
  userId: "u1",
  orderId: "b038287a-fe70-41c7-9bf7-5ec9903e6ad5",
  orderNumber: "ORD1788707196917-IP6VP",
  refundAmount: 27000,
  refunded: true,
});
assert.equal(withRefund.type, "order_cancelled");
assert.match(withRefund.body, /ORD1788707196917-IP6VP/);
assert.match(withRefund.body, /27,000원/);

const noRefund = buildCustomerCancelNotification({
  userId: "u1",
  orderId: "abcdefghijklmnop",
  refunded: false,
});
assert.match(noRefund.body, /abcdefgh/);
assert.doesNotMatch(noRefund.body, /환불/);

console.log("cancel-notifications tests passed");
