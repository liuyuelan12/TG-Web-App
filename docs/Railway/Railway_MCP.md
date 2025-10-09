Railway MCP Server (Experimental)
The Railway MCP Server is a Model Context Protocol (MCP) server that enables natural language interaction with your Railway projects and infrastructure.

With this server, you can ask your IDE or AI assistant to create projects, deploy templates, create/select environments, or pull environment variables.

🚨 The Railway MCP Server is highly experimental. Expect bugs and missing features. By design, destructive actions (e.g., deleting services or environments) are excluded, but you should still carefully review any tool executions before running them.

The Railway MCP Server is open-source and available on GitHub.

Understanding MCP and Railway MCP Server
The Model Context Protocol (MCP) defines a standard for how AI applications (hosts) can interact with external tools and data sources through a client-server architecture.

Hosts: Applications such as Cursor, VS Code, Claude Desktop, or Windsurf that connect to MCP servers.
Clients: The layer within hosts that maintains one-to-one connections with individual MCP servers.
Servers: Standalone programs (like the Railway MCP Server) that expose tools and workflows for managing external systems.
The Railway MCP Server acts as the server in this architecture, translating natural language requests into CLI workflows powered by the Railway CLI.

Prerequisites
To get started with the MCP server, you need to have the Railway CLI installed and authenticated.

Installation
Cursor
You can one-click install the MCP server in Cursor by clicking the "Add to Cursor" button below:

Install MCP Server

Alternatively, you can add the following configuration to your .cursor/mcp.json file manually:

{
  "mcpServers": {
    "Railway": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    }
  }
}
VS Code
Add the following configuration to your .vscode/mcp.json file:

{
  "servers": {
    "Railway": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"]
    }
  }
}
Claude Code
To install the MCP server in Claude Code, you can use the following command:

claude mcp add Railway npx @railway/mcp-server
Example Usage
Create and deploy a new app

Create a Next.js app in this directory and deploy it to Railway.
Also assign it a domain.
Deploy from a template

Deploy a Postgres database
Deploy a single node ClickHouse database
Pull environment variables

Pull environment variables for my project and save them to a .env file
Create a new environment

Create a development environment called `development` 
cloned from production and set it as linked
Available MCP Tools
The Railway MCP Server provides a curated set of tools. Your AI assistant will automatically call these tools based on the context of your request.

Status

check-railway-status — Verify CLI installation and authentication
Project Management

list-projects — List all projects
create-project-and-link — Create a project and link it to the current directory
Service Management

list-services — List project services
link-service — Link a service to the current directory
deploy — Deploy a service
deploy-template — Deploy from the Railway Template Library
Environment Management

create-environment — Create a new environment
link-environment — Link environment to current directory
Configuration & Variables

list-variables — List environment variables
set-variables — Set environment variables
generate-domain — Generate a Railway domain
Monitoring & Logs

get-logs — Retrieve service logs
Security Considerations
Under the hood, the Railway MCP Server runs the Railway CLI commands. While destructive operations are intentionally excluded and not exposed as MCP tools, you should still:

Review actions requested by the LLM before running them.
Restrict access to ensure only trusted users can invoke the MCP server.
Avoid production risks by limiting usage to local development and non-critical environments.
Feature requests
The Railway MCP Server is a work in progress. We are actively working on adding more tools and features. If you have a feature request, leave your feedback on this Central Station post.

Using Volumes
Volumes allow you to store persistent data for services on Railway.


Volume
Creating A Volume
You can create a new volume through the Command Palette (⌘K) or by right-clicking the project canvas to bring up a menu:


Creating a volume via command palette
via command palette


Creating a volume via context menu
via right-click menu

When creating a volume, you will be prompted to select a service to connect the volume to:


Connect volume to service
You must configure the mount path of the volume in your service:


Connect volume to service
Using the Volume
The volume mount point you specify will be available in your service as a directory to which you can read/write. If you mount a volume to /foobar, your application will be able to access it at the absolute path /foobar.

Relative Paths
Nixpacks, the default buildpack used by Railway, puts your application files in an /app folder at the root of the container. If your application writes to a directory at a relative path, and you need to persist that data on the volume, your mount path should include the app path.

For example, if your application writes data to ./data, you should mount the volume to /app/data.

Provided Variables
Attaching a Volume to a service will automatically make these environment variables available to the service at runtime:

RAILWAY_VOLUME_NAME: Name of the volume (e.g. foobar)
RAILWAY_VOLUME_MOUNT_PATH: Mount path of the volume (e.g. /foobar)
You do not need to define these variables on the service, they are automatically set by Railway at runtime.

Volume Availability
Volumes are mounted to your service's container when it is started, not during build time.

If you write data to a directory at build time, it will not persist on the volume, even if it writes to the directory to which you have mounted the volume.

Note: Volumes are not mounted during pre-deploy time, if your pre-deploy command attempts to read or write data to a volume, it should be done as part of the start command.

Volumes are not mounted as overlays.

Permissions
Volumes are mounted as the root user. If you run an image that uses a non-root user, you should set the following variable on your service:

RAILWAY_RUN_UID=0
Growing the Volume
Only available to Pro users and above.

To increase capacity in a volume, you can "grow" it from the volume settings.

Click on the volume to open the settings
Click Grow
Follow the prompts to grow the volume

Grow volume
Note: growing a volume requires a restart of the attached service.

Backups
Services with volumes support manual and automated backups, backups are covered in the backups reference guide.

