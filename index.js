#!/usr/bin/env node

import { spawn } from "child_process";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";
import chalk from "chalk";

const configArg = process.argv.find((arg) => arg.startsWith("--config="));

if (!configArg) {
  console.error(
    chalk.red("Usage: npx cli-deployment --config=<path_to_config_file>")
  );
  process.exit(1);
}

const configPath = configArg.split("=")[1];

let config;

try {
  const configJson = fs.readFileSync(path.resolve(configPath), {
    encoding: "utf8",
  });
  config = JSON.parse(configJson);
} catch (error) {
  console.error(chalk.red(`Failed to read or parse config file: ${error}`));
  process.exit(1);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const cmdProcess = spawn(command, args, options);

    let output = ""; // To collect command output
    cmdProcess.stdout.on("data", (data) => {
      console.log(chalk.cyan(data.toString())); // Log output in blue
      output += data.toString();
    });

    cmdProcess.stderr.on("data", (data) => {
      console.error(chalk.yellow(data.toString())); // Log error output in yellow
    });

    cmdProcess.on("error", (error) => {
      reject(new Error(chalk.red(`Error: ${error.message}`))); // Error message in red
    });

    cmdProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(chalk.red(`Command failed with code ${code}`))); // Command failure message in red
      } else {
        resolve(output); // Resolve with collected output
      }
    });
  });
}

async function switchBranch() {
  try {
    const branchesOutput = await runCommand("git", ["branch", "--list"]);
    const branches = branchesOutput
      .split("\n")
      .filter(Boolean)
      .map((branch) => branch.trim().replace("* ", ""));

    const currentBranch =
      branches.find((branch) => branch.startsWith("*")) || "";

    console.log(chalk.green(`Current branch is: ${currentBranch}`)); // Current branch message in green

    const changeBranch = await inquirer.prompt([
      {
        type: "confirm",
        name: "change",
        message: "Do you want to switch to another branch?",
      },
    ]);

    if (!changeBranch.change) {
      console.log(chalk.magenta("No branch change requested.")); // No change requested message in magenta
      return false; // Return false if no change
    }

    const branchChoices = branches.filter((branch) => branch !== currentBranch);

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "selectedBranch",
        message: "Select a branch to switch to:",
        choices: branchChoices,
      },
    ]);

    await runCommand("git", ["checkout", answers.selectedBranch]);
    console.log(chalk.green(`Switched to branch: ${answers.selectedBranch}`)); // Switched to branch message in green
    return true; // Return true if branch was changed
  } catch (error) {
    console.error(chalk.red("Error:"), error);
    return false; // Ensure that failure to switch branches doesn't prevent subsequent command execution
  }
}

async function runCommandsSequentially() {
  try {
    await switchBranch();

    for (const command of config.commands) {
      const [cmd, ...args] = command.split(" ");
      console.log(chalk.cyan(`Executing: ${cmd} ${args.join(" ")}`)); // Executing command message in cyan
      await runCommand(cmd, args, { cwd: config.cwd });
    }

    console.log(chalk.green("All commands executed successfully."));
  } catch (error) {
    console.error(chalk.red(`Error executing commands: ${error.message}`));
  }
}

runCommandsSequentially();
