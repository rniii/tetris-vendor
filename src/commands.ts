import {
    ApplicationCommandTypes,
    Client,
    CommandInteraction,
    InteractionTypes,
    type AnyTextableChannel,
    type ApplicationCommandInteractionData,
    type ApplicationCommandOptions,
    type CreateChatInputApplicationCommandOptions,
    type CreateMessageOptions,
} from "oceanic.js";
import { OWNER_IDS } from "../config.ts";

const ownerIds = [...OWNER_IDS];

interface Command {
    name: string;
    description?: string;
    ownerOnly?: true;
    options?: ApplicationCommandOptions[];

    execute(ctx: CommandContext, data: ApplicationCommandInteractionData): void | Promise<any>;
}

class CommandContext {
    interaction: CommandInteraction<AnyTextableChannel>;

    constructor(
        interaction: CommandInteraction<AnyTextableChannel>,
    ) {
        this.interaction = interaction;
    }

    get client() {
        return this.interaction.client;
    }

    get user() {
        return this.interaction.user;
    }

    get channel() {
        return this.interaction.channel;
    }

    get guild() {
        return this.interaction.guild;
    }

    reply(opts: string | CreateMessageOptions) {
        if (typeof opts == "string") opts = { content: opts };

        return this.interaction.createFollowup({ ...opts });
    }
}

const Commands = Object.create(null) as Record<string, Command>;

export function defineCommand(def: Command) {
    if (Commands[def.name]) throw Error(`${def.name} already registered`);

    Commands[def.name] = def;
}

async function registerCommands(client: Client) {
    await client.rest.applications.bulkEditGlobalCommands(
        client.application.id,
        Object.values(Commands).map(def => ({
            name: def.name,
            description: def.description ?? "⋯",
            options: def.options,
            type: ApplicationCommandTypes.CHAT_INPUT,
        } as CreateChatInputApplicationCommandOptions)),
    );
}

async function loadOwnerIds(client: Client) {
    const application = await client.rest.oauth.getApplication();

    if (!application.team) {
        return ownerIds.push(application.ownerID);
    }

    for (const member of application.team.members) {
        if (member.role !== "admin") continue;

        ownerIds.push(member.user.id);
    }
}

export function registerHandlers(client: Client) {
    client.on("interactionCreate", async interaction => {
        if (interaction.type !== InteractionTypes.APPLICATION_COMMAND) return;

        const def = Commands[interaction.data.name];
        if (!def) return;

        await interaction.defer();

        if (def.ownerOnly && !ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ content: "💢" });
        }

        if (!interaction.channel) await client.rest.channels.get(interaction.channelID);

        const ctx = new CommandContext(interaction as any);
        try {
            await def.execute(ctx, interaction.data);
        } catch (err) {
            console.error(err);
            await ctx.reply("something exploded//// >~<");
        }
    });

    client.once("ready", async () => {
        await loadOwnerIds(client);
        await registerCommands(client);
    });
}
