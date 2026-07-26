import {
    ButtonStyles,
    ComponentInteraction,
    ComponentTypes,
    InteractionTypes,
    MessageFlags,
    type AnyInteractionGateway,
    type ContainerComponent,
    type MessageActionRow,
    type MessageActionRowComponent,
    type TextButton,
    type TextDisplayComponent,
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

function renderGame(tetris: Tetris) {
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

    const disabled = tetris.gameState !== GameState.Playing;

    return [
        Container({
            components: [
                TextDisplay("```ansi\n" + text + "\n```"),
                ActionRow([
                    TextButton("swap", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "🔀" },
                        disabled: disabled || !tetris.canHold,
                    }),
                    TextButton("hard-drop", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "⏬" },
                        disabled,
                    }),
                    TextButton("none1", {
                        style: ButtonStyles.SECONDARY,
                        label: "\u200b",
                        disabled: true,
                    }),
                    TextButton("rotate-left", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "↪️" },
                        disabled,
                    }),
                ]),
                ActionRow([
                    TextButton("move-left", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "◀️" },
                        disabled,
                    }),
                    TextButton("soft-drop", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "🔽" },
                        disabled,
                    }),
                    TextButton("move-right", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "▶️" },
                        disabled,
                    }),
                    TextButton("rotate-right", {
                        style: ButtonStyles.SECONDARY,
                        emoji: { name: "↩️" },
                        disabled,
                    }),
                ]),
            ],
        }),
    ]
}

function updateGame(tetris: Tetris, interaction: ComponentInteraction) {
    switch (interaction.data.customID) {
        case "hard-drop": return tetris.hardDrop();
        case "soft-drop": return tetris.softDrop(5);
        case "rotate-left": return tetris.rotatePiece(-1);
        case "rotate-right": return tetris.rotatePiece(+1);
        case "move-left": return tetris.movePiece(-1);
        case "move-right": return tetris.movePiece(+1);
        case "swap": return tetris.swapPiece();
    }
}

defineCommand({
    name: "play",
    async execute(ctx) {
        ctx.client.on("interactionCreate", handleInteraction);

        let timeout: ReturnType<typeof setTimeout>;

        function updateTimeout() {
            clearTimeout(timeout);
            timeout = setTimeout(gameOver, 5 * 60 * 1000);
        }

        updateTimeout();

        const tetris = new Tetris();
        const components = renderGame(tetris);
        const response = await ctx.reply({ flags: MessageFlags.IS_COMPONENTS_V2, components })

        async function handleInteraction(interaction: AnyInteractionGateway) {
            if (interaction.type !== InteractionTypes.MESSAGE_COMPONENT) return;
            if (interaction.message.id !== response.message.id) return;
            if (interaction.user.id !== ctx.user.id) {
                return interaction.reply({
                    content: "psst! run `vtplay`!",
                    flags: MessageFlags.EPHEMERAL,
                });
            }

            updateTimeout();
            updateGame(tetris, interaction);

            await interaction.editParent({ components: renderGame(tetris) });

            if (tetris.gameState !== GameState.Playing) gameOver();
        }

        async function gameOver() {
            ctx.client.off("interactionCreate", handleInteraction);
        }
    },
});
