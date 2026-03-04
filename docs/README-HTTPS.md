# HTTPS Configuration

This project has been configured to support HTTPS.

## Prerequisites

- Docker
- Docker Compose

## Setup

1. **Generate Certificates**

   Since real SSL certificates are not included in the repository, you need to generate self-signed certificates for local development.

   Run the provided PowerShell script:

   ```powershell
   ./generate-certs.ps1
   ```

   This will use Docker to generate `nginx.key` and `nginx.crt` in the `nginx/certs` directory.

   Alternatively, if you have your own certificates, place them in `nginx/certs/` and name them `nginx.key` and `nginx.crt`.

2. **Restart Services**

   Apply the changes by restarting the containers:

   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. **Access the Site**

   Open your browser and navigate to:
   - https://localhost

   Note: Since the certificate is self-signed, your browser will warn you about the security risk. You can proceed past this warning for local development.

## Configuration Details

- **Nginx Config**: `nginx/nginx.conf` has been updated to listen on port 443 and redirect HTTP (port 80) to HTTPS.
- **Docker Compose**: `docker-compose.yml` now exposes port 443 and mounts the `nginx/certs` volume.
