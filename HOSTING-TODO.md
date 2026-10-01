# Hosting setup

Temporary checklist. Delete this file when the app is up on DuckDNS and a restore from Cloudflare has been tried.

Decisions are in `README.md`. Free Oracle VM in Melbourne, DuckDNS plus Caddy, database in `PGLITE_DIR`, daily Cloudflare R2 copy.

Do not commit tokens, API keys, or `rclone` config.

## You, in the browser

These three accounts cannot be created from the CLI.

- [x] **Oracle Cloud.** Home region **Australia Southeast (Melbourne)**, `ap-melbourne-1`. Upgraded to Pay As You Go. The 1 OCPU / 6 GB machine stays inside the free allowance.
- [x] **OCI API access.** Config is in `~/.oci/config`. Private key is `~/.oci/oci_api_key.pem`. The SSH key `~/.ssh/id_ed25519.pub` is for logging into the VM later.
- [x] **DuckDNS.** Name is `strongr.duckdns.org`. Token is in `~/.config/workout/duckdns.env`, not in git.
- [x] **Cloudflare R2.** Bucket `strongr`. Credentials are in `~/.config/workout/r2.env`, not in git.

## CLI, after those exist

- [x] Install and configure the `oci` CLI on this machine. `oci` 3.94.1 is in `~/.local/bin`.
- [x] Network reused: existing Melbourne VCN. Security list already allows SSH, port 80, and port 443.
- [x] Ampere VM `workout` is RUNNING. Shape `VM.Standard.A1.Flex`, 1 OCPU, 6 GB, Ubuntu 24.04. Public IP `161.33.70.241`. SSH user `ubuntu`, key `~/.ssh/id_ed25519`.
- [x] SSH in. Node 24, Caddy, and `rclone` are installed.
- [x] App is built and running under systemd as `node build`. `DATABASE_URL` is unset. `ORIGIN` is `https://strongr.duckdns.org`. Database is `/var/lib/workout/pglite`.
- [x] Caddy has a Let's Encrypt certificate and proxies to the app.
- [x] Startup job updates DuckDNS with the VM's current public IP.
- [x] Daily backup script and 3:00am timer are installed. The script stops the app, tars `PGLITE_DIR`, starts the app, and uploads with `rclone` only when the database changed. It keeps the last 14 copies.
- [x] Restore script is installed: `workout-restore` replaces the live database and then starts the app. `workout-restore --to DIR` unpacks into a copy and leaves the app alone.
- [x] New R2 key is on the VM. A backup uploaded, and restoring that file into a copy reproduced the database (1041 files, including `PG_VERSION`).
- [ ] Open `https://strongr.duckdns.org`, create the owner login, and confirm a workout survives a refresh. The login page already returns HTTPS 200.
