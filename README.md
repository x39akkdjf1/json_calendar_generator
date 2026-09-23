# JSON Calendar Generator

Standalone browser-based form generator for calendar-entry JSON files, image attachments, and optional FTP/FTPS uploads.

## Run locally

```bash
npm install
npm start
```

Open <http://localhost:3000>.

## Export behavior

The browser downloads a ZIP because it cannot directly create a local directory. The ZIP uses the event **title as its directory name** and puts the JSON file and image attachments together in that same directory:

```text
My-Event.zip
└── My-Event/
    ├── event.json
    ├── poster.jpg
    └── banner.png
```

The generated JSON uses image filenames as relative URLs in `image` and category IDs in `category`. Times use 24-hour `HH:MM` format, and `location_id` contains the entered location name.

## FTP upload manual

The browser cannot connect to an FTP server directly. The local Node.js server performs the upload after you click **Upload to FTP server**. FTP credentials remain on the server and are not sent to the browser.

The upload creates this remote structure:

```text
<FTP_BASE_DIR>/<event-title>/
├── event.json
├── poster.jpg
└── banner.png
```

### 1. Configure the server

Create a `.env`-style environment configuration in your shell. Do not commit credentials to Git:

```bash
export FTP_HOST=ftp.example.com
export FTP_PORT=21
export FTP_USER=your-user
export FTP_PASSWORD='your-password'
export FTP_BASE_DIR=/calendar-events
export FTP_SECURE=true
```

`FTP_SECURE=true` enables explicit FTPS. For plain FTP, set `FTP_SECURE=false` or omit it. Plain FTP is not recommended because credentials and files are not encrypted. The server currently supports FTP and FTPS through the `basic-ftp` Node.js package; use SFTP only after adding an SFTP-specific adapter.

Optional FTPS certificate setting:

```bash
export FTP_REJECT_UNAUTHORIZED=false
```

Use that only when the FTP server has a certificate that cannot be validated; trusted certificates should remain enabled.

### 2. Install and start

```bash
npm install
npm start
```

Open <http://localhost:3000>, complete the form, choose images, and click **Upload to FTP server**.

### 3. Upload limits and security

- The upload request is limited to 50 MB by the local Node.js server.
- The title is sanitized before it is used as the remote directory name.
- Image filenames are sanitized before upload.
- Configure FTP credentials only as server-side environment variables.
- Do not expose the Node.js server publicly without adding authentication and HTTPS.
- For production or sensitive data, prefer FTPS or an SFTP implementation.

A successful upload displays the remote directory returned by the server. If configuration is missing or the FTP connection fails, the error appears below the upload buttons.
