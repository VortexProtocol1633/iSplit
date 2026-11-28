# Security Policy

## Supported versions

iSplit is a static site deployed from `main`. Only the latest revision receives security fixes.

| Version | Supported |
| --- | --- |
| Latest `main` / hosted app | ✅ |
| Older commits, forks, self-hosted copies | ❌ |

## Reporting a vulnerability

**Please do not open a public issue with exploit details.**

Use GitHub's private reporting flow:

1. Go to the repository's **Security** tab → **Advisories** → **[Report a vulnerability](https://github.com/VortexProtocol1633/iSplit/security/advisories/new)**.
2. Include the affected browser, a description of the issue, step-by-step reproduction, impact, and a proof of concept if you have one.

If private advisories are unavailable, contact the maintainer privately through [@VortexProtocol1633](https://github.com/VortexProtocol1633) and ask for a private channel. Never attach a real private document; use a minimal synthetic file.

This is a volunteer project, so responses are best-effort. Please allow reasonable time for a fix before disclosing details publicly.

## Scope

iSplit runs entirely in the browser. Relevant reports include:

- Script injection or cross-site scripting through file names, PDF metadata, or filenames rendered into the UI
- Bugs in how untrusted PDFs/images are parsed or rendered (including PDF.js behavior)
- Exposure of local files or settings beyond the current origin
- Leaks of file data to a third party
- Vulnerabilities in the pinned PDF.js or jsPDF versions, or unsafe CDN loading
- Bypasses of the “files never leave the browser” guarantee

## Known third-party requests

The static page loads:

- `cdnjs.cloudflare.com` — PDF.js 3.11.174 and jsPDF 2.5.1
- `fonts.googleapis.com`, `fonts.gstatic.com` — Poppins

These requests expose the visitor's IP address to those providers, as with any web request. The app has no backend, no analytics, and no server-side storage. Self-hosters who need offline or air-gapped operation should vendor the libraries and font locally.

## Out of scope

- Missing security headers on third-party hosts that are outside this repository's control
- Attacks that require an already-compromised browser, extension, or operating system
- Resource exhaustion caused by intentionally loading enormous files on the user's own machine
- Reports about the demo artwork or creator photo
