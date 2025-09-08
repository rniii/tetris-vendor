import "./commands/eval.ts";
import "./commands/tetris.ts";

import { Client } from "oceanic.js";
import { registerHandlers } from "./commands.ts";

const client = new Client({
    auth: `Bot ${process.env.TOKEN}`,
    gateway: { intents: ["ALL"] },
});

client.once("ready", () => console.log(`logged in as @${client.user.tag}`));
client.on("error", err => console.error(err));

registerHandlers(client);

client.connect();
