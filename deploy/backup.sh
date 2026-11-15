#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Nightly backup of customer data and payment screenshots.
# Run by legaldraft-backup.timer; run by hand with:
#     sudo systemctl start legaldraft-backup
#
# Keeps KEEP_DAYS of archives on the server, and copies each one off the
# server when BACKUP_REMOTE is set in /etc/legaldraft/backup.env, e.g.
#     BACKUP_REMOTE=r2:legaldraft-backups
# A copy that only lives on this VM does not survive losing the VM.
# ---------------------------------------------------------------------------
set -euo pipefail

DATA_DIR="${DATA_DIR:-/var/lib/legaldraft}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/legaldraft}"
KEEP_DAYS="${KEEP_DAYS:-30}"

umask 077
mkdir -p "$BACKUP_DIR"

stamp=$(date -u +%Y%m%d-%H%M%S)
archive="$BACKUP_DIR/legaldraft-$stamp.tar.gz"

# The app saves by writing a .tmp file and renaming it, so the data file is
# always whole; skip the .tmp. tar exits 1 if a file changes mid-read, which
# is harmless here, so only fail on 2 or more.
rc=0
tar --exclude='*.tmp' --warning=no-file-changed -czf "$archive.part" -C "$DATA_DIR" . || rc=$?
if [ "$rc" -gt 1 ]; then
  rm -f "$archive.part"
  echo "Backup FAILED (tar exit $rc)" >&2
  exit 1
fi
mv "$archive.part" "$archive"
echo "Saved $archive ($(du -h "$archive" | cut -f1))"

find "$BACKUP_DIR" -name 'legaldraft-*.tar.gz' -mtime +"$KEEP_DAYS" -delete

if [ -n "${BACKUP_REMOTE:-}" ]; then
  rclone copy "$archive" "$BACKUP_REMOTE/"
  echo "Copied to $BACKUP_REMOTE"
else
  echo "WARNING: BACKUP_REMOTE is not set — this backup exists only on this server." >&2
fi
