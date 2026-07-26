import { execSync } from "child_process";
import { inspect, type InspectOptions } from "util";
import { defineCommand } from "../commands.ts";
import { setState } from "../state.ts";
import { ApplicationCommandOptionTypes, CommandInteraction } from "oceanic.js";

defineCommand({
    name: "eval",
    ownerOnly: true,
    options: [{
        name: "code",
        description: "Haskell code to run",
        type: ApplicationCommandOptionTypes.STRING,
    }],

    async execute(ctx, data) {
        let output = "";

        let script = data.options.getStringOption("code", true).value;
        if (script.includes("await")) script = `(async () => { ${script} })()`;

        try {
            const console = {
                log(...args: any[]) {
                    let first = true;
                    for (const arg of args) {
                        if (!first) output += " ";

                        output += typeof arg == "string" ? arg : inspect(arg, inspectOpts);
                        output += "\n";

                        first = false;
                    }
                },
            };
            const { user, channel, guild, member } = ctx.interaction;

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
        await restartBot(ctx.interaction);
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
        await restartBot(ctx.interaction);
    },
});

async function restartBot(interaction: CommandInteraction) {
    const response = await interaction.createFollowup({
        content:"restarting... (＿  ＿  ) ⋯",
    });

    setState("helloResponse", [interaction.token, response.message.id]);

    process.exit(0); // thx systemd
}
