#!/bin/sh
set -eu
# Fail closed: no application starts unless IPv4 AND IPv6 rules install.
# All protocol services live in this container, so only loopback is needed.
for firewall in iptables ip6tables; do
  "$firewall" -P OUTPUT DROP
  "$firewall" -A OUTPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT
  # Block Docker's loopback DNS forwarder too; no runtime DNS is necessary.
  "$firewall" -A OUTPUT -p udp --dport 53 -j REJECT
  "$firewall" -A OUTPUT -p tcp --dport 53 -j REJECT
  "$firewall" -A OUTPUT -o lo -p tcp -m multiport --dports 2582,2583 -j ACCEPT
done
# Docker DNATs its DNS listener to a different port before OUTPUT filtering.
# Reject the resolver address itself as well as port 53.
iptables -I OUTPUT 1 -d 127.0.0.11 -j REJECT
# Docker Desktop does not publish ports on an internal-only network. A fixed
# TCP gateway handles ingress; its only non-loopback outbound target is this PDS.
if [ "${1:-}" = gateway ]; then
  iptables -A OUTPUT -d 172.30.83.2 -p tcp -m multiport --dports 2582,2583 -j ACCEPT
  program=/sandbox/gateway.mjs
else
  program=/sandbox/server.mjs
fi
# The app cannot alter these rules. Privileges are used only during bootstrap.
exec setpriv --reuid=node --regid=node --init-groups \
  --bounding-set=-all --inh-caps=-all --ambient-caps=-all \
  node "$program"
