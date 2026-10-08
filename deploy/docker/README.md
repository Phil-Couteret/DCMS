# Deploying DCMS with Docker Compose

`docker-compose.yml` (repository root) runs the rebuilt DCMS: PostgreSQL, the
API (`backend/`), the public site (`frontend/`), the backoffice
(`backoffice/`), and nginx in front of them. The older `deploy/zbox` and
`deploy/ovh` scripts deploy the previous system and are not used for this one.

## 1. Addresses and DNS

Four kinds of address, all pointing at the server (A/AAAA records):

| Address | Serves |
|---|---|
| `*.dcms.couteret.fr` (`PUBLIC_DOMAIN`) | each center's public site, `{slug}.dcms…` |
| `admin.couteret.fr` (`ADMIN_DOMAIN`) | the platform: superadmin console |
| `*.admin.couteret.fr` | each center's backoffice, `{slug}.admin…` |
| `api.couteret.fr` (`API_DOMAIN`) | the API |

## 2. TLS certificate

nginx reads `deploy/docker/certs/fullchain.pem` and `privkey.pem` (git
ignores the folder). One certificate must cover `*.PUBLIC_DOMAIN`,
`ADMIN_DOMAIN`, `*.ADMIN_DOMAIN` and `API_DOMAIN`. Wildcards need Let's
Encrypt's DNS-01 challenge, through your DNS provider's API, e.g. with
certbot and its DNS plugin:

    certbot certonly --dns-<provider> \
      -d '*.dcms.couteret.fr' -d 'admin.couteret.fr' -d '*.admin.couteret.fr' -d 'api.couteret.fr'

then copy (or link) `fullchain.pem` and `privkey.pem` into
`deploy/docker/certs/`, and `docker compose exec nginx nginx -s reload` after
each renewal.

## 3. Settings

    cp .env.production.example .env.production

and fill in every value; generate each secret with `openssl rand -hex 32`.
The database passwords take effect on the first start only (an empty data
volume).

## 4. Start

    docker compose --env-file .env.production up -d --build

On the first start PostgreSQL creates its roles
(`deploy/docker/postgres/init/01-roles.sh`): `diveapp` owns the tables and
runs the migrations; `dcms_app` is the API's role, bound by row-level
security. The `migrate` service applies the migrations and stops; the API
starts after it.

## 5. The platform superadmin — before opening the site

The first account in an empty database becomes the superadmin. Create it
yourself, once, before the addresses are public:

    docker compose --env-file .env.production run --rm \
      -e SUPERADMIN_PASSWORD='<at least 12 characters>' backend \
      node scripts/create-superadmin.mjs you@example.com "Your Name"

Sign in at `https://admin.couteret.fr`, then create centers from the console
(each gets its addresses from its slug).

The database starts with one center, `default` ("Default Center"), from an
early migration. Rename it, or deactivate it, from the console.

## Updating

    git pull
    docker compose --env-file .env.production up -d --build

New migrations run before the new API starts.

## Notes

- Rate limits count per visitor: the API believes `X-Forwarded-For` only
  from nginx and the two Next.js servers, at fixed addresses on the internal
  network (`TRUST_PROXY`). Keep those addresses in step if you change them.
- Session cookies are per address (host-only): each center's backoffice keeps
  its own sign-in.
- Backups: the data is in the `dcms_pgdata` volume. Schedule
  `docker compose exec postgres pg_dump -U postgres divedb` (as the superuser,
  which row-level security does not restrict).
