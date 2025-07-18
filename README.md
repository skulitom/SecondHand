# Second Hand MCP Server

An MCP (Model Context Protocol) server that provides Claude Code with the ability to control a second cursor on Windows desktop. This tool allows Claude to perform mouse operations like clicking, dragging, and moving the cursor in real-time.

## Features

- **Cursor Movement**: Move the second cursor to any position on screen
- **Mouse Clicks**: Left, right, and middle mouse button clicks
- **Double Click**: Perform double-click operations
- **Drag Operations**: Drag from one position to another
- **Position Tracking**: Get current cursor position and screen dimensions
- **Visual Overlay**: Optional visual indicator for the second cursor (planned)

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the project:
   ```bash
   npm run build
   ```

## Usage

### Running the Server

```bash
npm start
```

Or for development:
```bash
npm run dev
```

### Configuring with Claude Code

Add the following to your Claude Code MCP configuration:

```json
{
  "mcpServers": {
    "second-hand": {
      "command": "node",
      "args": ["C:\\DEV\\SecondHand\\dist\\index.js"]
    }
  }
}
```

## Available Tools

### `move_cursor`
Move the second cursor to specific coordinates.

**Parameters:**
- `x` (number): X coordinate (pixels from left edge)
- `y` (number): Y coordinate (pixels from top edge)

### `click`
Perform a mouse click at current position or specific coordinates.

**Parameters:**
- `x` (number, optional): X coordinate
- `y` (number, optional): Y coordinate
- `button` (string, optional): Mouse button ('left', 'right', 'middle'), defaults to 'left'

### `double_click`
Perform a double click at current position or specific coordinates.

**Parameters:**
- `x` (number, optional): X coordinate
- `y` (number, optional): Y coordinate

### `drag`
Drag from one position to another.

**Parameters:**
- `fromX` (number): Starting X coordinate
- `fromY` (number): Starting Y coordinate
- `toX` (number): Ending X coordinate
- `toY` (number): Ending Y coordinate

### `get_cursor_position`
Get the current position of the second cursor.

### `get_screen_size`
Get the screen dimensions.

### `show_cursor`
Show or hide the visual second cursor overlay.

**Parameters:**
- `visible` (boolean): Whether to show the cursor overlay

## Security Considerations

⚠️ **Important**: This tool provides direct control over your mouse cursor and can perform any mouse operation. Use with caution and ensure you trust the Claude Code instance that will be using this tool.

- Always review the actions Claude intends to perform before approving them
- Consider running in a sandboxed environment for testing
- Be aware that this tool can interact with any application on your desktop

## Dependencies

- **robotjs**: For low-level mouse control
- **node-window-manager**: For window management and overlay functionality
- **@modelcontextprotocol/sdk**: MCP server framework

## Development

The project uses TypeScript and includes:
- `src/index.ts`: Main MCP server implementation
- `src/cursor-controller.ts`: Core cursor control functionality

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

## Limitations

- Currently designed for Windows 11 (may work on other Windows versions)
- Visual cursor overlay is basic (planned for enhancement)
- Requires appropriate permissions for mouse control

## Contributing

This is an experimental tool for Claude Code integration. Feel free to submit issues and enhancement requests.

## License

MIT License