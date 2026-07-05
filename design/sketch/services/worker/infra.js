// stand-in for the CDK stack — in real life this is cdk synth output.
// note: the consumer binding lives HERE, not in consumer.js — no string
// in the worker's app code connects it to the queue. this is the join
// grep can't see.

module.exports = {
  bindings: [
    { consumes: 'orderQueue', handler: 'consumer.handleOrder' },
  ],
};
