import { readFile, writeFile } from "fs/promises";

interface BotState {
    helloChannelId?: string;
}

const defaultState: BotState = {};

const savedState = await readFile("state.json", "utf8").then(JSON.parse).catch(() => {});

const state = { ...defaultState, ...savedState };

function saveSettings() {
    writeFile("state.json", JSON.stringify(state, null, 4));
}

function makeProxy(obj: Object) {
    const proxyHandler = {} as ProxyHandler<any>;
    proxyHandler.get = (target, p, receiver) => {
        const res = Reflect.get(target, p, receiver);

        if (typeof res === "object" && res !== null && !Array.isArray(res)) {
            return new Proxy(res, proxyHandler);
        }

        return res;
    };

    for (const operation of ["set", "defineProperty", "deleteProperty"] as const) {
        proxyHandler[operation] = (...args: any[]) => {
            // @ts-expect-error
            const res = Reflect[operation](...args);
            saveSettings();
            return res;
        };
    }

    return new Proxy(obj, proxyHandler);
}

export const BotState = makeProxy(state) as BotState;
