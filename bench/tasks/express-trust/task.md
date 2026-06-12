Security report from our infra team:

Our service sits behind exactly one load balancer, configured per the docs. We rate-limit and audit-log by client IP. A pentest found both are bypassable: a client that sends a forged `X-Forwarded-For` header gets their forged address used as their identity — the request's reported remote address becomes whatever the attacker claims, even though we only ever told the framework to trust our single load balancer hop.

Find the root cause and fix it. Do not change the public configuration API. When you are done, state the root cause in one sentence.
