# vite-plus

## Added

- **providers:** `vp-g`, the global packages Vite+ installs with `vp install -g`. They live in
  Vite+'s own data directory, outside npm's and pnpm's global prefix, so no provider saw them:
  `vp outdated -g --format json` lists them and `vp update -g --latest` updates them, past the
  range a package was installed with. A failure vp reports itself (`error: …`) shows as a scan
  error rather than as "up to date" (`feat(providers): add the Vite+ global packages provider`)
- **providers:** `self:vp`, Vite+ itself. `vp --version` is compared with the `vite-plus` npm
  package that `vp upgrade` installs from, and `vp upgrade` updates it
  (`feat(providers): track Vite+ in the package managers' self-updates`)
