// Solmar Bay — the entrypoint for make.fun's gta6-01 "Make GTA 6" bounty.
// Node 22, standard library only. It hands the game in: copies this
// repository's game/ and screenshots/ into the output directory (which the
// grader mounts at /output, or MAKEFUN_OUTPUT_DIR when run by hand) and
// writes /output/dossier.json with the kit's vendored library.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The two runs the grader performs must write identical bytes, so this
// program does nothing time- or random-dependent: a straight copy plus a
// deterministic dossier built from the copied files.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// Caps mirror the gate in the kit's RULES.txt: at most 4 screenshots of
// 256 KiB, a game/ of at most 993 files and 48 MiB, and a dossier text
// capped at 160 KiB. The dossier is rebuilt by the gate from the same
// files, so these numbers must stay in step with the rules.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
