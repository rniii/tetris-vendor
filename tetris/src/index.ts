export class Tetris {
    size: vec2;
    queue: PieceType[];
    piece: Piece;
    board: Uint8Array[];
    score: number;
    gameState: GameState;
    hold?: PieceType;
    canHold: boolean;

    constructor() {
        this.size = vec2(10, 40);
        this.queue = [];
        this.piece = this.nextPiece();
        this.board = createBoard(this.size);
        this.score = 0;
        this.gameState = GameState.Playing;
        this.canHold = true;
    }

    hardDrop() {
        while (!this.translate(0, -1));

        for (const p of this.piece.minos) {
            this.board[p.y][p.x] = this.piece.type;
        }

        for (let i = 0; i < this.size.y; ++i) {
            while (this.board[i].every(p => p)) {
                const [row] = this.board.splice(i, 1);
                row.fill(MinoType.Empty);
                this.board.push(row);
            }
        }

        this.piece = this.nextPiece();

        for (const p of this.piece.minos) {
            if (this.board[p.y][p.x]) {
                this.gameState = GameState.Blockout;
            }
        }
    }

    softDrop(height: number) {
        this.translate(0, -height);
    }

    movePiece(tiles: number) {
        let dir = Math.sign(tiles);

        for (; tiles != 0; tiles -= dir) this.translate(dir, 0);
    }

    rotatePiece(r: -1 | 1) {
        this.rotate(+r);

        const kicks = KickTable[this.piece.type];
        const from = this.piece.rotation;
        const to = (((this.piece.rotation + r) % 4) + 4) % 4;

        for (let i = 0; i < 4; ++i) {
            const [ax, ay] = kicks[from][i];
            const [bx, by] = kicks[to][i];

            if (!this.translate(ax - bx, ay - by)) {
                this.piece.rotation = to;
                return false;
            }
        }

        this.rotate(-r);
        return true;
    }

    swapPiece() {
        if (!this.canHold) return;

        this.refillQueue();

        const next = this.createPiece(this.hold ?? this.queue.shift()!);

        this.hold = this.piece.type;
        this.piece = next;
        this.canHold = false;
    }

    private rotate(r: number) {
        const { x: px, y: py } = this.piece.pivot;

        for (const p of this.piece.minos) {
            const { x, y } = p;

            if (r > 0) {
                p.x = y - py + px;
                p.y = px - x + py;
            } else {
                p.x = py - y + px;
                p.y = x - px + py;
            }
        }
    }

    private refillQueue() {
        if (this.queue.length > 4) return;

        const bag = Array.from(Array(7), (_, i) => i + 1);

        for (let i = 7; --i;) {
            let j = Math.random() * i | 0;
            bag[i] ^= bag[j];
            bag[j] ^= bag[i];
            bag[i] ^= bag[j];
        }

        this.queue.push(...bag);
    }

    private nextPiece(): Piece {
        this.refillQueue();
        this.canHold = true;

        return this.createPiece(this.queue.shift()!);
    }

    private createPiece(type: PieceType): Piece {
        const pivot = vec2(this.size.x / 2 - 1, this.size.y / 2);
        const minos = Shapes[type].map(([x, y]) => vec2(pivot.x + x, pivot.y + y));

        return { type, pivot, minos, rotation: 0 };
    }

    private translate(dx: number, dy: number) {
        let collided = false;

        for (const p of this.piece.minos) {
            p.x += dx;
            p.y += dy;

            if (
                p.x < 0 || p.y < 0
                || p.x >= this.size.x || p.y >= this.size.y
                || this.board[p.y][p.x] !== 0
            ) {
                collided = true;
            }
        }

        if (collided) {
            for (const p of this.piece.minos) {
                p.x -= dx;
                p.y -= dy;
            }
        } else {
            this.piece.pivot.x += dx;
            this.piece.pivot.y += dy;
        }

        return collided;
    }
}

function createBoard({ x: w, y: h }: vec2) {
    const buffer = new ArrayBuffer(w * h);

    return Array.from(Array(h), (_, i) => new Uint8Array(buffer, i * w, w));
}

export enum GameState {
    Playing = "playing",
    Lockout = "lock out",
    Blockout = "block out",
}

export interface Piece {
    type: PieceType;
    pivot: vec2;
    minos: vec2[];
    rotation: number;
}

export const enum MinoType {
    Empty = 0,
    I,
    L,
    J,
    S,
    Z,
    T,
    O,
    Garbage,
}

export type PieceType = MinoType.I | MinoType.L | MinoType.J | MinoType.S | MinoType.Z | MinoType.T | MinoType.O;

const Shapes = {
    [MinoType.I]: [[-1, +0], [+0, +0], [+1, +0], [+2, +0]],
    [MinoType.L]: [[-1, +0], [+0, +0], [+1, +0], [+1, +1]],
    [MinoType.J]: [[-1, +0], [+0, +0], [+1, +0], [-1, +1]],
    [MinoType.S]: [[-1, +0], [+0, +0], [+0, +1], [+1, +1]],
    [MinoType.Z]: [[+0, +0], [+1, +0], [-1, +1], [+0, +1]],
    [MinoType.T]: [[-1, +0], [+0, +0], [+1, +0], [+0, +1]],
    [MinoType.O]: [[+0, +0], [+1, +0], [+0, +1], [+1, +1]],
} as Record<PieceType, [number, number][]>;

const pieceOKicks = [[[+0, +0]], [[+0, -1]], [[-1, -1]], [[-1, +0]]];

const pieceIKicks = [
    [[+0, +0], [-1, +0], [+2, +0], [-1, +0], [+2, +0]],
    [[-1, +0], [+0, +0], [+0, +0], [+0, +1], [+0, -2]],
    [[-1, +1], [+1, +1], [-2, +1], [+1, +0], [-2, +0]],
    [[+0, +1], [+0, +1], [+0, +1], [+0, -1], [+0, +2]],
];

const defaultKicks = [
    [[+0, +0], [+0, +0], [+0, +0], [+0, +0], [+0, +0]],
    [[+0, +0], [+1, +0], [+1, -1], [+0, +2], [+1, +2]],
    [[+0, +0], [+0, +0], [+0, +0], [+0, +0], [+0, +0]],
    [[+0, +0], [-1, +0], [-1, -1], [+0, +2], [-1, +2]],
];

const KickTable = {
    [MinoType.I]: pieceIKicks,
    [MinoType.L]: defaultKicks,
    [MinoType.J]: defaultKicks,
    [MinoType.S]: defaultKicks,
    [MinoType.Z]: defaultKicks,
    [MinoType.T]: defaultKicks,
    [MinoType.O]: pieceOKicks,
} as Record<PieceType, [number, number][][]>;

export type vec2 = { x: number; y: number };
export const vec2 = (x = 0, y = x) => ({ x, y } as vec2);
