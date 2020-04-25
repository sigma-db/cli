import { Engine, Instance, Parser } from "@sigma-db/core";
import { createServer } from "net";
import { pipeline } from "stream";
import * as yargs from "yargs";

const { path, socket } = yargs
    .option("path", { alias: "p", description: "Load a specific database instance", type: "string" })
    .option("socket", { alias: "s", description: "The UNIX domain socket to communicate on", type: "string", default: "sigmaDB.sock" })
    .scriptName("sigma")
    .help()
    .argv;

const database = Instance.create({ path });
const server = createServer().listen(socket)
    .on("connection", socket => {
        const parser = Parser.create({ schema: database.schema });
        const engine = Engine.create({ instance: database });

        pipeline(
            socket,
            parser,
            engine,
            socket,
            err => err && socket.write(err.message),
        );
    })
    .on("close", () => {
        database.close();
    });
