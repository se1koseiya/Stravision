$pwd = Get-Location
New-Item -ItemType Directory -Force -Path "nginx/certs"
Write-Host "Generating self-signed certificate using Alpine Docker image..."
docker run --rm -v "${pwd}/nginx/certs:/certs" alpine /bin/sh -c "apk add --no-cache openssl && openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /certs/nginx.key -out /certs/nginx.crt -subj '/C=CN/ST=State/L=City/O=Organization/CN=localhost'"
Write-Host "Certificates generated in nginx/certs/"
