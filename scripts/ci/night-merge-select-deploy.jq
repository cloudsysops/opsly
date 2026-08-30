# Select the Deploy run that belongs to this merge SHA.
# Never fall back to an older completed failure with a different headSha.
[.[]
  | select(.headSha == $after)
  | select(.createdAt >= $since)
] | .[0] // empty
