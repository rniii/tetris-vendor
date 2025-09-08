import { type AnyTextableChannel, Client, type CreateMessageOptions, Message } from "oceanic.js";
import { PREFIXES } from "../config.ts";

interface Command {
    name: string;
    aliases?: string[];
    description?: string;
    ownerOnly?: true;
    execute(ctx: ReturnType<typeof createContext>, args: string): void | Promise<any>;
}

const ownerIDs = [] as string[];

const previousResponses = new Map<string, string>();

function createContext(message: Message<AnyTextableChannel>, prefix: string, command: string) {
    const previous = previousResponses.get(message.id);

    const createMessage = async (opts: CreateMessageOptions) => {
        if (!previous) {
            const response = await message.channel.createMessage(opts);

            if (previousResponses.size > 100) previousResponses.delete(previousResponses.entries().next().value![0]);
            previousResponses.set(message.id, response.id);

            return response;
        }

        try {
            return message.channel.editMessage(previous, { ...opts });
        } catch {
            return message.channel.createMessage(opts);
        }
    };

    return {
        message,
        prefix,
        command,
        client: message.client,
        author: message.author,
        channel: message.channel,
        guild: message.guild,
        send(opts: string | CreateMessageOptions) {
            if (typeof opts == "string") opts = { content: opts };

            return createMessage(opts);
        },
        reply(opts: string | CreateMessageOptions) {
            if (typeof opts == "string") opts = { content: opts };

            return createMessage({
                ...opts,
                messageReference: {
                    messageID: message.id,
                    channelID: message.channelID,
                    guildID: message.guildID!,
                },
            });
        },
        react(emoji: string) {
            return message.createReaction(emoji);
        },
    };
}

const Commands = Object.create(null) as Record<string, Command>;

export function defineCommand(opts: Command) {
    for (const name of [opts.name, ...opts.aliases ?? []]) {
        if (Commands[name]) throw Error(`${name} already registered`);

        Commands[name] = opts;
    }
}

export function registerHandlers(client: Client) {
    client.on("messageCreate", (msg) => handleMessage(msg));
    client.on("messageUpdate", (msg, prev) => {
        if (prev && msg.content === prev.content) return;
        if (!msg.editedTimestamp) return;
        if (msg.editedTimestamp.getTime() < Date.now() - 5 * 60 * 1000) return;

        handleMessage(msg);
    });
    client.once("ready", () => {
        client.rest.oauth.getApplication().then(app => {
            app.team
                ? ownerIDs.push(...app.team.members.filter(m => m.role === "admin").map(m => m.user.id))
                : ownerIDs.push(app.ownerID);
        });
    });
}

async function handleMessage(msg: Message) {
    if (msg.author.bot) return;

    const lower = msg.content.toLowerCase();
    const prefix = PREFIXES.find(p => lower.startsWith(p));
    if (!prefix) return;

    const [command, args] = msg.content.slice(prefix.length).trim().split(/\s+(.*)/)!;
    const def = Commands[command.toLowerCase()];
    if (!def) return;

    if (!msg.channel) await msg.client.rest.channels.get(msg.channelID);

    const ctx = createContext(msg as any, prefix, command);

    if (def.ownerOnly && !ownerIDs.includes(msg.author.id)) return ctx.react("💢");

    try {
        await def.execute(ctx, args);
    } catch (err) {
        console.error(err);
        await ctx.reply("something went wrong!!!! >~<");
    }
}
