# local-sandbox

A private, disposable AT Protocol development environment that runs entirely on
your own machine. Use it to build and test Demokratiløftet apps before they are
deployed to the shared demo environment.

| | This repo (`local-sandbox`) | [`server-infrastructure`](https://github.com/demokratiloftet/server-infrastructure) |
|---|---|---|
| Runs on | Your laptop | A VPS |
| Stack | Reference PDS + local PLC via `@atproto/dev-env` | Full Eurosky `u-at-proto` stack (PDS, PLC, relay, bsky, Ozone, feedgen) |
| Reachable from | `127.0.0.1` only | Tailnet, with public DNS and TLS |
| Data | Wiped on every restart | Persistent |
| Purpose | Fast, offline, throwaway app development | Shared demo |

Both speak the same protocol, so an app written against this sandbox talks to
the demo server by changing its service URL — not its code.

## What exists now

- A real reference PDS and a local PLC directory, from `@atproto/dev-env` 0.6.14.
- Two synthetic accounts, `organiser.test` and `issuer.test`, both with the
  password `local-sandbox-only`. They are disposable fixtures, not secrets.
- PDS: <http://127.0.0.1:2583> (an XRPC API, not a social-media interface).
- PLC: <http://127.0.0.1:2582> (local DID resolution).
- `sandbox.ts`, a command-line helper for posting and listing records.
- Functional and isolation checks.

This is the protocol foundation. The [calendar](https://github.com/demokratiloftet/calendar-app),
[identity component](https://github.com/demokratiloftet/identity-component), and
[attestation issuer](https://github.com/demokratiloftet/attestation-issuer) are
separate projects. The calendar provides the synthetic OIDC provider and an
OAuth application flow. No real NIF/BankID integration is activated here.

## Start, connect, post, stop

Prerequisites: Docker with Compose, and Node.js 24.17 (see `.node-version`). Maintained source, helpers and
checks use strict TypeScript; containers run the compiled JavaScript in `dist/`.

```sh
gh repo clone demokratiloftet/local-sandbox
cd local-sandbox
npm ci
npm run build
npm run up                                     # docker compose up -d --build --wait
npm run verify                                 # isolation + functional checks
node dist/sandbox.js accounts
node dist/sandbox.js post "This stays in my local sandbox"
node dist/sandbox.js list
npm run down                                   # stops only this project
```

Health and logs:

```sh
curl http://127.0.0.1:2583/xrpc/_health
npm run logs
```

**Everything here is intentionally disposable. All accounts, DIDs and records
are regenerated whenever the container restarts.** Nothing is written to a
mounted host directory. Keep any scenario you need repeatedly as fixture code,
not as live data. Persistence would require persisting the PDS *and* the PLC
along with their signing keys — deliberate later work.

## Using it from an app

`sandbox.ts` is importable as well as runnable, so a prototype can drive the
sandbox directly:

```ts
import { login, post, list, rpc } from './sandbox.ts'
```

For anything larger, point a normal AT Protocol client
(`@atproto/api`) at `http://127.0.0.1:2583` and log in as `organiser.test`.
Keep the service URL configurable from the start; that is the one line that has
to change when you move to the demo server.

## How isolation is enforced

1. Only `127.0.0.1:2582` and `127.0.0.1:2583` are published on the computer.
2. The PDS/PLC container sits on a Docker `internal: true` network. Docker
   Desktop cannot publish ports from such a network, so a small fixed TCP
   gateway forwards host-loopback connections to exactly those two services.
3. Container firewall rules drop new outbound connections except on loopback.
   The gateway gets one extra permission: TCP to the PDS container's fixed
   private address on ports 2582 and 2583. It is not a general proxy. DNS is
   blocked explicitly, including Docker's embedded resolver. Replies to inbound
   local connections still work.
4. The application starts only if both the IPv4 and IPv6 rules install — it
   fails closed.
5. Node runs as an unprivileged user with all capabilities removed.
6. No Docker socket and no private host directories are mounted.
7. DIDs are registered in the local PLC. The public crawler list is empty.
8. `sandbox.ts` has a hardcoded local target and rejects non-fixture handles,
   so it cannot be pointed at production by accident.

Downloads happen at image build time; runtime test data is created only after
the isolated container is up. The Docker build context is an explicit allowlist
(see `.dockerignore`).

Inside the sandbox, ordinary repository records stay readable to any client that
can reach it. Containment comes from the network boundary, not from new AT
Protocol privacy semantics: local processes can read them, and whoever
administers the host can change the boundary. No setup can promise that a later
change or a deliberate copy will never expose this data.

Do not attach the PDS container to another network, remove either firewall,
publish the gateway on `0.0.0.0`, register these test identities in the public
PLC, or expose them through a public tunnel. Run `./verify.sh` after any
infrastructure change, and do not mount private files into the containers.

Dependency maintenance on 2026-10-07 updated dev-env to 0.6.14 and pins patched
transitive packages in `package.json` overrides. `npm audit` reports zero known
vulnerabilities for this lockfile. The upgraded PDS was tested with real account
creation, records, calendar authorization, identity provisioning and isolation.
The overrides include major versions for unused telemetry/mail/image paths;
those paths are not enabled or compatibility-certified by this fixture. Recheck
the audit and integration suite before enabling additional upstream features.

## Verification

`npm run typecheck` checks every maintained TypeScript file. `npm run format:check`
checks formatting. CI builds and starts a fresh disposable environment, then runs
`./verify.sh`, which compiles the checks and runs, in order:

- `isolation-test.ts` inside both containers — outbound IPv4/IPv6 and DNS are
  blocked, local PDS/PLC reachable, processes hold no capabilities.
- `smoke-test.ts` from the host — create, read and delete a real PDS record,
  and resolve its DID in the local PLC.
- `docker inspect` assertions — internal-only backend network, no published
  backend ports, loopback-only gateway bindings, read-only root filesystems, no
  Docker socket.

Keep a record of a run with:

```sh
./verify.sh | tee verification-results.txt      # git-ignored
```

Never claim the sandbox is isolated when these fail. If a check fails because
something new is exposed, stop that service before reporting.

## Moving work to the shared demo

The demo environment lives in the sibling repo `server-infrastructure` and is
reached over Tailscale. Develop here, then deploy there — do not widen this
sandbox's network boundary to share it.

If you ever do need to reach a remote instance of *this* sandbox, forward it
over SSH rather than publishing ports:

```sh
ssh -N -o ExitOnForwardFailure=yes \
  -L 127.0.0.1:2583:127.0.0.1:2583 \
  -L 127.0.0.1:2582:127.0.0.1:2582 \
  devuser@sandbox-host
```

Stop the local sandbox first if it holds the same ports. Tailscale Funnel is
public exposure and is out of scope.

## Next implementation sequence

1. Keep this foundation and its isolation tests working.
2. Add a synthetic OIDC provider, issuer and consumer *inside* the isolated
   boundary. Prefer explicit internal allowlists when adding containers; never
   restore unrestricted egress just to make an integration work.
3. Implement and test a synthetic club-publisher attestation and withdrawal.
4. Add a minimal event consumer plus an independent verification CLI.
5. Demonstrate to NIF. Real NIF/BankID test integration needs an explicitly
   reviewed outbound exception or a separate integration environment — this
   sandbox cannot and should not contact them.

## Repository layout

| File | Purpose |
|---|---|
| `server.ts` | Boots the PDS + PLC and seeds the two fixture accounts |
| `gateway.ts` | Fixed TCP ingress from host loopback to the internal network |
| `sandbox.ts` | CLI and importable helper: `accounts`, `post`, `list` |
| `smoke-test.ts` | Functional check against the running PDS/PLC |
| `isolation-test.ts` | In-container egress, DNS and capability checks |
| `verify.sh` | Runs all checks plus `docker inspect` assertions |
| `entrypoint.sh` | Installs firewall rules, then drops privileges |
| `compose.yml`, `Dockerfile` | Container and network definition |
| `AGENTS.md` | Constraints for humans and coding agents working here |

## References

- AT Protocol development stack: <https://github.com/bluesky-social/atproto/blob/main/CONTRIBUTING.md>
- `dev-env` package: <https://github.com/bluesky-social/atproto/tree/main/packages/dev-env>
- Docker internal networks: <https://docs.docker.com/reference/compose-file/networks/>
