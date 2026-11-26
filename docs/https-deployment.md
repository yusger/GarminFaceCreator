# HTTPS with DNSPod

Use `compose.https.yaml` after `compose.yaml` and your image override. Set `GFC_PUBLIC_HOST` to your domain, `GFC_HTTP_PORT` to the externally forwarded TCP port, and `GFC_CADDY_IMAGE` to the custom Caddy image. No public port 80/443 is needed for DNS-01 validation.

Prepare `runtime/secrets/tencentcloud.env` (mode 600) with `TENCENTCLOUD_SECRET_ID` and `TENCENTCLOUD_SECRET_KEY`. Use a dedicated CAM user restricted to the DNS zone and DescribeRecordList/CreateRecord/ModifyRecord/DeleteRecord. Credentials are passed only to Caddy, never the compiler. Public DNS validation necessarily calls Tencent Cloud and the certificate authority.

Build a custom Caddy binary with `github.com/caddy-dns/tencentcloud` via the official Caddy download service or xcaddy; verify its version and module list, then use `deploy/Dockerfile.caddy` with a build context containing the binary named `caddy`. Keep the exact version and binary SHA-256 in the private deployment record for reproducibility.

Create `runtime/caddy/data` and `runtime/caddy/config`, owned by UID/GID 1654 and mode 700. These hold ACME accounts, TLS private keys and certificate renewal state. Do not delete them on recreation or copy them into Git, build contexts or the front-end. Caddy automatically renews managed certificates while running; renewal needs the DNS credential file and outbound DNS/HTTPS access.

The HTTPS overlay removes the application's published HTTP port and exposes only Caddy on the configured high port. Proxy network 172.30.88.0/29 must not conflict with existing routes. Caddy is fixed at 172.30.88.2; only this address is trusted by the backend for X-Forwarded-For and X-Forwarded-Proto. Client-supplied forwarded headers remain untrusted; Caddy replaces them. Caddy has a read-only root filesystem, no Linux capabilities and bounded resources.

Validate the Caddyfile with credentials loaded inside a temporary container; do not print adapted JSON/configuration, since placeholders may expand into credentials. Obtain the certificate with a temporary loopback-only listener before replacing the public HTTP listener. Check certificate hostname/issuer/expiry, public health, real PRG compilation, downloads, audit caller IP, and certificate persistence after restart. Avoid disabling certificate validation in tests.

HTTP and HTTPS have separate browser storage: export projects from the old HTTP origin before switching; import them at the HTTPS origin and reconfigure model credentials there. An HTTP request to the same TLS-only port is not an automatic HTTPS redirect.

HTTPS protects transport. Authentication, task ownership, request limits and disk quotas remain separate requirements before broadly advertising an anonymous build service.

Implementation validation: the backend forwarding change passed real-SDK success/failure/download/cancellation and spoofed-header audit tests on the staging deployment before switching the public listener.
