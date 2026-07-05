const { publish, sendMessage } = require('../lib/queues');

async function handleOrder(msg) {
  const order = JSON.parse(msg.body);
  await fulfill(order);
  // planted drift: an agent "helpfully" added audit logging via a topic
  // that exists in nobody's intent
  await publish('auditTopic', { orderId: order.id, at: Date.now() });
}

async function fulfill(order) {
  for (const item of order.items) {
    await reserveInventory(item);
  }
}

async function reserveInventory(item) { /* ... */ }

module.exports = { handleOrder };
