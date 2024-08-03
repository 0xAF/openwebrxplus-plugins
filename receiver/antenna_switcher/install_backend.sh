#!/bin/bash
# Install script for the antenna_switcher backend.
# Assumes a Debian / Raspberry Pi OS / Ubuntu system with an APT
# package manager and a OpenWebRX+ installation from the repository.
#
# You would need to adjust the script if you want to use it inside
# a Docker container, but it is probably a bad idea anyway.
#
# License: Apache 2
# Copyright (c) 2024 Dimitar Milkov, LZ2DMV

apt-get update
apt-get install -y python3 python3-pip python3-venv nginx

# download backend
mkdir -p /opt/antenna_switcher
pushd /opt/antenna_switcher
repo=https://raw.githubusercontent.com/0xAF/openwebrxplus-plugins/main/receiver/antenna_switcher
wget --no-clobber -O antenna_switcher.py "$repo"/antenna_switcher.py
wget --no-clobber -O antenna_switcher.cfg "$repo"/antenna_switcher.cfg
echo "1" > ant
# prepare venv
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors RPi.GPIO
deactivate
popd

# systemd service
cat << _EOF_ > /etc/systemd/system/antenna_switcher.service
[Unit]
Description=Antenna Switcher Backend
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/opt/antenna_switcher
ExecStart=/opt/antenna_switcher/venv/bin/python3 -m antenna_switcher

[Install]
WantedBy=multi-user.target
_EOF_

systemctl daemon-reload
systemctl enable --now antenna_switcher

# nginx configuration
mkdir -p /etc/nginx/snippets
cat << _EOF_ > /etc/nginx/snippets/antenna_switcher.conf
set \$antennaBackend 127.0.0.1:8075;
location /antenna_switch {
  proxy_pass http://\$antennaBackend;
  proxy_http_version 1.1;
  proxy_buffering off;

  # required for websockets
  proxy_set_header Upgrade \$http_upgrade;
  proxy_set_header Connection \$http_connection;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
}
_EOF_

nginx_owrx_config="/etc/nginx/sites-available/openwebrx"

if [ -f "$nginx_owrx_config" ]; then
  # some black magic with sed to add include line in the end of the server block
  grep -qF 'include snippets/antenna_switcher.conf' $nginx_owrx_config || sed -ri.bak \
    ':a;N;$!ba;s/}[\s\r\n]*$/\n\tinclude snippets\/antenna_switcher.conf;\n}/' \
    $nginx_owrx_config

  systemctl restart varnish nginx
else
  echo "You need to create your nginx site in /etc/nginx/sites-enabled and include snippets/antenna_switcher.conf."
  echo "Sample config [/etc/nginx/sites-enabled/openwebrx]:"
  cat << _EOF_

server {
  listen 80 default_server;
  listen [::]:80 default_server;
  listen 443 ssl default_server;
  listen [::]:443 ssl default_server;
  gzip off;
  include snippets/snakeoil.conf;

  set \$upstream 127.0.0.1:8073; # OWRX
  location / {
    proxy_pass http://\$upstream;
    proxy_http_version 1.1;
    proxy_buffering off;

    # required for websockets
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$http_connection;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  }

  include snippets/antenna_switcher.conf;
}
_EOF_
fi
