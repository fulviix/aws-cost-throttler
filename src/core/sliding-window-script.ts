import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SCRIPT_PATH = join(__dirname, "sliding-window.lua");

export const SLIDING_WINDOW_SCRIPT = readFileSync(SCRIPT_PATH, "utf-8");
