#!/bin/sh
# certbot deploy hook：续期成功后把新证书同步进 nginx 容器并平滑 reload。
# 由 certbot renewal conf 的 renew_hook 自动调用，不要手动改文件名。
# nginx.conf 引用的固定路径 = nginx/certs/stravision.site_bundle.crt / .key
set -e
SRC=/etc/letsencrypt/live/stravision.site
DST=/home/ubuntu/berry-realm-v4.0/nginx/certs
cp -f $SRC/fullchain.pem $DST/stravision.site_bundle.crt
cp -f $SRC/privkey.pem $DST/stravision.site.key
chown ubuntu:ubuntu $DST/stravision.site_bundle.crt $DST/stravision.site.key
chmod 644 $DST/stravision.site_bundle.crt
chmod 600 $DST/stravision.site.key
docker exec berry-realm-v40-nginx-1 nginx -s reload || docker restart berry-realm-v40-nginx-1
