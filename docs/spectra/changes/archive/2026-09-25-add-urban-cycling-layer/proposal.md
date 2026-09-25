## Why

Riders who leave the riverside paths to reach a station or a shop ride city streets, where it matters which streets have a bike path and where they will stop at traffic lights or cross the road. The map shows none of this today, so riders cannot plan the urban leg.

## What Changes

- Add a build-time step that fetches urban bike paths in Taipei City and New Taipei City from OpenStreetMap: separate cycleways (`highway=cycleway`) and painted or separated lanes on roads (`cycleway`, `cycleway:both`, `cycleway:left`, `cycleway:right` equal to `lane` or `track`). Ways that belong to a riverside route are excluded, so this layer covers only the urban network. Sidewalk shared paths (人車共道) are excluded.
- The same step fetches traffic signals and pedestrian crossings within 30 m of those urban paths, and publishes paths and points to a new static file `public/data/cycling.json`.
- Add an independent map layer 「都市自行車道」 with its own toggle, off by default. When on, it draws urban bike paths and, at street-level zoom, marks traffic signals and crossings along them with distinct icons and a legend.
- The data pipeline refuses to publish when the urban paths or the signal and crossing points come back suspiciously small.

## Non-Goals (optional)

Recorded in design.md.

## Capabilities

### New Capabilities

- `cycling-layer`: The urban bike-path overlay on the map, with traffic signals and crossings along the paths, and its toggle.

### Modified Capabilities

- `supply-data`: the pipeline also produces `public/data/cycling.json` (urban bike paths, traffic signals, crossings) and guards its counts.

## Impact

- Depends on change `prioritize-riverside-stations`: it reuses the riverside route query to exclude riverside ways, and extends the same MapControls toggles. Apply it after that change.
- Affected code: scripts/fetch-data.js, scripts/lib/check-counts.js, a new cycling-layer module under scripts/lib/, app/pages/index.vue, app/components/MapControls.vue, app/components/SupplyMap.client.vue, a new data loader for cycling.json under app/utils/.
- Data: new public/data/cycling.json, about 580 KB uncompressed and about 104 KB gzipped (measured from a 2026-09-25 probe); public/data/meta.json gains counts for it.
- External services at build time: one additional Overpass API query.
- README: feature list and data-source table mention the urban bike-path layer.
