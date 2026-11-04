# Source, license and rebuilding

Blazeroom web is a modified Cinny, licensed AGPL-3.0-only; see [LICENSE](LICENSE)
for copyright conditions, redistribution rights and the absence of warranty.
See [UPSTREAM.md](UPSTREAM.md) for attribution and modification dates. Third-party
dependencies and assets retain their own licenses and notices.

The public source mirror is <https://github.com/pistydotta/cinny/tree/source>.
Every deployed build's Source code links select an immutable `web-<tree-sha>` tag
in that repository. The tag's root tree is exactly the tracked web source used to
build that client. Older tags remain available; a failed rollout may also leave
a published candidate tag, which must not be described as a successful deployment.

Build from a source tag with Node 24 and npm:

```sh
npm ci
npm run check:blazeroom
VITE_BLAZEROOM_SOURCE_REF=web-<tree-sha> npm run build
```

`dist/` contains the static application. Serve it with the included
`docker-nginx.conf` (SPA fallback), or build the included Dockerfile:

```sh
docker build --build-arg SOURCE_REF=web-<tree-sha> -t blazeroom-web .
docker run --rm -p 8080:80 blazeroom-web
```

Copy/edit the checked-in `config.json` for a local Matrix deployment as needed;
the production deployment mounts its generated public client config at
`/app/config.json`. No private server repository, credentials, database, signing
key or production account is needed to build/modify the web client.

For development, `npm start` serves port 8080 and proxies `/api` ONLY to
`http://127.0.0.1:3000`. Run a local API for those features. The API and Matrix
homeserver are separately operated services; do not point tests at real accounts.

`package-lock.json` records dependency versions, registry tarballs and integrity
hashes. `npm ci` retrieves those exact package distributions, including their
available source and license notices. For non-System-Library components whose
preferred source is not in their package distribution, retain the corresponding
upstream source alongside the dependency version when updating it. In particular,
the build copies Element Call embedded assets and RNNoise/WASM assets; their
source projects are <https://github.com/element-hq/element-call>,
<https://github.com/sapphi-red/web-noise-suppressor> and
<https://github.com/xiph/rnnoise>. Updates must verify matching preferred sources
and preserve third-party notices, rather than treating compiled assets as source.
[DEPENDENCY-SOURCES.json](DEPENDENCY-SOURCES.json) records immutable source
references for the directly embedded prebuilt components in this import.

The public snapshot includes the client Dockerfile, Vite configuration, lockfile,
scoped validation script, assets and all client source. Only the web tree is
published; private server history and its operational secrets never belong in it.
