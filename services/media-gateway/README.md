# media-gateway

Uploads and imports media into Nextcloud and returns public share links.

## Environment
- `MEDIA_GATEWAY_TOKEN`
- `NEXTCLOUD_URL`
- `NEXTCLOUD_USERNAME`
- `NEXTCLOUD_PASSWORD`
- `NEXTCLOUD_BASE_FOLDER` (default: `/Pindeck`)
- `PORT` (default: `4545`)

## Endpoints
- `POST /upload` (multipart/form-data: `file`, `userId`, optional `folder`)
- `POST /import` (JSON: `sourceUrl`, `userId`, optional `filename`, `folder`)

## Notes
Uses WebDAV for file upload and OCS Share API to create public share links.
