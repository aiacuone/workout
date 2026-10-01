# Workout

Personal workout log. SvelteKit app (`adapter-node`) with an embedded Postgres database (PGlite) on disk.

## Hosting

Run it on an **Oracle Cloud Always Free** virtual machine, starting on the **free account** (not Pay As You Go). The home region is **Melbourne** (`ap-melbourne-1`). The home region cannot be changed later.

Use the free **DuckDNS** name `strongr.duckdns.org`. One name is enough. The account allows up to five, for other projects. A small program on the VM updates DuckDNS whenever the public IP changes, including after Oracle stops and starts the machine.

Caddy serves the app on that name and gets the lock from Let's Encrypt. Set `ORIGIN` to `https://strongr.duckdns.org`. Open ports 80 and 443. The site is a normal link, so another person only needs the workout login.

That name is a subdomain DuckDNS owns. It stays free while they run the service. A domain you own replaces it later if the app is sold. The free VM and the single database file on its disk get replaced at that point too.

The app runs as `node build` under systemd. Leave `DATABASE_URL` unset so the database stays in `PGLITE_DIR` (default `./data/pglite`) on the VM's boot volume. Provision the VM with the `oci` CLI.

A push to `master` deploys. GitHub Actions syncs the repo to the VM over SSH, builds there, and restarts the `workout` service. The deploy key is the `DEPLOY_SSH_KEY` secret. Its public half is in the VM's `authorized_keys`. The private half is only in GitHub and in `~/.config/workout/github-deploy` on the machine that created it.

A free-account Ampere shape is 2 OCPUs and 12 GB, with 200 GB of block storage. That is enough for this app.

### If the VM is idle

On a free account, Oracle may **stop** the VM after 7 days under 20% CPU, network, and memory. This app will sit under that line. The disk stays. Start the VM again yourself. In Melbourne that restart can fail with "out of host capacity."

An account left unused for 30 days may be treated as abandoned and become eligible for suspension or termination. A free account stays active if it has been used in the past 60 days. Opening the app counts as use.

If Oracle ends the service, the retrieval window is 60 days for normal cloud services and 30 days for a free trial. During that window the data can still be copied out. After it, Oracle can delete the account's contents.

### Pay As You Go later

Upgrade in the console only: **Billing → Upgrade and Manage Payment**. There is no `oci` command for it. The same VM and disk stay in place. Oracle authorizes $100 on the card and then reverses it.

Pay As You Go does not stop an idle VM, and Always Free usage stays $0. Past the free limits, a free account is refused and a Pay As You Go account is charged. A budget is an email alert, checked about once a day. It is not a hard cap. A follow-up function can block new resources after the alert. Anything already running keeps being billed.

## Backups

The block volume is replicated across storage servers (designed for 99.99% annual durability). That is not a backup you can restore.

The free account includes **five** volume backups. Nothing creates them until you do. Oracle's built-in daily and weekly policies keep more than five copies, so they do not fit. A sixth backup fails until an older one is deleted. These backups live in the same account, so they are deleted with it.

**Cloudflare R2** holds the copy that survives an account closure. Pay As You Go does not replace it. Oracle Object Storage (20 GB free) is the same account, so it does not count either.

R2's free tier is 10 GB stored, 1 million writes, and 10 million reads per month. Downloads are free. Enabling R2 usually requires a card. Stay inside those limits and it costs nothing.

Once a day, a cron job on the VM should:

1. Stop the app briefly so the files are consistent.
2. Tar `PGLITE_DIR`.
3. Start the app.
4. Upload with `rclone`, unless the database is unchanged since the last upload.

Keep the last 7 to 14 daily files and delete the older ones. A daily copy of this database is only megabytes.

A restore script downloads the latest tar from R2, unpacks it into `PGLITE_DIR`, and the app is started again. Workouts logged after that upload are the ones that are missing. On a new VM, run that script before the first start.
