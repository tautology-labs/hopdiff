const orders = new Map();

export function saveOrder(order) {
  orders.set(order.id, order);
}

export function getOrder(id) {
  return orders.get(id) ?? null;
}

export function reset() {
  orders.clear();
}
