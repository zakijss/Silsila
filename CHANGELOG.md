# Changelog

All notable changes are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.0.0] - 2026-10-27

The first public release.

### Added

- Reads raw DNA files from FamilyTreeDNA, 23andMe, AncestryDNA, MyHeritage
  and Living DNA in the browser; nothing is uploaded.
- Places a paternal line on the FamilyTreeDNA Y tree, with ages from YFull,
  ancient samples, notable lines, STR markers and matches.
- Net, Timeline, Map, Genome and Database views, and a one-to-one comparison
  of two autosomal files.
- `tools/` builds the reference data; a Containerfile and compose file build
  and serve it, and `deploy/silsila.container` runs it as a rootless Quadlet.

[Unreleased]: https://github.com/zakijss/Silsila/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/zakijss/Silsila/releases/tag/v1.0.0
