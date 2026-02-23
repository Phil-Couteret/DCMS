#!/usr/bin/env python3
"""Deploy DCMS public-website (couteret.fr landing page) to OVH via FTP.

OVH shared hosting: FTP home is account root, web root is /www. Deploy to www/
to reach the document root. (If FTP home were already /www, use REMOTE_BASE=''.)
API, admin and dcms stay on ZBOX. This deploys only the static landing page.

Reads credentials from .env (project root) or ../job-search-agents/.env (same approach as job-search-interviews).
Requires: FTP_HOST, FTP_USER, FTP_PASSWORD

Usage:
  python deploy/deploy_landing_to_ovh.py
  # Or with env vars:
  FTP_HOST=... FTP_USER=... FTP_PASSWORD=... python deploy/deploy_landing_to_ovh.py
"""

import os
import subprocess
import sys
from pathlib import Path
from ftplib import FTP

SCRIPT_DIR = Path(__file__).resolve().parent
DCMS_ROOT = SCRIPT_DIR.parent
PUBLIC_WEBSITE = DCMS_ROOT / "public-website"
BUILD_DIR = PUBLIC_WEBSITE / "build"
REMOTE_BASE = "www"  # OVH web root; use "" if FTP home is already /www

# Env paths: DCMS .env first, then job-search-agents (sibling repo)
ENV_PATHS = [
    DCMS_ROOT / ".env",
    DCMS_ROOT.parent / "job-search-agents" / ".env",
]


def load_env():
    """Load FTP credentials from .env file."""
    env = {}
    for env_path in ENV_PATHS:
        if env_path.exists():
            for line in env_path.read_text().splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    env[k.strip()] = v.strip().strip('"').strip("'")
            break
    return env


def ensure_remote_dir(ftp: FTP, remote_path: str):
    """Create remote directory and parents if needed."""
    if not remote_path or remote_path in (".", "/"):
        return
    parts = [p for p in remote_path.replace("\\", "/").strip("/").split("/") if p]
    path = ""
    for part in parts:
        path = f"{path}/{part}".lstrip("/")
        try:
            ftp.mkd(path)
        except Exception:
            pass


def upload_dir(ftp: FTP, local_dir: Path, remote_dir: str, skip_dotfiles: bool = True):
    """Recursively upload a directory to FTP."""
    for item in sorted(local_dir.iterdir()):
        if skip_dotfiles and item.name.startswith("."):
            continue
        rel = item.relative_to(local_dir)
        remote_path = f"{remote_dir}/{rel}".replace("\\", "/")

        if item.is_dir():
            ensure_remote_dir(ftp, remote_path)
            upload_dir(ftp, item, remote_path)
        else:
            ensure_remote_dir(ftp, os.path.dirname(remote_path))
            with open(item, "rb") as f:
                ftp.storbinary(f"STOR {remote_path}", f)
            print(f"  uploaded {remote_path}")


def main():
    env = load_env()
    host = env.get("FTP_HOST") or os.environ.get("FTP_HOST")
    user = env.get("FTP_USER") or os.environ.get("FTP_USER")
    password = env.get("FTP_PASSWORD") or os.environ.get("FTP_PASSWORD")

    if not all([host, user, password]):
        print(
            "Missing FTP credentials. Set FTP_HOST, FTP_USER, FTP_PASSWORD in .env or environment.\n"
            "  Tried: .env, ../job-search-agents/.env"
        )
        sys.exit(1)

    if not PUBLIC_WEBSITE.exists():
        print(f"public-website not found: {PUBLIC_WEBSITE}")
        sys.exit(1)

    # Build with API URL pointing to ZBOX
    api_url = os.environ.get("REACT_APP_API_URL", "https://api.couteret.fr/api")
    print(f"==> Building public-website (REACT_APP_API_URL={api_url})...")
    result = subprocess.run(
        ["npm", "run", "build"],
        cwd=PUBLIC_WEBSITE,
        env={**os.environ, "REACT_APP_API_URL": api_url, "CI": "false"},
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stderr or result.stdout)
        sys.exit(1)
    print("    Build OK.")

    if not BUILD_DIR.exists():
        print(f"Build output not found: {BUILD_DIR}")
        sys.exit(1)

    print(f"==> Deploying {BUILD_DIR} to {host} (current dir = web root, overwriting)...")

    try:
        ftp = FTP(host, user, password)
        ftp.encoding = "utf-8"
        ftp.set_pasv(True)

        for item in sorted(BUILD_DIR.iterdir()):
            if item.name.startswith(".") and item.name != ".htaccess":
                continue
            rel = item.name
            remote_path = f"{REMOTE_BASE}/{rel}".strip("/") if REMOTE_BASE else rel

            if item.is_dir():
                try:
                    ftp.mkd(remote_path)
                except Exception:
                    pass
                upload_dir(ftp, item, remote_path)
            else:
                ensure_remote_dir(ftp, os.path.dirname(remote_path))
                with open(item, "rb") as f:
                    ftp.storbinary(f"STOR {remote_path}", f)
                print(f"  uploaded {remote_path}")

        ftp.quit()
        print("==> Deployment complete. couteret.fr updated.")
    except Exception as e:
        print(f"Deployment failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
