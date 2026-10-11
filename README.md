# NOVA-16

A fantasy 16-bit game console that runs in the browser. Games ("carts") are
written in JavaScript against a small API, under fixed SNES-era hardware
limits.

- Specification: [docs/SPEC.md](docs/SPEC.md)

## Running locally

Module workers and AudioWorklets need HTTP, so `file://` will not work. From
the repository root:

```sh
python3 -m http.server 8000
```

Then open <http://localhost:8000/>.

## Development

Pure ES modules, no build step and no runtime dependencies. CI runs a syntax
check on every source file:

```sh
find src -name '*.js' -print0 | xargs -0 -n1 node --check
```
