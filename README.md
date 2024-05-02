---

# CLI Deployment Script

This Node.js script facilitates deployment processes by automating Git branch management and executing commands as specified in a configuration file.

## Features

- **Branch Management**: Allows for interactive switching between local Git branches.
- **Command Execution**: Automatically runs a list of commands defined in a configuration file.

## Configuration

Define your operational parameters in a JSON file, specifying the working directory and the commands you want executed:

```json
{
  "cwd": "/path/to/working/directory",
  "commands": ["npm install", "npm run build", "npm test"]
}
```

## Usage

To run the script, execute it with the path to your configuration file:

```bash
npx cli-deployments --config=<path_to_config_file>
```

### Example

For a `deploy_config.json` located in the same directory as the script:

```bash
npx cli-deployments --config=./deploy_config.json
```

## License

Distributed under the MIT License. See `LICENSE` for more information.

---
