import {
    type AnyInteractionGateway,
    ButtonStyles,
    ComponentTypes,
    type ContainerComponent,
    InteractionTypes,
    type MessageActionRow,
    type MessageActionRowComponent,
    MessageFlags,
    type TextButton,
    type TextDisplayComponent,
} from "oceanic.js";
import { GameState, MinoType, Tetris, type PieceType } from "../../tetris/src/index.ts";
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

defineCommand({
    name: "play",
    async execute(ctx) {
        const tetris = new Tetris();

        tetris.hardDrop();

        const components = [
            Container({
                components: [
                    TextDisplay("test"),
                    ActionRow([
                        TextButton("none0", {
                            style: ButtonStyles.SECONDARY,
                            label: "\u200b",
                            disabled: true,
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
                        TextButton("rotate-right", {
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
                        TextButton("rotate-left", {
                            style: ButtonStyles.SECONDARY,
                            emoji: { name: "↩️" },
                        }),
                    ]),
                ],
            }),
        ];

        const updateComponents = () => {
            const textDisplay = components[0].components[0] as TextDisplayComponent;

            const sideText = [
                `\x1b[1mQUEUE`,
                ...tetris.queue.slice(0, 4).map(t => ["", Previews[t as PieceType]]).flat(),
            ];

            let text = "";

            for (let i = 20; i >= 0; --i) {
                text += "\u200b" + Array.from(tetris.board[i], t => Tiles[t as MinoType]).join("")
                text += sideText[20 - i] ?? "";
                text += "\n";
            }

            textDisplay.content = "```ansi\n" + text + "\n```";
        };

        const handleInteraction = async (interaction: AnyInteractionGateway) => {
            if (interaction.type !== InteractionTypes.MESSAGE_COMPONENT) return;
            if (interaction.message.id !== messageID) return;
            if (interaction.user.id !== ctx.author.id) {
                return interaction.reply({ content: "psst! run `vtplay`!", flags: MessageFlags.EPHEMERAL });
            }

            const button = interaction.data.customID;
            if (button === "hard-drop") tetris.hardDrop();
            else if (button === "soft-drop") tetris.softDrop(1);
            else if (button === "rotate-left") tetris.rotatePiece(-1);
            else if (button === "rotate-right") tetris.rotatePiece(+1);
            else if (button === "move-left") tetris.movePiece(-1);
            else if (button === "move-right") tetris.movePiece(+1);

            updateTimeout();
            updateComponents();
            await interaction.editParent({ components });

            if (tetris.state !== GameState.Playing) quitGame();
        };

        const quitGame = async () => {
            ctx.client.off("interactionCreate", handleInteraction);

            components[0].components.filter(c => c.type === ComponentTypes.ACTION_ROW).forEach(c => (
                c.components.filter(c => c.type === ComponentTypes.BUTTON).forEach(c => (
                    c.disabled = true
                ))
            ));

            await ctx.channel.editMessage(messageID, { flags: MessageFlags.IS_COMPONENTS_V2, components });
        };

        const updateTimeout = () => {
            clearTimeout(timeout);
            setTimeout(quitGame, 5 * 60 * 1000);
        };

        let timeout: number;

        updateTimeout();
        updateComponents();

        const { id: messageID } = await ctx.send({ flags: MessageFlags.IS_COMPONENTS_V2, components });

        ctx.client.on("interactionCreate", handleInteraction);
    },
});
