# pi-research-mode

A [Pi](https://github.com/earendil-works/pi) extension adding a **research mode**:
a read-only session mode for safe investigation. While active it:

- removes the built-in `edit` and `write` tools and blocks them even if they are
  re-activated;
- restricts `bash` to a known read-only allowlist (`cat`, `grep`, `rg`, `find`,
  `fd`, `jq`, `git log`/`status`/`diff`, …) and blocks commands marked
  destructive;
- activates the tools of the configured **research backends** directly for the
  model. The default backend is [ketch](https://github.com/...): web search,
  public-code search, curated docs, page scrape, bounded crawl, and bookmarking.

Research backends are pluggable. `ketch` is one implementation of the
`ResearchBackend` interface; swapping in another search provider means adding a
module under `extensions/research-mode/backends/` and listing it in
`backends/registry.ts`.

## Usage

Inside a Pi session:

```
/research
```

toggles the mode. Start a session already in research mode with:

```sh
pi --research
```

The footer shows `🔎 research` while active.

ketch is normally reachable from codemode scripts (its `mcp.json` exposure is
`codemode`); research mode only changes what is *declared* to the model for the
duration of the mode.

## Layout

```
extensions/research-mode/
├─ index.ts            # entry: command, flag, event wiring
├─ mode.ts             # state machine, toolset swap, persistence, context
├─ guard.ts            # tool_call guard (write tools, bash, destructive tools)
├─ bash-allowlist.ts   # read-only bash patterns
└─ backends/
   ├─ types.ts         # ResearchBackend interface
   ├─ registry.ts      # enabled backends
   └─ ketch.ts         # ketch backend
```

## Development

A dev shell provides Node and `tsc`:

```sh
nix develop
npm install   # fetch the Pi peer dependencies for typechecking
typecheck
```

## Deployment

This repo is consumed as a source flake input (it exports a dev shell only):

```nix
inputs.pi-research-mode = {
  url = "github:brhutchins/pi-research-mode";
  flake = false;
};
```

and linked into Pi's user extensions directory:

```nix
home.file.".pi/agent/extensions/research-mode".source =
  "${inputs.pi-research-mode}/extensions/research-mode";
```

## License

MIT
