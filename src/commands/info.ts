import { defineCommand } from "../commands.ts";

defineCommand({
    name: "source",
    async execute(ctx) {
        ctx.reply(`Check out my source code https://github.com/rniii/tetris-vendor :DD`);
    },
});
