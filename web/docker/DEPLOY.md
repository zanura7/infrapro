# VPS Deployment — Projek Infra

Pull-based Docker deployment. The VPS pulls from GitHub, builds the image, and runs the stack. No registry needed.

## Prerequisites on the VPS

- Docker Engine + Compose plugin (`docker compose version` works)
- `git`
- Outbound network to `github.com`, `packagist.org`, `registry.npmjs.org`, `hub.docker.com`, `gstd.viber.id`
- A user with permission to run Docker (in `docker` group)

> The repo is **private**: `https://github.com/zanura7/infrapro`. The VPS needs to be able to `git clone` it. Easiest is to mint a deploy key.

---

## First-time setup (run once on the VPS)

```bash
# 1. Create a deploy key (read-only access for this VPS)
ssh-keygen -t ed25519 -C "vps-bedaie-projek-infra" -f ~/.ssh/projek_infra_deploy -N ""
cat ~/.ssh/projek_infra_deploy.pub
```

Copy that public key, then on GitHub:
**Settings → Deploy keys → Add deploy key** for the `zanura7/infrapro` repo. Paste, **read-only**, save.

Tell SSH to use that key for github.com:

```bash
cat >> ~/.ssh/config <<'EOF'
Host github.com
    IdentityFile ~/.ssh/projek_infra_deploy
    IdentitiesOnly yes
EOF
chmod 600 ~/.ssh/config
```

Now clone:

```bash
sudo mkdir -p /opt/projek-infra
sudo chown "$USER":"$USER" /opt/projek-infra
git clone git@github.com:zanura7/infrapro.git /opt/projek-infra
cd /opt/projek-infra/web
```

Create the env file:

```bash
cp .env.docker.example .env
nano .env   # fill in the values listed below
```

**Required edits in `.env`:**

| Key | What to put |
|---|---|
| `APP_URL` | `http://<VPS_IP>:8080` for now (later `https://your-domain.tld`) |
| `DB_PASSWORD` | a strong, random password |
| `DB_ROOT_PASSWORD` | another strong, random password (different from above) |
| `VIBER_API_KEY` | `gf-b37cc3d92252aebbbd620d27b2f67a6694972e3b3c1a089b` |
| `APP_PORT` | `8080` (default) or whatever port you want nginx to bind to on the host |

Leave `APP_KEY=` blank — the entrypoint generates it on first boot.

---

## Deploy

From `/opt/projek-infra/web`:

```bash
make deploy
```

That runs `bash docker/deploy.sh`, which does:

1. `git fetch origin main && git reset --hard origin/main`
2. `docker compose build app`
3. `docker compose up -d`
4. waits ~8s for the stack to settle
5. curls `http://127.0.0.1:${APP_PORT}/` and expects HTTP 200

First build takes ~5 minutes (downloads PHP base image + composer + npm). Subsequent deploys reuse Docker cache and take 30–60 seconds.

---

## Verify

```bash
docker compose ps                # all 5 services should be 'Up'
make logs                        # tail logs
curl http://127.0.0.1:8080/login # expect HTTP 200
```

In a browser, hit `http://<VPS_IP>:8080`. Log in with the seeded admin:

- email: `admin@bedaie.id`
- password: `password`

**Change the admin password immediately** via Settings → Profile after first login.

---

## Re-deploy after a code change

You just `git push` from your machine, then on the VPS:

```bash
cd /opt/projek-infra/web && make deploy
```

That's it. Migrations run automatically via the entrypoint (`--graceful`, so it's idempotent).

---

## Common operations

| What | Command |
|---|---|
| Tail all logs | `make logs` |
| App-only logs | `docker compose logs -f app` |
| Drop into app container shell | `make shell` |
| Run an artisan command | `make artisan c='route:list'` |
| Open tinker REPL | `make tinker` |
| Restart everything | `make restart` |
| Stop the stack | `make down` |
| Wipe DB + reseed (destructive!) | `make fresh` |

---

## Networking & ports

- **Host port 8080** (`APP_PORT`) → nginx container `:80` → app container `:9000` (PHP-FPM)
- Nothing else is exposed to the host. MySQL and Redis are internal to the `internal` bridge network.

Open the firewall:

```bash
sudo ufw allow 8080/tcp
```

(or whatever `APP_PORT` you chose)

---

## When you get a domain

1. Point an A record to the VPS IP
2. Put a reverse proxy in front (Caddy / Traefik / nginx on the host) that terminates SSL and forwards to `127.0.0.1:8080`
3. Update `APP_URL` in `.env` to `https://your-domain.tld`
4. `make restart`

If you prefer not to add another proxy, you can also expose port 443 directly on the compose nginx and use certbot inside the container — happy to set that up when you have the domain.

---

## Troubleshooting

**Build fails on composer step**
SSL/certificate issues are common in tight network environments. The Alpine PHP image ships with up-to-date CA certs, so this should not happen. If it does: `docker compose build app --no-cache --progress=plain` and read the error.

**`mysqladmin: connect to server failed`**
MySQL still booting. The entrypoint retries for 60 seconds. If it still fails: `docker compose logs mysql` and look for permission / corruption errors.

**500 on every page**
Most likely `APP_KEY` not set or `.env` not mounted. Check: `docker compose exec app php artisan tinker --execute='echo config("app.key");'`

**Video gen times out**
Default route timeout is fine, but Cloudflare / nginx-proxy in front of the VPS might cap at 100s. Set `proxy_read_timeout 600s` on whatever reverse proxy sits in front.
