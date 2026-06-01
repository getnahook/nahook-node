# Changelog

All notable changes to this SDK are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/) and
this project follows [Semantic Versioning](https://semver.org/).

## [0.2.2] - 2026-06-01

### Documentation

- Removed endpoint metadata field from the README endpoint-creation example. The SDK still accepts `metadata` in `endpoints.create()` payloads for backward compatibility — only the example was scrubbed while metadata is not yet a queryable / filterable field.

## [0.2.1] - 2026-05-31

### Features

- Close() for graceful lifecycle teardown

## [0.2.0] - 2026-05-31

### Features

- HTTP/2 + tuned keep-alive by default + BYO fetch
- Add Deliveries resource to @nahook/management

## [0.1.1] - 2026-05-25

### Features

- Expose optional environmentId on endpoints.create
- Add environments resource to the management client
- Embed workspace region in API keys for SDK auto-routing

### Bug Fixes

- Add @types/node + skip workspaces without build script
- Import randomUUID from node:crypto explicitly
- Put "types" first in exports map (Node spec compliance)
- Add PUT to RequestOptions HTTP method union
- Address code review findings across SDK environments resource
- Align SDK with actual API — pagination, return types, User-Agent
- SDK review fixes — auto-generate idempotency keys, deduplicate retry loop, fix Content-Type

## [0.1.0] - 2026-04-10

### Features

- Initial release of @nahook/client and @nahook/management
