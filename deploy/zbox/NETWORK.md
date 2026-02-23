# DCMS ZBOX – Network Configuration

## Overview

DCMS runs on the ZBOX at **192.168.1.5** and is reached via a public IP.

## Required DNS Records

Configure your DNS provider so these hostnames resolve to **84.79.202.126** (or your public IP):

| Hostname | Purpose | A Record |
|----------|---------|----------|
| **api.couteret.fr** | Backend API | 84.79.202.126 |
| **admin.couteret.fr** | Admin portal | 84.79.202.126 |
| **dcms.couteret.fr** | Public customer site | 84.79.202.126 |
| **\*.dcms.couteret.fr** | Multi-tenant public (e.g. deepblue.dcms.couteret.fr) | 84.79.202.126 |
| **\*.admin.couteret.fr** | Multi-tenant admin (e.g. deepblue.admin.couteret.fr) | 84.79.202.126 |
| **\*.api.couteret.fr** | Multi-tenant API (e.g. deepblue.api.couteret.fr) | 84.79.202.126 |

You can use other domains (e.g. `deepbluediving.com`) by changing the Ingress hostnames in `k8s/ingress.yaml` and rebuilding the frontend images with the correct API URL.

## Router / Firewall

| Source | Target | Port | Purpose |
|--------|--------|------|---------|
| Internet | 192.168.1.5 | 80 | HTTP |
| Internet | 192.168.1.5 | 443 | HTTPS (when TLS is enabled) |

Port forwarding from the public IP to the ZBOX:

- Public IP **84.79.202.126** → **192.168.1.5:80**
- Public IP **84.79.202.126** → **192.168.1.5:443**

## ZBOX Network

The ZBOX is set with a static IP:

| Setting | Value |
|---------|-------|
| IP | 192.168.1.5 |
| Netmask | /24 (255.255.255.0) |
| Gateway | 192.168.1.1 |
| DNS | 8.8.8.8, 1.1.1.1 |

## Ingress Routing

Traefik (K3s default ingress controller) sends traffic by hostname:

- `dcms.couteret.fr` → public website
- `admin.couteret.fr` → admin portal  
- `api.couteret.fr` → backend API
- `*.dcms.couteret.fr`, `*.admin.couteret.fr`, `*.api.couteret.fr` → same services (tenant from subdomain)

## HTTPS (TLS)

deploy.sh installs cert-manager and enables TLS automatically. Override email: `LETSENCRYPT_EMAIL`. Port 80 must be reachable.

1. Install cert-manager in the cluster.
2. Uncomment and configure the `tls` section in `k8s/ingress.yaml`.
3. Use a `ClusterIssuer` for Let’s Encrypt and update the Ingress to reference it.

## WireGuard VPN (Optional)

To access the ZBOX from outside your LAN, use WireGuard as described in the zbox-server repo (`wireguard/README.md`).
