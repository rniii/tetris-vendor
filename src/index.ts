import "./commands/eval.ts";
import "./commands/info.ts";
import "./commands/tetris.ts";

import { Client } from "oceanic.js";
import { registerHandlers } from "./commands.ts";
import { deleteState, getState } from "./state.ts";

const client = new Client({
    auth: `Bot ${process.env.TOKEN}`,
    gateway: { intents: ["ALL_NON_PRIVILEGED"] },
});

client.once("ready", async () => {
    console.log(`logged in as @${client.user.tag}`);

    const hello = getState("helloResponse");

    if (hello) {
        await client.rest.interactions.editFollowupMessage(
            client.application.id, ...hello, { content: "hiiiiiiiiiiiiiii" },
        );
        deleteState("helloResponse");
    }
});
client.on("error", err => console.error(err));

registerHandlers(client);

client.connect();
