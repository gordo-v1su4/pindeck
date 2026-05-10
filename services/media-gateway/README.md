# media-gateway

Uploads and imports media into Nextcloud and returns public share links.

## Repository ownership

This folder is reference/legacy in `pindeck`.
Active hosting and deployment workflow lives in the separate repo:

- `~/Documents/Github/discord-bot`

If docs or implementation diverge, treat the separate repo as source of truth for runtime behavior.

## Environment
- `MEDIA_GATEWAY_TOKEN`
- `NEXTCLOUD_URL`
- `NEXTCLOUD_USERNAME`
- `NEXTCLOUD_PASSWORD`
- `NEXTCLOUD_WEBDAV_BASE_URL`
- `NEXTCLOUD_WEBDAV_USER`
- `NEXTCLOUD_WEBDAV_APP_PASSWORD` (preferred over `NEXTCLOUD_PASSWORD`)
- `NEXTCLOUD_BASE_FOLDER` (default: `/Pindeck`)
- `PORT` (default: `4545`)

## Endpoints
- `POST /upload` (multipart/form-data: `file`, `userId`, optional `folder`)
- `POST /import` (JSON: `sourceUrl`, `userId`, optional `filename`, `folder`)

## Notes
Uses WebDAV for file upload and OCS Share API to create public share links.
