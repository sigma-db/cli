import { createConnection } from "net";
import { pipeline } from "stream";
import * as yargs from "yargs";

const { socket } = yargs
    .option("socket", { alias: "s", description: "The UNIX domain socket to communicate on", type: "string", demandOption: true })
    .scriptName("sigma")
    .help()
    .argv;

const { stdin, stdout } = process;
const ipcSocket = createConnection({ path: socket, readable: true, writable: true });

ipcSocket.on("connect", () => {
    pipeline(
        stdin,
        ipcSocket,
        stdout,
        err => err && stdout.write(err.message),
    );
});
