export const outbox = [];

export function deliver(user, message) {
  outbox.push({ to: user.id, message });
}

export function resetOutbox() {
  outbox.length = 0;
}
