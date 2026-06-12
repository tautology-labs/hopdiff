Bug report:

Users are being logged out long before their sessions should expire. Our config sets the session TTL to "10h", but sessions die after roughly an hour and forty minutes. Sessions configured in minutes (e.g. "90m" in staging) expire exactly on time, so this seems specific to some configurations.

Find the root cause and fix it properly — if the defect could affect anything else, your fix should cover that too. When you are done, state the root cause in one sentence.
