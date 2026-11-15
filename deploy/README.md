# Deploying LegalDraft.pk

- **Front end** → Cloudflare Pages (free)
- **Back end** → Oracle Cloud Always Free VM, behind Caddy (free)
- **Backups** → nightly archive on the VM, copied to Cloudflare R2 or Google Drive

```
browser ──► legaldraft.pk         (Cloudflare Pages, static React build)
        └─► api.legaldraft.pk     (Oracle VM: Caddy :443 ──► node :3001)
                                     data: /var/lib/legaldraft
```

Commit and push the `deploy/` folder first. The server clones the repo from GitHub.

---

## 1. Oracle account

1. Sign up at <https://www.oracle.com/cloud/free/>. You need a card for verification.
2. **Pick your home region carefully, because it can't be changed later.** Free Arm
   machines only exist in the home region. The closest regions to Pakistan are
   **UAE (Dubai / Abu Dhabi)**, **Saudi (Jeddah)** and **India (Mumbai / Hyderabad)**.
3. Once the account is active, **upgrade to Pay As You Go** (Billing → Upgrade).
   You still pay nothing within Always Free limits, but Oracle stops reclaiming
   "idle" free VMs, and a small app looks idle.
4. Billing → Budgets → create a budget of **$1** with an email alert at 100%, so
   anything that starts costing money shows up straight away.

## 2. Create the VM

Compute → Instances → Create instance:

| Setting | Value |
|---|---|
| Image | **Canonical Ubuntu 24.04** |
| Shape | **VM.Standard.A1.Flex** (Ampere), 1 OCPU / 6 GB is plenty. If you get "out of capacity", retry later or use **VM.Standard.E2.1.Micro** (AMD, 1 GB; the script adds swap) |
| Networking | Create a new VCN with a public subnet; **assign a public IPv4 address** |
| SSH keys | Upload your public key (`~/.ssh/id_ed25519.pub`) |
| Boot volume | Default (~47 GB) is fine; up to 200 GB total is free |

Note the **public IP** once it's running.

## 3. Open ports 80 and 443

Networking → Virtual Cloud Networks → your VCN → Security → the subnet's
**Default Security List** → Add Ingress Rules:

- Source `0.0.0.0/0`, TCP, destination port **80**
- Source `0.0.0.0/0`, TCP, destination port **443**

