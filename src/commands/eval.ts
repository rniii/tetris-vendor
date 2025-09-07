import { inspect, type InspectOptions } from "util";
import { defineCommand } from "../commands";

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
                : { files: [{ name: "output.ansi", contents: Buffer.from(output, "utf8") }] },
        );
    },
});

const inspectOpts: InspectOptions = { colors: true, showProxy: true };
