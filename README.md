# JSON Calendar Generator

Standalone browser-based form generator for calendar-entry JSON files, image attachments, and optional FTP/FTPS uploads.

## Run locally

```bash
npm install
npm start
```

Open <http://localhost:3000>.

## Generated references and reset

The Node.js server stores the reference counter in the local, runtime-generated file `reference-counter.json` next to `server.js`. Each newly opened or hard-reset form requests the next reference in this sequence:

```text
WID000, WID001, WID002, ...
```

This makes the sequence shared across browsers and devices using the same server. The counter file is excluded from Git. **Hard reset** clears the form, selected images, and weekday rows, asks for confirmation, and requests a new reference. It does not reset the server counter.

## Fixed URL and JSON filename

The JSON `url` field is always `www.gasthofzumwidder.ch`. The JSON filename is always based on `location_id`, for example `Zurich.json`.

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

The upload creates `<FTP_BASE_DIR>/<event-title>/`, containing `<location_id>.json` and the image files.

### Configure and start

```bash
export FTP_HOST=ftp.example.com
export FTP_PORT=21
export FTP_USER=your-user
export FTP_PASSWORD='your-password'
export FTP_BASE_DIR=/calendar-events
export FTP_SECURE=true
npm install
npm start
```

Open <http://localhost:3000>, complete the form, choose images, and click **Upload to FTP server**. `FTP_SECURE=true` enables explicit FTPS; plain FTP is not recommended.

The upload request is limited to 50 MB. Keep FTP credentials in server-side environment variables and do not expose the Node.js server publicly without authentication and HTTPS.
