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
PUBLIC_IMAGE_BASE_URL=https://www.gasthofzumwidder.ch/kalender
```

Alternatively, use an SSH private key:

```env
SFTP_PRIVATE_KEY=./id_ed25519
```

The SFTP base directory must map to the public HTTPS directory `/kalender`. The credentials and `.env` file must never be committed.

## SFTP upload behavior

The application uses SFTP on port 22. Images are uploaded directly into `SFTP_BASE_DIR` and are referenced in JSON as public HTTPS URLs:

```json
"image": [
  "https://www.gasthofzumwidder.ch/kalender/poster.jpg"
]
```

Events are accumulated in one JSON file named after the fixed `location_id`:

```text
SFTP_BASE_DIR/199.json
```

The JSON object is keyed by each event's `reference`:

```json
{
  "WID000": {
    "reference": "WID000",
    "location_id": "199",
    "image": ["https://www.gasthofzumwidder.ch/kalender/poster.jpg"]
  },
  "WID001": {
    "reference": "WID001",
    "location_id": "199"
  }
}
```

When uploading, the server downloads the existing `199.json` over SFTP, adds or replaces the dataset under the current reference, uploads the updated JSON, and then uploads the images to `SFTP_BASE_DIR`.

## Export behavior

Browser downloads use `199.json` inside a ZIP named after the event title. FTP/SFTP uploads are the authoritative way to update the shared aggregate JSON file.

## Security

- Keep `.env` and SSH private keys outside Git.
- Use SFTP rather than FTP because the connection is encrypted.
- Do not expose the local Node.js server publicly without authentication and HTTPS.
- The request body is limited to 50 MB.
