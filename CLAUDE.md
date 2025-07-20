# SecondHand - MCP Second Cursor Project

## Overview
This project provides a second cursor for Claude through MCP (Model Context Protocol). The cursor appears as an orange arrow that replicates the Windows cursor appearance but allows programmatic control without interfering with the user's actual cursor.

## Environment
- **Operating System**: Windows 11
- **Platform**: win32
- **Required**: .NET 8.0 SDK, Node.js, Modern web browser (Chrome/Edge recommended)
- **Screen Resolution**: Supports any resolution (tested on 1920x1080)

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
# - mcp__second-hand__take_screenshot(format?: 'png' | 'jpg')
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

## Webgrid Testing Tool

### Purpose
A fullscreen accuracy testing application that measures cursor precision through automated clicking tests. Provides unbiased, programmatic evaluation of cursor performance.

### Location
- **File**: `src/tests/grid-test.html`
- **Bridge**: `src/tests/mcp-browser-bridge.js`

### How to Use

#### Launch the Test
1. Ensure MCP server is running (`npm start`)
2. Open the test file in browser:
   ```bash
   start src/tests/grid-test.html
   # or
   cmd /c start "" "C:\DEV\SecondHand\src\tests\grid-test.html"
   ```
3. The test starts automatically with a clean fullscreen grid

#### Test Process
- **Grid**: Covers entire screen with small clickable cells
- **Targets**: Blue squares appear randomly one at a time
- **Scoring**: 
  - Blue square click = +1 hit
  - Wrong square click = +0 hits (but counts as attempt)
  - Total: 10 attempts maximum
- **Results**: Shows "Test: X/10 | Hits: Y | Accuracy: Z%" in top-right

#### Using with MCP
```javascript
// In browser console, manually trigger MCP clicking:
window.startMCPTest();

// Or programmatically via MCP functions:
// The test automatically integrates with window.mcpCursor if available
```

#### Interpreting Results
- **Perfect Score**: 10/10 (100% accuracy)
- **Good Score**: 8-9/10 (80-90% accuracy)
- **Needs Improvement**: <8/10 (<80% accuracy)
- **Final Display**: Shows "Score: X/10 (Y%)" when complete

### Test Features
- **Clean UI**: Minimal interface, fullscreen grid maximizes test area
- **Fresh State**: Previous hit/miss markers clear between tests
- **Real-time Stats**: Live accuracy tracking during test
- **Programmatic**: No human bias, purely automated clicking evaluation
- **Auto-restart**: Click anywhere after completion to restart

### Testing Best Practices
1. Run multiple test sessions for consistent results
2. Test under different screen conditions
3. Verify MCP server is responsive before testing
4. Use browser developer tools to monitor for errors

## Architecture Notes
- Uses virtual cursor tracking (doesn't move system cursor until action)
- Temporarily moves system cursor only for clicks/drags, then restores
- Overlay stays always on top but allows click-through
- Cross-process communication via file system for simplicity