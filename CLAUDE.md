# SecondHand - MCP Second Cursor Project

## Overview
This project provides a second cursor for Claude through MCP (Model Context Protocol). The cursor appears as an orange arrow that replicates the Windows cursor appearance but allows programmatic control without interfering with the user's actual cursor.

## Architecture

### Core Components
- **TypeScript Source** (`src/`): Main implementation files
- **C# Overlay** (`src/Program.cs`): Visual cursor overlay using Windows Forms
- **MCP Server** (`src/index.ts`): Model Context Protocol server implementation
- **Cursor Controller** (`src/cursor-controller.ts`): Main cursor management logic

### Key Files
- `src/cursor-controller.ts` - Main cursor control logic
- `src/Program.cs` - C# Windows Forms overlay for visual cursor
- `src/index.ts` - MCP server that exposes cursor functions
- `src/cursor-overlay.csproj` - .NET project file
- `dist/` - Compiled JavaScript files

## Development Workflow

### Building the Project
```bash
# Build TypeScript to JavaScript
npm run build

# Build C# overlay (done automatically by cursor-controller)
cd src && dotnet build cursor-overlay.csproj
```

### Testing
```bash
# Start MCP server
npm start

# Test using MCP functions:
# - mcp__second-hand__show_cursor(visible: true/false)
# - mcp__second-hand__move_cursor(x, y)
# - mcp__second-hand__click(x?, y?, button?)
# - mcp__second-hand__double_click(x?, y?)
# - mcp__second-hand__drag(fromX, fromY, toX, toY)
# - mcp__second-hand__get_cursor_position()
# - mcp__second-hand__get_screen_size()
```

### How It Works
1. **MCP Server**: Exposes cursor functions through Model Context Protocol
2. **Virtual Cursor**: Tracks cursor position without moving system cursor
3. **Visual Overlay**: C# Windows Forms application shows orange cursor
4. **Coordination**: Position file (`C:\temp\cursor_pos.txt`) coordinates between Node.js and C#

## Key Implementation Details

### Path Structure
- When compiled, TypeScript files go to `dist/` folder
- C# project and executable remain in `src/` folder
- **Important**: Paths in cursor-controller.ts use `join(__dirname, '..', 'src', ...)` to find C# files from dist folder

### Cursor Appearance
- Orange arrow shape that mimics Windows cursor
- Anti-aliased graphics with black outline and white inner outline
- Transparent background using `TransparencyKey`
- 32x32 pixel size for standard cursor dimensions

### File Communication
- Position updates written to `C:\temp\cursor_pos.txt`
- Hide signal sent via `C:\temp\cursor_hide.txt`
- C# overlay polls these files every 100ms

## Common Issues & Solutions

### Build Failures
- Ensure .NET 8.0 SDK is installed
- Check that C# project file paths are correct
- Verify TypeScript compilation completed successfully

### Cursor Not Visible
- Check if C# overlay process is running
- Verify temp directory exists and is writable
- Ensure cursor visibility is set to true

### Path Issues
- Remember compiled JS is in `dist/`, C# files are in `src/`
- Use relative paths `..\/src\/` when accessing C# files from compiled JS

## Lint & Type Check Commands
```bash
# Run linting
npm run lint

# Run type checking
npm run typecheck
```

## Testing the Cursor
The cursor should appear as an orange arrow that:
- Moves smoothly to specified coordinates
- Maintains proper arrow shape and transparency
- Responds to all MCP cursor functions
- Doesn't interfere with the user's actual cursor

## Architecture Notes
- Uses virtual cursor tracking (doesn't move system cursor until action)
- Temporarily moves system cursor only for clicks/drags, then restores
- Overlay stays always on top but allows click-through
- Cross-process communication via file system for simplicity