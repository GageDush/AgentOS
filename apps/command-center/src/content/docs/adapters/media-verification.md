# Media verification

Helps verify **public images or videos** using metadata, reverse search, and archival context.

## Common inputs

- Image file or URL
- Video file or URL
- Extracted frame / keyframe
- Content hash
- Embedded metadata

## Common outputs

- Reverse image match URLs
- Keyframe set
- EXIF / container metadata
- Similar images list
- Prior appearance pages
- Source page URLs

## Useful components

- Keyframe extractor
- Reverse-search launcher (opens permitted third-party tools)
- Metadata viewer
- [Timeline](/docs/ui/timeline) builder
- Visual evidence board

## Tool patterns

- [Media verification workspace](/docs/patterns/media-verification-workspace)

## Reference

[Bellingcat Toolkit](https://bellingcat.gitbook.io/toolkit) — photo/video verification section. [Google Fact Check Tools](https://toolbox.google.com/factcheck/) for claim context.

Store every match as [Evidence vault](/docs/components/evidence-vault) item with screenshot + archive link.
