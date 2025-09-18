import { execSync } from "child_process";
import { inspect, type InspectOptions } from "util";
import { defineCommand } from "../commands.ts";
import { BotState } from "../state.ts";

defineCommand({
    name: "eval",
    aliases: ["e"],
    ownerOnly: true,
    async execute(ctx, code) {
        let output = "";

        let script = code.replace(/^```(\w+\n)?|```$/g, "");
        if (script.includes("await")) script = `(async () => { ${script} })()`;

        try {
            const console = {
                log(...args: any[]) {
                    let first = true;
                    for (const arg of args) {
                        if (!first) output += " ";

                        output += typeof arg == "string" ? arg : inspect(arg, inspectOpts);

                        first = false;
                    }
                },
            };
            const { author, channel, content, guild, member } = ctx.message;

            var result = await eval(script);
        } catch (err) {
            var result = err as any;
        }

        output += inspect(result, inspectOpts);

        ctx.reply(
            output.length < 1000
                ? "```ansi\n" + output.replace("`", "`\u200b") + "\n```"
                : { files: [{ name: "output.ansi", contents: Buffer.from(output.replaceAll(ANSI_RE, ""), "utf8") }] },
        );
    },
});

const ANSI_RE = /\x1b\[[\d;]*m/g;

const inspectOpts: InspectOptions = { colors: true, showProxy: true };

defineCommand({
    name: "restart",
    ownerOnly: true,
    async execute(ctx) {
        BotState.helloChannelId = ctx.channel.id;
        process.exit(0);
    },
});

defineCommand({
    name: "update",
    ownerOnly: true,
    async execute(ctx) {
        if (!execSync("git pull").toString().includes("Fast-forward")) {
            return ctx.reply("nothing to pull");
        }

        await ctx.reply("updated!!");

        BotState.helloChannelId = ctx.channel.id;
        process.exit(0);
    },
});
