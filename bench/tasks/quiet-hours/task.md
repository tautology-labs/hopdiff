Bug report:

Users outside UTC say notification digests arrive during their configured quiet hours. Example: a user at UTC+5 with quiet hours 22:00–07:00 (their local time) received a digest at 18:00 UTC, which is 23:00 for them — inside their quiet window. Meanwhile some users in negative-offset timezones report digests being withheld during their local daytime.

Every user record carries `tzOffsetHours` (hours ahead of UTC, may be negative). Find the root cause and fix it. Do not remove or weaken the quiet-hours feature, and keep windows that wrap past midnight working. When you are done, briefly state the root cause in one sentence.
