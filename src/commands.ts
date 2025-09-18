import { type AnyTextableChannel, Client, type CreateMessageOptions, Message } from "oceanic.js";
import { PREFIXES } from "../config.ts";

interface Command {
    name: string;
    aliases?: string[];
    description?: string;
    ownerOnly?: true;
    execute(ctx: MessageContext, args: string): void | Promise<any>;
}

const ownerIDs = [] as string[];

const previousResponses = new Map<string, string>();

class MessageContext {
    previous?: string;

    constructor(
        public message: Message<AnyTextableChannel>,
        public prefix: string,
        public command: string,
    ) {
        this.previous = previousResponses.get(message.id);
    }

    async createMessage(opts: CreateMessageOptions) {
        if (!this.previous) {
            const response = await this.message.channel.createMessage(opts);

            if (previousResponses.size > 100) previousResponses.delete(previousResponses.entries().next().value![0]);
            previousResponses.set(this.message.id, response.id);

            return response;
        }

        try {
            return this.channel.editMessage(this.previous, {
                attachments: [],
                components: [],
                embeds: [],
                content: "",
                files: [],
                ...opts,
            });
        } catch {
            return this.channel.createMessage(opts);
        }
    }

    get client() {
        return this.message.client;
    }

    get author() {
        return this.message.author;
    }

    get channel() {
        return this.message.channel;
    }

    get guild() {
        return this.message.guild;
    }

    send(opts: string | CreateMessageOptions) {
        if (typeof opts == "string") opts = { content: opts };

        return this.createMessage(opts);
    }

    reply(opts: string | CreateMessageOptions) {
        if (typeof opts == "string") opts = { content: opts };

        return this.createMessage({
            ...opts,
            messageReference: {
                messageID: this.message.id,
                channelID: this.message.channelID,
                guildID: this.message.guildID!,
            },
        });
    }

    react(emoji: string) {
        return this.message.createReaction(emoji);
    }
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

    const ctx = new MessageContext(msg as any, prefix, command);

    if (def.ownerOnly && !ownerIDs.includes(msg.author.id)) return ctx.react("💢");

    try {
        await def.execute(ctx, args);
    } catch (err) {
        console.error(err);
        await ctx.reply("something went wrong!!!! >~<");
    }
}
