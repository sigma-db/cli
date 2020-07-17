#!/usr/bin/env node
import { createInterface } from "readline";
import { Instance, Parser, Engine, Result, ResultType } from "@sigma-db/core";
import { textSync } from "figlet";
import * as chalk from "chalk";
import * as Table from "cli-table3";
import * as yargs from "yargs";
import { version, dependencies } from "../package.json";

const { "log-file": path } = yargs
    .option("log-file", { alias: "l", description: "The path to the log file of the database instance", type: "string" })
    .scriptName("sigma")
    .help()
    .argv;

const initStdin = () => {
// process.stdin.setRawMode(true);
// process.stdin.on("keypress", (_str, key) => {
//     if (key.shift && key.name === "enter") {
//         process.stdout.write("\n  ");
//     }
// });
}

const printBanner = () => {
    console.log(chalk.cyan(textSync("sigmaDB", { horizontalLayout: "fitted" })));
    console.log();
    console.log(chalk.cyan(`This is sigmaDB CLI v${version} using sigmaDB v${dependencies["@sigma-db/core"].slice(1)}`));
    console.log();
}

const format = (result: Result) => {
    switch (result.type) {
        case ResultType.SUCCESS:
            return chalk.green("Done.");
        case ResultType.ERROR:
            return chalk.red(result.message);
        case ResultType.RELATION:
            const table = new Table({
                head: result.relation.schema.map(attr => attr.name),
                style: { head: ["white"] }
            });
            for (const tuple of result.relation.tuples()) {
                table.push(Object.values(tuple).map(value => {
                    switch (typeof value) {
                        case "string":
                            return chalk.yellow(`"${value}"`);
                        case "number":
                            return chalk.magenta(value);
                        case "boolean":
                            return value ? chalk.green("true") : chalk.red("false");
                    }
                }));
            }
            return `${result.relation.name ?? ""} (${result.relation.size} ${result.relation.size === 1 ? "tuple" : "tuples"}):\n${table.toString()}`;
    }
}

const main = async () => {
    initStdin();
    printBanner();

    const database = Instance.create({ path });
    const parser = Parser.create();
    const engine = Engine.create();
    const repl = createInterface(process.stdin);

    process.stdout.write("> ");
    repl.prompt();

    for await (const line of repl) {
        for (const statement of parser.parse(line)) {
            const result = engine.evaluate(statement, database);
            const output = format(result);
            console.log(output);
        }
        process.stdout.write("> ");
        repl.prompt();
    }
}

main();
