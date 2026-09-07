# Exit contract: stdout is "ok", "regress:…", or "warn:…".
# Caller treats "regress:" as failure. Staging-only drops are warn.
def code(path): (path // 0);
def was_ok($n): $n >= 200 and $n < 400;
def dropped($pre; $post): was_ok($pre) and (was_ok($post) | not);

. as $in
| ($in.pre.health.api.http) as $apiPre
| ($in.post.health.api.http) as $apiPost
| ($in.pre.health.peskids.http) as $pkPre
| ($in.post.health.peskids.http) as $pkPost
| ($in.pre.health.staging.http) as $stPre
| ($in.post.health.staging.http) as $stPost
| [
    (if dropped($apiPre; $apiPost) then "api \($apiPre)->\($apiPost)" else empty end),
    (if dropped($pkPre; $pkPost) then "peskids \($pkPre)->\($pkPost)" else empty end)
  ] as $regress
| [
    (if dropped($stPre; $stPost) then "staging \($stPre)->\($stPost)" else empty end)
  ] as $warn
| if ($regress | length) > 0 then
    "regress:" + ($regress | join(", "))
  elif ($warn | length) > 0 then
    "warn:" + ($warn | join(", "))
  else
    "ok"
  end
