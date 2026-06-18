# Maps & geospatial

Queries **public map and geospatial datasets** for location verification and context.

## Common inputs

- Bounding box
- Coordinate pair
- Place name
- Feature tag (OSM)
- Road / building / landmark query

## Common outputs

- Nodes, ways, relations (OSM)
- Coordinates
- Feature metadata
- Administrative boundaries

## Useful components

- [Map](/docs/ui/map) renderer
- Location candidate list
- Feature matcher
- Geolocation evidence card

## Reference stack

| Resource | Role |
|----------|------|
| [OpenStreetMap](https://www.openstreetmap.org/) | Base map data |
| [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) | Query engine for OSM |
| Overpass Turbo | Interactive query prototyping |
| [Bellingcat geolocation guides](https://bellingcat.gitbook.io/toolkit) | Verification methodology |

Overpass is a database engine for OSM; typical use is finding features by tags, rough location, or name.

## Tool patterns

- [Media verification workspace](/docs/patterns/media-verification-workspace)
