# R2 image storage setup

The backend already supports Cloudflare R2 through its S3-compatible API. The bucket name shown in the Cloudflare dashboard is `codexavernico-media`.

## Cloudflare values

1. In R2, create an API token with **Object Read & Write**, restricted to the `codexavernico-media` bucket. Copy the Access Key ID and Secret Access Key when shown; keep the secret private.
2. Get the Cloudflare Account ID from the R2 overview. The S3 endpoint is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.
3. In the bucket's **Settings**, copy its Public Bucket URL. The bucket screenshot shows public access enabled, but the URL itself is needed by the backend.

For production, connect a custom domain to the bucket and use that domain as the public base URL. Cloudflare describes the `r2.dev` URL as a development endpoint with rate limits.

## Backend environment

Set these variables on the backend service (Koyeb), not in the frontend:

```text
MEDIA_STORAGE_PROVIDER=r2
R2_BUCKET_NAME=codexavernico-media
R2_ACCOUNT_ID=<Cloudflare Account ID>
R2_ACCESS_KEY_ID=<R2 Access Key ID>
R2_SECRET_ACCESS_KEY=<R2 Secret Access Key>
R2_ENDPOINT=https://<Cloudflare Account ID>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=<Public Bucket URL or custom domain, without trailing slash>
R2_REGION=auto
R2_FALLBACK_INLINE_ON_FAILURE=false
```

Redeploy the backend after saving the variables, then run **Admin Panel → Media Storage Status → Smoke Test**. A successful test should report provider `R2`, `Public: Readable`, and an object URL. The smoke test uploads a tiny test object to the bucket.

New uploads use R2 once the backend is configured. Existing images stored inline in MongoDB are not moved automatically; they need a separate migration before they can be served from R2.
