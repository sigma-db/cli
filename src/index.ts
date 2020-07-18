#!/usr/bin/env node
import { createInterface } from "readline";
import { Instance, Parser, Engine, Relation, Result, ResultType } from "@sigma-db/core";
import { textSync } from "figlet";
import Axios from "axios";
import * as chalk from "chalk";
import * as Table from "cli-table3";
import * as semver from "semver";
import { DataType, Attribute } from "@sigma-db/core/types/database";

class Formatter {
    public static create() {
        return new Formatter();
    }

    private constructor() { }

    public format(result: Result): string {
        switch (result.type) {
            case ResultType.SUCCESS:
                return chalk.green("Done.");
            case ResultType.ERROR:
                return chalk.red(result.message);
            case ResultType.RELATION:
                return this.formatRelation(result.relation);
        }
    }

    private initColumnAlignments(schema: Attribute[]): Array<"right" | "center" | "left"> {
        return schema.map(attr => {
            switch (attr.type) {
                case DataType.INT:
                    return "right";
                case DataType.STRING:
                    return "left";
                case DataType.BOOL:
                case DataType.CHAR:
                    return "center";
            }
        });
    }

    private formatTuple(tuple: Array<string | number | boolean>): string[] {
        return tuple.map(attr => {
            switch (typeof attr) {
                case "string":
                    return chalk.yellow(`"${attr}"`);
                case "number":
                    return chalk.magenta(attr);
                case "boolean":
                    return (attr ? chalk.green : chalk.red)(attr);
            }
        });
    }

    private formatRelation(relation: Relation): string {
        const { name, arity, size } = relation;
        if (arity === 0) {  // boolean query
            return `${name ?? ""}${name ? ": " : ""}${(!!size ? chalk.green : chalk.red)(!!size)}\n`;
        } else if (size > 0) {
            const table = new Table({
                head: relation.schema.map(attr => attr.name),
                style: { head: ["white", "bold"] },
                colAligns: this.initColumnAlignments(relation.schema),
            });
            for (const tuple of relation.tuples()) {
                table.push(this.formatTuple(tuple));
            }
            return `${name ?? ""} (${size} ${size === 1 ? "tuple" : "tuples"}):\n${table.toString()}\n`;
        } else {
            return `${name ?? ""} (empty)\n`;
        }
    }
}

const doCheckForUpdate = async () => {
    const metadata = await Axios.get<{ "dist-tags": { "latest": string }, "time": Record<string, string> }>("https://registry.npmjs.org/@sigma-db/core");
    const { "dist-tags": { latest }, time: { [latest]: timestamp } } = metadata.data;
    return {
        latest: latest,
        time: new Date(timestamp),
    }
}

const main = async () => {
    const { stdin, stdout, argv: [, , path] } = process;

    const update = doCheckForUpdate();

    const database = Instance.create({ path });
    const parser = Parser.create();
    const engine = Engine.create();
    const formatter = Formatter.create();

    const figlet = textSync("sigmaDB", { horizontalLayout: "fitted" });
    const version = require(require.resolve("@sigma-db/core/package.json")).version;
    const message = `This is sigmaDB CLI using sigmaDB v${version}.`;
    const greeting = chalk.cyan(`${figlet}\n\n${message}\n\n`);

    console.clear();
    stdout.write(greeting);

    const { latest, time } = await update;
    if (semver.gt(latest, version)) {
        const color = semver.diff(latest, version) === "patch" ? chalk.yellow : chalk.red;
        stdout.write(color(`An update to sigmaDB v${latest} published on ${new Intl.DateTimeFormat("en-US").format(time)} is available.\nQuit the CLI and run "npm i -g @sigma-db/cli" to install.\n\n`))
    }

    const repl = createInterface(stdin);

    stdout.write("> ");
    repl.prompt();

    for await (const line of repl) {
        for (const statement of parser.parse(line)) {
            const result = engine.evaluate(statement, database);
            const output = formatter.format(result);
            console.log(output);
        }

        stdout.write("> ");
        repl.prompt();
    }
}

main();
