# JSON Calendar Generator

Standalone browser-based form generator for calendar-entry JSON files, image attachments, and optional FTP/FTPS uploads.

## Run locally

```bash
npm install
npm start
```

Open <http://localhost:3000>.

## FTP credentials with a local `.env` file

FTP credentials are loaded by the Node.js server from a local `.env` file. They are never sent to the browser.

1. Copy the example file:

```bash
cp .env.example .env
```

2. Edit `.env` and replace the placeholder values:

```env
FTP_HOST=ftp.example.com
FTP_PORT=21
FTP_USER=your-ftp-username
FTP_PASSWORD=your-ftp-password
FTP_BASE_DIR=/calendar-events
FTP_SECURE=true
```

3. Start or restart the server:

```bash
npm install
npm start
```

The server reads `.env` when it starts. Restart `npm start` after changing credentials.

`.env` is ignored by Git. Never commit it or share it publicly. `.env.example` contains placeholders only and is safe to commit. Plain FTP is not recommended; use `FTP_SECURE=true` for explicit FTPS when supported by your provider.

## Generated references and reset

The Node.js server stores the reference counter in the local, runtime-generated file `reference-counter.json` next to `server.js`. Each newly opened or hard-reset form requests the next reference:

```text
WID000, WID001, WID002, ...
```

The sequence is shared across browsers and devices using the same server. **Hard reset** clears the form, selected images, and weekday rows, asks for confirmation, and requests a new reference. It does not reset the server counter.

## Fixed URL and JSON filename

The JSON `url` field is always `www.gasthofzumwidder.ch`. The JSON filename is based on `location_id`, for example `Zurich.json`.

The browser downloads a ZIP because it cannot directly create a local directory. The ZIP uses the event title as its directory name:

```text
My-Event.zip
└── My-Event/
    ├── Zurich.json
    ├── poster.jpg
    └── banner.png
```

## FTP upload

After configuring `.env`, complete the form, choose images, and click **Upload to FTP server**. The upload creates `<FTP_BASE_DIR>/<event-title>/`, containing `<location_id>.json` and the image files.

The upload request is limited to 50 MB. Keep the Node.js server local or protect it with authentication and HTTPS before exposing it publicly.
