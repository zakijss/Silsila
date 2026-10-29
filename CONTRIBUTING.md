# Contributing to Silsila

Bug reports, ideas and pull requests are welcome. Use the issue forms for
the first two; for security problems, see [SECURITY.md](SECURITY.md).

Silsila is a static page: no build step, no server side and no requests to
other sites. Please keep it that way. Never attach or paste a real DNA file
to an issue or a pull request; the files in `test/fixtures` show each format
with invented rows.

The reference data is built from sources that may not be redistributed (see
[THIRD-PARTY.md](THIRD-PARTY.md)), so it stays out of the repository and
there is no published image.

## Before a pull request

Run the checks CI runs:

```
node test/genome.test.js
for f in js/*.js data/*.js; do node --check "$f"; done
```

Keep a pull request to one change, and say in it what changed and why.
Update the README where the change matters to someone running Silsila, and
add a line under "Unreleased" in [CHANGELOG.md](CHANGELOG.md).

By contributing you agree that your work is released under the
[MIT licence](LICENSE).
