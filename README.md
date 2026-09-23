# JSON Calendar Generator

A standalone browser-based form generator for creating a calendar event JSON payload and packaging it together with selected image attachments.

## Features

- Form matching the required JSON structure
- Dynamic `weekdays` entries
- Multiple image attachment support
- Save generated JSON locally
- Download a folder-style ZIP archive containing:
  - `event.json`
  - `imageattachments/` folder with the selected image files
- Runs as a static HTML page and can also be served locally with Node.js

## Run locally

Using Node.js:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

## Browser export behavior

The browser cannot create a real local folder directly, so the tool downloads a ZIP archive that expands into a local directory structure.

The package contains:

```text
calendar_export/
├── event.json
└── imageattachments/
    ├── image-1.jpg
    └── image-2.png
```

## JSON structure

The generated object matches the requested structure:

```json
{
  "reference": "",
  "title": "",
  "description": "",
  "image": ["imageattachments/example.jpg"],
  "url": "",
  "date": "",
  "date_end": "",
  "time_start": "",
  "time_end": "",
  "weekdays": [
    {
      "day": "",
      "time_start": "",
      "time_end": "",
      "fee": ""
    }
  ],
  "category": "",
  "location_id": ""
}
```
