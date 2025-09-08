import "./commands/eval.ts";
import "./commands/info.ts";
import "./commands/tetris.ts";

import { Client } from "oceanic.js";
import { registerHandlers } from "./commands.ts";
import { BotState } from "./state.ts";

const client = new Client({
    auth: `Bot ${process.env.TOKEN}`,
    gateway: { intents: ["ALL"] },
});

client.once("ready", async () => {
    console.log(`logged in as @${client.user.tag}`);
    if (BotState.helloChannelId) {
        await client.rest.channels.createMessage(BotState.helloChannelId, { content: "hiiiiiiiiiiiiiii" });
        delete BotState.helloChannelId;
    }
});
client.on("error", err => console.error(err));

registerHandlers(client);

client.connect();
