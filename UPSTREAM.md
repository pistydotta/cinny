# Blazeroom web: Cinny hard fork

Imported on 2026-11-04 from `pistydotta/cinny`, branch `blazeroom`, frozen commit
`03a61407f0ca2574ab9255640f7237ad5677d9b4` (`blazeroom-v57`). This matches the last
client source tag selected before the monorepo migration. The original history is
preserved by a non-squashed subtree import; original commits retain their hashes.

Original project: <https://github.com/cinnyapp/cinny>. Original copyright notices,
the AGPL-3.0-only LICENSE and third-party assets/notices are retained. Blazeroom's
modifications add its Matrix chat, friends, calls, games and platform integration.
The 2026-11-04 hard-fork changes move development to `web/`, make local API access
safe by default, and add version-specific public-source links. This remains a
modified Cinny, not a new independently authored client.

Future upstream changes are reviewed/cherry-picked on monorepo feature branches.
There is no automatic upstream merge or cross-repository deploy-PR cycle. The old
public repository remains a source mirror with a `source` branch and immutable
`web-<tree-sha>` tags. See [SOURCE.md](SOURCE.md) for building and licensing.
