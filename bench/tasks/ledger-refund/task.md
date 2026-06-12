Bug report from support:

Customers who already received a partial refund can no longer refund any of their remaining balance. Example: an order with a single captured $100 payment and one prior settled $30 refund should allow up to $70 more, but the refund API rejects every amount with "exceeds_refundable".

Find the root cause and fix it. The defect is a logic bug, not a validation problem — do not loosen input validation and do not remove the protection against refunding more than the captured balance. Do not add features. When you are done, briefly state the root cause in one sentence.
