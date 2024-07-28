# Install script for the antenna_switcher backend.
# Assumes a Debian / Raspbian / Ubuntu system with an APT package manager
# and a OpenWebRX+ installation from the repository.
#
# You would need to adjust the script if you want to use it inside
# a Docker container, but it is probably a bad idea anyway.
#
# License: Apache 2
# Copyright (c) 2024 Dimitar Milkov, LZ2DMV

#!/bin/bash

apt-get update
apt-get install -y python3 python3-pip python3-venv nginx

mkdir -p /opt/antenna_switcher
cd /opt/antenna_switcher

wget -O antenna_switcher.py https://raw.githubusercontent.com/0xAF/openwebrxplus-plugins/main/receiver/antenna_switcher/antenna_switcher.py
wget -O antenna_switcher.cfg https://raw.githubusercontent.com/0xAF/openwebrxplus-plugins/main/receiver/antenna_switcher/antenna_switcher.cfg

echo "1" > ant

python3 -m venv venv
source venv/bin/activate

pip install flask flask-cors RPi.GPIO

deactivate

cat <<EOT > /etc/systemd/system/antenna_switcher.service
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
EOT

systemctl daemon-reload
systemctl start antenna_switcher
systemctl enable antenna_switcher

nginx_config="/etc/nginx/sites-available/openwebrx"
nginx_block="
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
"

if [ -f "\$nginx_config" ]; then
    sed -i "/server {/a\\\\n$nginx_block\n" \$nginx_config
else
    echo -e "\n$nginx_block\n" > /etc/nginx/conf.d/antenna_switcher.conf
fi

systemctl restart varnish
systemctl restart nginx
