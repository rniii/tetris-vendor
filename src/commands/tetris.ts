import {
    type AnyInteractionGateway,
    type AnyTextableChannel,
    ButtonStyles,
    Client,
    ComponentTypes,
    type ContainerComponent,
    InteractionTypes,
    type MessageActionRow,
    type MessageActionRowComponent,
    MessageFlags,
    type TextButton,
    type TextDisplayComponent,
    User,
} from "oceanic.js";
import { GameState, MinoType, type PieceType, Tetris } from "../../tetris/src/index.ts";
import { defineCommand } from "../commands.ts";

const TextDisplay = (content: string): TextDisplayComponent => ({
    type: ComponentTypes.TEXT_DISPLAY,
    content,
});

const ActionRow = (components: MessageActionRowComponent[]): MessageActionRow => ({
    type: ComponentTypes.ACTION_ROW,
    components,
});

const TextButton = (customID: string, opts: Omit<TextButton, "type" | "customID">): TextButton => ({
    type: ComponentTypes.BUTTON,
    customID,
    ...opts,
});

const Container = (opts: Omit<ContainerComponent, "type">): ContainerComponent => ({
    type: ComponentTypes.CONTAINER,
    ...opts,
});

const Tiles = {
    [MinoType.Empty]: "  ",
    [MinoType.I]: "\x1b[36m██",
    [MinoType.L]: "\x1b[33m██",
    [MinoType.J]: "\x1b[34m██",
    [MinoType.S]: "\x1b[32m██",
    [MinoType.Z]: "\x1b[31m██",
    [MinoType.T]: "\x1b[35m██",
    [MinoType.O]: "\x1b[33m██",
    [MinoType.Garbage]: "\x1b[m██",
};

const Previews = {
    [MinoType.I]: "\x1b[36m▄▄▄▄",
    [MinoType.L]: "\x1b[33m▄▄█ ",
    [MinoType.J]: "\x1b[34m█▄▄ ",
    [MinoType.S]: "\x1b[32m▄█▀ ",
    [MinoType.Z]: "\x1b[31m▀█▄ ",
    [MinoType.T]: "\x1b[35m▄█▄ ",
    [MinoType.O]: "\x1b[33m ██ ",
};

async function createGame(client: Client, user: User, channel: AnyTextableChannel) {
    const tetris = new Tetris();

    const components = [
        Container({
            components: [
                TextDisplay("test"),
                ActionRow([
                    TextButton("swap", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "🔀" },
                    }),
                    TextButton("hard-drop", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "⏬" },
                    }),
                    TextButton("none1", {
                        style: ButtonStyles.SECONDARY,
                        label: "\u200b",
                        disabled: true,
                    }),
                    TextButton("rotate-left", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "↪️" },
                    }),
                ]),
                ActionRow([
                    TextButton("move-left", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "◀️" },
                    }),
                    TextButton("soft-drop", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "🔽" },
                    }),
                    TextButton("move-right", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "▶️" },
                    }),
                    TextButton("rotate-right", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "↩️" },
                    }),
                ]),
            ],
        }),
    ];

    const updateComponents = () => {
        const textDisplay = components[0].components[0] as TextDisplayComponent;
        const swapButton = (components[0].components[1] as MessageActionRow).components[0] as TextButton;

        const sideText = [
            `\x1b[0;1mHOLD`,
            tetris.hold ? Previews[tetris.hold] : "",
            "",

            `\x1b[0;1mQUEUE`,
            ...tetris.queue.slice(0, 4).map(t => [Previews[t as PieceType], ""]).flat(),

            `\x1b[0;1mSCORE`,
            tetris.score.toLocaleString("fr"),
        ];

        let text = "";

        for (const p of tetris.piece.minos) tetris.board[p.y][p.x] = tetris.piece.type;

        for (let i = 21; i >= 0; --i) {
            text += "\u200b";
            text += Array.from(tetris.board[i], t => Tiles[t as MinoType]).join("");
            text += "\x1b[0m│  ";
            text += sideText[21 - i] ?? "";
            text += "\n";
        }

        for (const p of tetris.piece.minos) tetris.board[p.y][p.x] = 0;

        textDisplay.content = "```ansi\n" + text + "\n```";
        swapButton.disabled = !tetris.canHold;
    };

    const handleInteraction = async (interaction: AnyInteractionGateway) => {
        if (interaction.type !== InteractionTypes.MESSAGE_COMPONENT) return;
        if (interaction.message.id !== messageID) return;
        if (interaction.user.id !== user.id) {
            return interaction.reply({ content: "psst! run `vtplay`!", flags: MessageFlags.EPHEMERAL });
        }

        const button = interaction.data.customID;
        if (button === "hard-drop") tetris.hardDrop();
        else if (button === "soft-drop") tetris.softDrop(5);
        else if (button === "rotate-left") tetris.rotatePiece(-1);
        else if (button === "rotate-right") tetris.rotatePiece(+1);
        else if (button === "move-left") tetris.movePiece(-1);
        else if (button === "move-right") tetris.movePiece(+1);
        else if (button === "swap") tetris.swapPiece();

        updateTimeout();
        updateComponents();
        await interaction.editParent({ components });

        if (tetris.gameState !== GameState.Playing) quitGame();
    };

    const quitGame = async () => {
        client.off("interactionCreate", handleInteraction);

        components[0].components.filter(c => c.type === ComponentTypes.ACTION_ROW).forEach(c => (
            c.components.filter(c => c.type === ComponentTypes.BUTTON).forEach(c => (
                c.disabled = true
            ))
        ));

        await channel.editMessage(messageID, { flags: MessageFlags.IS_COMPONENTS_V2, components });
    };

    const updateTimeout = () => {
        clearTimeout(timeout);
        setTimeout(quitGame, 5 * 60 * 1000);
    };

    let timeout: number;

    updateTimeout();
    updateComponents();

    const { id: messageID } = await channel.createMessage({ flags: MessageFlags.IS_COMPONENTS_V2, components });

    client.on("interactionCreate", handleInteraction);
}

defineCommand({
    name: "play",
    async execute(ctx) {
        await createGame(ctx.client, ctx.author, ctx.channel);
    },
});
