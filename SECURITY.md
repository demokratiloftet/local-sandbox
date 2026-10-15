# Security and maintenance

This is a disposable local development fixture. Use only synthetic identities and
data. The shared `local-sandbox-only` fixture password is intentionally public;
it must never be reused for another service.

- Report suspected vulnerabilities privately to a repository maintainer. Do not
  include real credentials, private keys or personal data in public issues.
- Keep environment files, signing keys, databases and runtime output out of Git
  and Docker build contexts.
- Preserve loopback-only host ports, outbound firewall rules, internal networks,
  unprivileged processes and pinned image digests. Never mount the Docker socket
  or private host files in the fixture.
- Run the README checks before merging. CI scans Git history for secrets and
  verifies the fixture. Dependabot checks dependencies and Actions weekly.
- The public source repository does not publish running PDS instances. Local
  clients can read fixture records. Keep the runtime isolated and use a separate
  deployment for public services.
- Warn users before restarting an environment they rely on: fixture accounts,
  DIDs and records are deliberately reset on every restart.

See the README for setup, verification and current limitations.
