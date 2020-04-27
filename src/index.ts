#!/usr/bin/env node
import { Engine, Instance, Parser } from "@sigma-db/core";
import { createServer, createConnection } from "net";
import { pipeline } from "stream";
import * as yargs from "yargs";

yargs
    .command(
        "server",
        "Serves a database instance loaded from a given log file and allows it to be modified using queries received on a given socket",
        {
            "log-file": { alias: "l", description: "The path to the log file of the database instance", type: "string" },
            "socket": { alias: "s", description: "The UNIX domain socket to communicate on", type: "string", demandOption: true },
        },
        ({ "log-file": path, socket }) => {
            const database = Instance.create({ path });
            createServer().listen(socket)
                .on("connection", socket => {
                    const parser = Parser.create({ schema: database.schema });
                    const engine = Engine.create({ instance: database });
                    pipeline(
                        socket,
                        parser,
                        engine,
                        socket,
                        err => err && console.error(err.message),
                    );
                })
                .on("close", () => {
                    database.close();
                });
        })
    .command(
        "client",
        "client",
        {
            "socket": { alias: "s", description: "The UNIX domain socket to communicate on", type: "string", demandOption: true }
        },
        ({ socket }) => {
            const { stdin, stdout } = process;
            const ipcSocket = createConnection({ path: socket, readable: true, writable: true });

            ipcSocket
                .on("connect", () => {
                    pipeline(
                        stdin,
                        ipcSocket,
                        stdout,
                        err => err && stdout.write(err.message),
                    );
                });
        }
    )
    .help()
    .argv;
