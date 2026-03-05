# PinDeck WebDAV Uploads (Convex -> Nextcloud)

This document defines the canonical WebDAV setup for PinDeck media uploads.

## Scope

- Storage target: Nextcloud WebDAV
- Project prefix: `pindeck`
- Media folder prefix: `pindeck/media-uploads`
- Naming rule: no spaces, use kebab-case for folder names

## Canonical URLs

Base WebDAV root for user `gordo`:

```text
https://cloud.v1su4.dev/remote.php/dav/files/gordo
```

Project media prefix:

```text
pindeck/media-uploads
```

Example full file URL:

```text
https://cloud.v1su4.dev/remote.php/dav/files/gordo/pindeck/media-uploads/2026/03/clip-001.mp4
```

## Convex Environment Variables

Set these values in the Convex project:

```bash
NEXTCLOUD_WEBDAV_BASE_URL=https://cloud.v1su4.dev/remote.php/dav/files/gordo
NEXTCLOUD_WEBDAV_USER=gordo
NEXTCLOUD_WEBDAV_APP_PASSWORD=<nextcloud-app-password>
NEXTCLOUD_UPLOAD_PREFIX=pindeck/media-uploads
```

Use a Nextcloud app password (not the main account password).

## Folder Creation Behavior

WebDAV does not create nested folders automatically from a `PUT` path.
Convex must create the directory structure before upload.

Required folder creation order:

1. `pindeck`
2. `pindeck/media-uploads`
3. `pindeck/media-uploads/<yyyy>`
4. `pindeck/media-uploads/<yyyy>/<mm>`

Then upload with `PUT` to:

```text
pindeck/media-uploads/<yyyy>/<mm>/<file-name>
```

## Recommended Media Organization

- Year/month partition: `/<yyyy>/<mm>/`
- File names: kebab-case only
- Example: `2026-03-05-customer-demo-01.mp4`

## Minimal WebDAV Method Contract

- `MKCOL` for each missing folder
- `PUT` for file upload
- `PROPFIND` optional, for existence checks and listing

If `MKCOL` returns "already exists", treat that as success and continue.
