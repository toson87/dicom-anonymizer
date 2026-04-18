#!/usr/bin/env bash
# One-shot build + deploy for the DICOM Anonymizer static site.
# Usage:  ./deploy.sh
set -euo pipefail

HERE="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$HERE"

echo "==> Building production bundle..."
npm run build

echo "==> Installing nginx config (if changed)..."
if ! sudo cmp -s nginx/dicom-anonymizer.conf /etc/nginx/sites-available/dicom-anonymizer; then
  sudo cp nginx/dicom-anonymizer.conf /etc/nginx/sites-available/dicom-anonymizer
  sudo ln -sf /etc/nginx/sites-available/dicom-anonymizer /etc/nginx/sites-enabled/dicom-anonymizer
  echo "    nginx config updated"
fi

echo "==> Syncing build to /var/www/dicom-anonymizer..."
sudo mkdir -p /var/www/dicom-anonymizer
# Atomic-ish replace: copy to staging, then swap. We don't have rsync here,
# so remove old contents first then copy fresh.
sudo rm -rf /var/www/dicom-anonymizer/assets /var/www/dicom-anonymizer/index.html /var/www/dicom-anonymizer/favicon.svg
sudo cp -r dist/. /var/www/dicom-anonymizer/
sudo chown -R www-data:www-data /var/www/dicom-anonymizer

echo "==> Validating and reloading nginx..."
sudo nginx -t
sudo systemctl reload nginx

echo "==> Deployed. Hitting http://localhost/ for a sanity check..."
curl -sS -o /dev/null -w 'HTTP %{http_code} in %{time_total}s\n' http://localhost/
