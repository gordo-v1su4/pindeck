# Pinterest Automation Notes

Pindeck treats Pinterest as an approval-first ingest source. New Pinterest
items should land in the Pinterest review queue, then be approved before they
become normal library references or feed AI variation workflows.

## Current Decision

Use the Pinterest ingest sidecar in the standalone `discord-bot` repository.
It runs as a sibling Docker Compose service beside the Discord worker and
legacy media gateway. The sidecar uses `gallery-dl` with an exported Pinterest
browser cookie file to read watched Pinterest boards or profiles.

The sidecar has two jobs:

1. Expose RSS feeds like `/feeds/pinterest/<source>.xml` so FreshRSS can
   subscribe to Pinterest boards without a paid RSS.app-style service.
2. Forward new Pinterest images to Pindeck's `/ingestExternal` endpoint with
   `sourceType: "pinterest"`.

The sidecar does not store image files long-term. It stores only source
metadata, dedupe state, run status, and RSS entries in SQLite. Pindeck owns the
durable image copy: `/ingestExternal` downloads the media URL, persists the file
to RustFS, creates the database record, extracts colors, and keeps the original
Pinterest page URL on the image as source metadata.

## Pindeck Payload

```json
{
  "sourceType": "pinterest",
  "source": "Pinterest",
  "imageUrl": "https://i.pinimg.com/originals/...",
  "sourceUrl": "https://www.pinterest.com/pin/...",
  "externalId": "pinterest:<source-slug>:<pin-id>",
  "tags": ["pinterest", "<source-slug>"],
  "userId": "<pindeck-user-id>"
}
```

Pinterest imports are moderated imports. They enter Pindeck with
`status: "pending"` and `aiStatus: "queued"` and must be approved before
metadata analysis or publishing continues.

## Runtime

The service is packaged at `discord-bot/services/pinterest-ingest`.
The Pindeck app repo owns the `/ingestExternal` endpoint and review workflow;
the Discord bot repo owns always-on worker deployment.

Required for Pindeck sync:

- `PINDECK_INGEST_URL`
- `PINDECK_INGEST_API_KEY` or the shared Discord worker `INGEST_API_KEY`
- `PINDECK_USER_ID`

Required for Pinterest extraction:

- `PINTEREST_COOKIES_PATH`, defaulting to `/secrets/pinterest-cookies.txt`

Persistent data:

- `DATABASE_PATH`, defaulting to `/data/pinterest-ingest.sqlite`

## Failure Policy

Do not add fallbacks that make broken extraction look healthy.

- Missing cookies fail the run.
- `gallery-dl` errors fail the run.
- Pinterest output without a usable media URL is skipped; a run with no usable
  image records fails.
- Pindeck ingest failures stay attached to the item and are visible in sync
  results.

## Non-Goal

Do not auto-publish new pins directly into the gallery. New Pinterest items
should land in the Pinterest queue so bad pins, duplicates, and wrong-board
items stay visible and can be discarded.
