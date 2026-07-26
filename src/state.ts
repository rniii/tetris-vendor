import { writeFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";

interface State {
    helloResponse?: [token: string, messageId: string];
}

const state = await readFile("state.json", "utf8").then(JSON.parse).catch(() => ({}));

let dirty = false;
async function saveSettings() {
    dirty = true;
    await writeFile("state.json", JSON.stringify(state));
    dirty = false;
}

process.on("exit", () => dirty && writeFileSync("state.json", JSON.stringify(state)));

export function setState<K extends keyof State>(key: K, value: State[K]) {
    state[key] = value;
    saveSettings();
}

export function getState<K extends keyof State>(key: K): State[K] {
    return state[key];
}

export function deleteState(key: keyof State) {
    delete state[key];
}
