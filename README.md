# DICOM Anonymizer

## 🌐 [Use it now → https://toson87.github.io/dicom-anonymizer/](https://toson87.github.io/dicom-anonymizer/)

A browser-based tool for anonymizing DICOM medical imaging files. All processing happens entirely client-side — PHI never leaves your machine.

## Features

- **100% client-side** — files are processed in a Web Worker and never sent to any server
- **Multiple presets** — Minimal, Standard (DICOM PS 3.15 Annex E), ML/Research, Public Release, and Custom
- **Per-tag rule editing** — override the action for any individual DICOM tag in the inspector
- **Batch processing** — anonymize multiple studies at once, with optional per-study ZIP output
- **Study selection** — choose which studies to include via checkboxes in the sidebar
- **Date shifting** — fixed offset or per-patient (derived from PatientID + salt, so reproducible)
- **Pseudonymisation** — SHA-256 based, deterministic across sessions with the same salt
- **UID remapping** — reproducible hash-based or random per-session
- **Patient name modes** — dummy, template (`ANON^{n}`), or realistic fake names
- **Age binning** — round PatientAge to the nearest N months or years
- **DICOM image viewer** — window/level adjustment, multi-slice scrubbing
- **Tag inspector** — inspect raw tag values and configure per-tag rules inline

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

### Build for production

```bash
npm run build        # outputs to dist/
npm run preview      # serve the production build locally
```

## Self-hosting

The app is a static single-page application. Copy the contents of `dist/` to any web server.

A reference nginx config is included at `nginx/dicom-anonymizer.conf`. The `deploy.sh` script builds and deploys to a local nginx setup if you want a one-command workflow.

## How it works

1. Drop DICOM files or a folder onto the app — they are parsed in-browser and organised into a Study → Series → Instance hierarchy
2. Choose an anonymization preset and adjust settings as needed
3. Click **Anonymize** — a Web Worker runs a two-pass pipeline:
   - **Pass 1** — collects all UIDs, pseudonym inputs, and patient IDs across every file
   - **Pass 1.5–1.7** — computes pseudonyms (SHA-256), per-patient date offsets, and patient sequence numbers
   - **Pass 2** — applies rules to each file, serializes back to valid DICOM Part 10 binary, and packages into a ZIP
4. Download the resulting ZIP (one combined archive, or one per study in batch mode)

Pseudonym and date-shift consistency is guaranteed across studies because all pre-computation happens before any file is modified.

## Anonymization actions

| Code | Action | Example use |
|------|--------|-------------|
| `X` | Remove tag | PatientBirthDate |
| `Z` | Zero / empty | PatientName → empty string |
| `D` | Replace with dummy | PatientID → `ANON001` |
| `U` | Remap UID | StudyInstanceUID → hash-based replacement |
| `K` | Keep | PatientSex (demographic utility) |
| `S` | Date shift | StudyDate shifted by N days |
| `M` | Mask | `123-45` → `###-##` |
| `P` | Pseudonymise | AccessionNumber → 12-char hex hash |

## Limitations

- **Burned-in pixel data** — PHI overlaid directly on image pixels is not removed. This is a limitation of all tag-based DICOM anonymizers.
- **Private tags** — vendor-specific private tags may contain PHI. The "Remove private tags" option removes all odd-group tags, which is the safe default.
- **No audit trail** — as a client-side tool there is no server-side logging. Organizations subject to HIPAA or similar regulations should verify that their de-identification workflow meets the relevant standard (e.g., Safe Harbor 18 identifiers).

## Tech stack

- React 19 + TypeScript
- Vite
- [dicom-parser](https://github.com/cornerstonejs/dicomParser) — DICOM parsing
- [JSZip](https://stuk.github.io/jszip/) — ZIP generation
- Web Workers — off-main-thread processing
- Tailwind CSS

## License

MIT