(The VM's own firewall is opened by the setup script.)

## 4. DNS (Cloudflare)

Move `legaldraft.pk`'s nameservers to Cloudflare (free plan), then add:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `api` | the VM's public IP | **DNS only (grey cloud)** |

Keep `api` on grey. With the orange proxy on, every customer would appear to
come from Cloudflare's addresses, which breaks the rate limits (`TRUST_PROXY_HOPS`).
Cloudflare also cuts requests off at 100 s, and a long draft can take longer.

The front-end records are added for you in step 8.

## 5. Run the setup script

From your computer:

```bash
scp deploy/setup-server.sh ubuntu@<VM-IP>:
ssh ubuntu@<VM-IP>
bash setup-server.sh
```

Partway through it prints a **deploy key**. Add it on GitHub (repo → Settings →
Deploy keys → Add, **without** write access) and press Enter.

The script installs Node 24, Caddy, the firewall rules, the `legaldraft-api`
service, nightly backups, and a generated `ADMIN_TOKEN`. It's safe to run again.

## 6. Fill in the secrets

```bash
sudo nano /etc/legaldraft/api.env       # ANTHROPIC_API_KEY, SMTP_*
sudo systemctl restart legaldraft-api
sudo grep ADMIN_TOKEN /etc/legaldraft/api.env   # for #/admin; keep it safe
```

Check from your own computer:

```bash
curl https://api.legaldraft.pk/api/health
```

If HTTPS fails, the DNS record or ports 80/443 aren't right yet. Look at
`sudo journalctl -u caddy -n 50`.

**Moving existing accounts from your laptop** (skip if it's only test data):

```bash
scp backend/accounts-data.json ubuntu@<VM-IP>:
scp -r backend/uploads ubuntu@<VM-IP>:
ssh ubuntu@<VM-IP> 'sudo systemctl stop legaldraft-api &&
  sudo mv ~/accounts-data.json /var/lib/legaldraft/ &&
  sudo cp -r ~/uploads/. /var/lib/legaldraft/uploads/ && rm -rf ~/uploads &&
  sudo chown -R legaldraft:legaldraft /var/lib/legaldraft &&
  sudo systemctl start legaldraft-api'
```

## 7. Off-server backups

A backup is written to `/var/backups/legaldraft` every night at 02:30 PKT and
kept for 30 days. A copy that only lives on the VM is lost with the VM, so send
one elsewhere. The archives hold password hashes and payment screenshots, so
the destination must be private.

**Option A: Cloudflare R2** (10 GB free). Create a bucket `legaldraft-backups`
and an R2 API token with read and write access to it, then:

```bash
sudo rclone config      # n → name: r2 → Storage: s3 → provider: Cloudflare
                        # paste the access key, secret and the endpoint
                        # https://<account-id>.r2.cloudflarestorage.com
```

**Option B: Google Drive** (15 GB free). Run `sudo rclone config` → name `gdrive` →
type `drive`. When it asks about a browser, answer **n** and follow its
instructions to run `rclone authorize "drive"` on your own computer.

Then tell the backup job where to send copies, and test it:

```bash
echo 'BACKUP_REMOTE=r2:legaldraft-backups' | sudo tee /etc/legaldraft/backup.env
# or BACKUP_REMOTE=gdrive:legaldraft-backups
sudo systemctl start legaldraft-backup
sudo journalctl -u legaldraft-backup -n 20 --no-pager   # should say "Copied to ..."
```

**Restoring** a backup:

```bash
sudo systemctl stop legaldraft-api
sudo tar -xzf /var/backups/legaldraft/legaldraft-<stamp>.tar.gz -C /var/lib/legaldraft
sudo chown -R legaldraft:legaldraft /var/lib/legaldraft
sudo systemctl start legaldraft-api
```

## 8. Front end on Cloudflare Pages

Cloudflare dashboard → Workers & Pages → Create → Pages → **Connect to Git** →
pick the repo:

| Setting | Value |
|---|---|
| Production branch | `main` |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Environment variable | `VITE_API_BASE` = `https://api.legaldraft.pk` |
| Environment variable | `NODE_VERSION` = `24` |

After the first deploy: Custom domains → add **`legaldraft.pk`** and
**`www.legaldraft.pk`**. Cloudflare creates those DNS records itself.

The app uses `#/` routes, so no redirect rules are needed. Every push to `main`
rebuilds the site.

To test on the `*.pages.dev` address before the domain is live, add it to
`ALLOWED_ORIGINS` in `/etc/legaldraft/api.env` and restart.

---

## Day to day

| Task | Command (on the server) |
|---|---|
| Deploy new back-end code | `/opt/legaldraft/deploy/update.sh` |
| Live logs | `sudo journalctl -u legaldraft-api -f` |
| Status | `systemctl status legaldraft-api caddy` |
| Run a backup now | `sudo systemctl start legaldraft-backup` |
| Next backup time | `systemctl list-timers legaldraft-backup` |
| Change settings | `sudo nano /etc/legaldraft/api.env && sudo systemctl restart legaldraft-api` |

Front-end changes deploy themselves when you push. Back-end changes need
`update.sh`, which backs up first.

Then work through `LAUNCH-CHECKLIST.md` from section 3, especially the
`TRUST_PROXY_HOPS` test and a real signup email.

## When to move off the free tier

Upgrade when you have steady paying customers, or when looking after the server
costs you more time than it's worth. The same `deploy/` files work on any Ubuntu
VPS, such as Hetzner at about €4–5/month: create the VM, run `setup-server.sh`,
restore the latest backup, and point the `api` DNS record at the new IP.
