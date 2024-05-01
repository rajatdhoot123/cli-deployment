#!/usr/bin/env node

import { spawn } from "child_process";
import inquirer from "inquirer";
import fs from "fs";
import path from "path";

const configArg = process.argv.find((arg) => arg.startsWith("--config="));

if (!configArg) {
  console.error("Usage: npx cli-deployment --config=<path_to_config_file>");
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
  console.error(`Failed to read or parse config file: ${error}`);
  process.exit(1);
}

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const cmdProcess = spawn(command, args, options);

    let output = ""; // To collect command output
    cmdProcess.stdout.on("data", (data) => {
      console.log(data.toString()); // Log output
      output += data.toString();
    });

    cmdProcess.stderr.on("data", (data) => {
      console.error(data.toString()); // Log error output
    });

    cmdProcess.on("error", (error) => {
      reject(new Error(`Error: ${error.message}`));
    });

    cmdProcess.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with code ${code}`));
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

    console.log(`Current branch is: ${currentBranch}`);

    const changeBranch = await inquirer.prompt([
      {
        type: "confirm",
        name: "change",
        message: "Do you want to switch to another branch?",
      },
    ]);

    if (!changeBranch.change) {
      console.log("No branch change requested.");
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
    console.log(`Switched to branch: ${answers.selectedBranch}`);
    return true; // Return true if branch was changed
  } catch (error) {
    console.error("Error:", error);
    return false; // Ensure that failure to switch branches doesn't prevent subsequent command execution
  }
}

async function runCommandsSequentially() {
  try {
    await switchBranch();

    for (const command of config.commands) {
      const [cmd, ...args] = command.split(" ");
      console.log(`Executing: ${cmd} ${args.join(" ")}`);
      await runCommand(cmd, args, { cwd: config.cwd });
    }

    console.log("All commands executed successfully.");
  } catch (error) {
    console.error(`Error executing commands: ${error.message}`);
  }
}

runCommandsSequentially();
