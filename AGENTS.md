# Sandbox constraints

This project is a strictly private development sandbox. Preserve that boundary.

- Never use public AT Protocol accounts, public PLC registration, public relays,
  public tunnels, or Tailscale Funnel for sandbox content.
- Do not remove outbound firewall rules or bind host ports to public/LAN
  interfaces to solve connectivity problems.
- Keep private host files and the Docker socket out of application containers.
- New application services must remain inside an explicitly restricted network
  boundary. VPN access does not replace outbound isolation.
- Use synthetic identities. Real NIF/BankID integration is separate work requiring
  explicit user direction and a reviewed, narrow connectivity design.
- Run ./verify.sh after infrastructure changes. Do not claim isolation if tests
  fail. Stop a newly exposed service before reporting a failure.
- Document which components are implemented. This repository currently provides
  a PDS/PLC foundation and CLI, not the finished issuer/calendar/OIDC application.
- Test data is intentionally ephemeral; warn before changing/resetting a running
  environment if later users have started relying on its contents.
