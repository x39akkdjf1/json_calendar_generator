# JSON Calendar Generator

Standalone browser-based form generator for calendar-entry JSON files and image attachments.

## Run locally

```bash
npm start
```

Open http://localhost:3000.

## Export behavior

The browser downloads a ZIP because it cannot directly create a local directory. The ZIP uses the event **title as its directory name** and puts the JSON file and image attachments together in that same directory:

```text
My-Event.zip
└── My-Event/
    ├── event.json
    ├── poster.jpg
    └── banner.png
```

The generated JSON uses image filenames as relative URLs in `image`:

```json
"image": ["poster.jpg", "banner.png"]
```

Times are entered and saved in European 24-hour format (`HH:MM`, for example `18:30`). Categories are a multi-select and are saved as numeric IDs. `location_id` contains the entered location name.
