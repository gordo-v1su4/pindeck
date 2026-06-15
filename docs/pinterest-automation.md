# Pinterest Automation Notes

Pindeck should treat Pinterest as an approval-first ingest source, not as a
direct publish path.

## Current Decision

Use a scheduled poller for Pinterest boards. The poller should:

1. Authenticate with the Pinterest API for the account that owns the watched
   boards.
2. Resolve watched board names or URLs to stable board IDs.
3. Poll board pins on a schedule.
4. Store the last seen pin IDs per watched board.
5. POST each new pin image to Pindeck's `/ingestExternal` endpoint with:

```json
{
  "sourceType": "pinterest",
  "source": "Pinterest",
  "sourceUrl": "https://www.pinterest.com/pin/...",
  "externalId": "pinterest:<pin-id>",
  "tags": ["pinterest", "<board-name>"],
  "userId": "<pindeck-user-id>"
}
```

Pinterest imports are now moderated imports. They enter Pindeck with
`status: "pending"` and `aiStatus: "queued"` and must be approved before
metadata analysis or publishing continues.

## Automation Options

- Official Pinterest API: preferred for production. Use board and pin endpoints
  plus a scheduled poller. This is durable, debuggable, and does not depend on a
  third-party automation vendor.
- Zapier/Make/Pipedream: acceptable bridges if they provide the needed Pinterest
  trigger for the account. They should still call `/ingestExternal` with
  `sourceType: "pinterest"` so Pindeck keeps the same approval gate.
- Manual URL import: useful as a fallback workflow, but not the target
  automation.

## Non-Goal

Do not auto-publish new pins directly into the gallery. New Pinterest items
should land in the Pinterest queue so bad pins, duplicates, and wrong-board
items stay visible and can be discarded.
