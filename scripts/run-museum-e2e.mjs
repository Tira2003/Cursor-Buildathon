/**
 * End-to-end museum flow via Convex internal action (live Groq + Serper).
 * Usage: node scripts/run-museum-e2e.mjs [path-to-image.png]
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultImage = path.join(
  "C:",
  "Users",
  "itsps",
  ".cursor",
  "projects",
  "c-Users-itsps-Downloads-AltEra",
  "assets",
  "c__Users_itsps_AppData_Roaming_Cursor_User_workspaceStorage_d48acff42bed419320d766083c813c01_images_image-28721802-daa2-4d03-8592-784211deae15.png",
);

const imagePath = path.resolve(process.argv[2] ?? defaultImage);
if (!fs.existsSync(imagePath)) {
  console.error("Image not found:", imagePath);
  process.exit(1);
}

console.log("Image:", imagePath);
console.log("Uploading to temporary host…");

const bytes = fs.readFileSync(imagePath);
const form = new FormData();
form.append("file", new Blob([bytes], { type: "image/png" }), path.basename(imagePath));
const uploadRes = await fetch("https://tmpfiles.org/api/v1/upload", {
  method: "POST",
  body: form,
});
if (!uploadRes.ok) {
  console.error("Upload failed:", uploadRes.status, await uploadRes.text());
  process.exit(1);
}
const uploadJson = await uploadRes.json();
const pageUrl = uploadJson?.data?.url ?? uploadJson?.url;
if (!pageUrl) {
  console.error("Unexpected upload response:", uploadJson);
  process.exit(1);
}
// tmpfiles.org serves downloads at /dl/… instead of /w…/
const imageUrl = pageUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
console.log("Public URL:", imageUrl);
console.log("Running Convex test/museumE2E:runFromImageUrl (push + live APIs)…\n");

const args = JSON.stringify({ artifactUrl: imageUrl });
const out = execSync(
  `npx convex run --push --typecheck disable test/museumE2E:runFromImageUrl ${JSON.stringify(args)}`,
  { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
);

console.log(out);
