const { sendMessage } = require('../lib/queues');

async function submitOrder(req) {
  const order = { id: req.id, items: req.items, total: req.total };
  await sendMessage('orderQueue', order);
  return { accepted: true };
}

module.exports = { submitOrder };
