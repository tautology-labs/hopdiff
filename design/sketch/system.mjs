// Desired state. Human-authored, human-edited — change originates HERE.
// Boundaries only: services, queues, edges, schemas, rates. Interiors are agent territory.

export const system = {
  nodes: {
    api:        { kind: 'service', root: 'services/api' },
    worker:     { kind: 'service', root: 'services/worker' },
    orderQueue: { kind: 'queue', construct: 'sqs.fifo' },
    orderDlq:   { kind: 'queue', construct: 'sqs.standard' },
  },

  edges: [
    {
      from: 'api', to: 'orderQueue',
      schema: 'OrderV1',
      rate: { msgsPerSec: 400, batched: false },   // planted: exceeds sqs.fifo unbatched ceiling
    },
    {
      from: 'orderQueue', to: 'worker',            // consumer binding (lives in IaC, not code)
    },
    {
      from: 'worker', to: 'orderDlq',              // planted: declared but nobody implements it
      schema: 'OrderV1',
    },
  ],
}
