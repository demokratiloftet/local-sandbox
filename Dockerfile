FROM node:22-bookworm-slim@sha256:d9f850096136edbc402debdd8729579a288aac64574ada0ff4db26b6ae58b0b2
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ iptables util-linux ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /sandbox
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs gateway.mjs entrypoint.sh isolation-test.mjs ./
RUN chmod 755 entrypoint.sh
ENTRYPOINT ["/sandbox/entrypoint.sh"]
