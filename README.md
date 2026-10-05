# JSON Calendar Generator

Standalone browser-based form generator for calendar-entry JSON files, image attachments, and SFTP uploads.

## Run locally

```bash
npm install
npm start
```

Open <http://localhost:3000>.

## SFTP configuration

The Node.js server loads credentials from a local `.env` file. Copy the example and edit it:

```bash
cp .env.example .env
```

Example:

```env
SFTP_HOST=sftp.example.com
SFTP_PORT=22
SFTP_USER=your-sftp-username
SFTP_PASSWORD=your-sftp-password
SFTP_BASE_DIR=/path/to/public/kalender
PUBLIC_IMAGE_BASE_URL=https://example.com/kalender
```

Alternatively, use an SSH private key:

```env
SFTP_PRIVATE_KEY=/path/to/ssh/private-key-4827
SFTP_PRIVATE_KEY_PASSPHRASE=your-key-passphrase
```

The SFTP base directory must map to the public HTTPS directory `/kalender`. The credentials and `.env` file must never be committed.

## SFTP upload behavior

The application uses SFTP on port 22. Only one image per event is allowed; it is uploaded directly into `SFTP_BASE_DIR` and referenced in JSON as a public HTTPS URL:

```json
"image": "https://example.com/kalender/poster.jpg"
```

Video URLs or other attachment entries can be entered one per line. They are stored as a string array, with blank lines omitted:

```json
"attachments": [
  "https://example.com/video",
  "Any other user-entered entry"
]
```

Events are accumulated in one JSON file named after the fixed `location_id`:

```text
SFTP_BASE_DIR/199.json
```

The events are stored as an array and upserted by each event's `reference` (legacy object-shaped files are converted to an array when read):

```json
[
  {
    "reference": "WID000",
    "location_id": "199",
    "image": "https://example.com/kalender/poster.jpg",
    "attachments": ["https://example.com/video"]
  },
  {
    "reference": "WID001",
    "location_id": "199"
  }
]
```

When uploading, the server downloads the existing `199.json` over SFTP, adds the event to the array or replaces the one with the current reference, uploads the updated JSON, and then uploads the images to `SFTP_BASE_DIR`.

## Export behavior

Browser downloads use `199.json` inside a ZIP named after the event title. FTP/SFTP uploads are the authoritative way to update the shared aggregate JSON file.

## TODOs

- Fix reference numbers.
- Add a list of all saved entries.
- Find a solution for WordPress import.

## Security

- Keep `.env` and SSH private keys outside Git.
- Use SFTP rather than FTP because the connection is encrypted.
- Do not expose the local Node.js server publicly without authentication and HTTPS.
- The request body is limited to 50 MB.
