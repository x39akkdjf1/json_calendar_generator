# JSON Calendar Generator

Standalone browser-based form generator for calendar-entry JSON files, image attachments, and optional FTP/FTPS uploads.

## Run locally

```bash
npm install
npm start
```

Open <http://localhost:3000>.

## Generated references and reset

Each newly opened or hard-reset form receives the next locally persisted reference in this sequence:

```text
WID000, WID001, WID002, ...
```

The counter is stored in the browser's local storage, so reloading the page does not reuse a reference. **Hard reset** clears the form, selected images, and weekday rows, but deliberately does not reset the reference counter. The reset action always asks for confirmation first.

## Fixed URL and JSON filename

The JSON `url` field is always set to:

```text
www.gasthofzumwidder.ch
```

The JSON filename is always based on `location_id`:

```text
<location_id>.json
```

The browser downloads a ZIP because it cannot directly create a local directory. The ZIP uses the event title as its directory name:

```text
My-Event.zip
└── My-Event/
    ├── Zurich.json
    ├── poster.jpg
    └── banner.png
```

## FTP upload manual

The browser cannot connect to an FTP server directly. The local Node.js server performs the upload after you click **Upload to FTP server**. FTP credentials remain on the server and are not sent to the browser.

The upload creates this remote structure:

```text
<FTP_BASE_DIR>/<event-title>/
├── <location_id>.json
├── poster.jpg
└── banner.png
```

### 1. Configure the server

```bash
export FTP_HOST=ftp.example.com
export FTP_PORT=21
export FTP_USER=your-user
export FTP_PASSWORD='your-password'
export FTP_BASE_DIR=/calendar-events
export FTP_SECURE=true
```

`FTP_SECURE=true` enables explicit FTPS. Plain FTP is not recommended. The server uses the `basic-ftp` package.

### 2. Install and start

```bash
npm install
npm start
```

Complete the form, choose images, and click **Upload to FTP server**.

### 3. Security

- The upload request is limited to 50 MB.
- Titles, location IDs, and filenames are sanitized before use in paths.
- Keep FTP credentials in server-side environment variables.
- Do not expose the Node.js server publicly without authentication and HTTPS.
- Prefer FTPS or SFTP for sensitive data.
