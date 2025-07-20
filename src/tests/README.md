# MCP Cursor Accuracy Testing

This directory contains tools for testing the accuracy and performance of the MCP (Model Context Protocol) second cursor implementation.

## Test Applications

### 1. Visual Grid Test (`grid-test.html`)
An interactive web-based testing application similar to the Neuralink webgrid, featuring:
- Configurable grid sizes (10x10 to 25x25)
- Adjustable cell sizes (20px to 60px)
- Manual and automated testing modes
- Real-time accuracy statistics
- Visual feedback for hits and misses

### 2. Automated Accuracy Test (`mcp-accuracy-test.js`)
A Node.js script that runs comprehensive accuracy benchmarks:
- Multiple test scenarios with different grid configurations
- Automated target generation and cursor movement
- Statistical analysis of accuracy and offset measurements
- JSON report generation

### 3. Browser Bridge (`mcp-browser-bridge.js`)
Connects the web-based grid test with the MCP server:
- WebSocket or file-based communication
- Abstracted MCP command interface
- Real-time cursor control from browser

## Quick Start

### Option 1: All-in-One Launcher
```bash
# Start both MCP server and web test interface
node src/tests/launch-test.js
```
This will:
- Build the project if needed
- Start the MCP server
- Start a local web server
- Open the grid test in your browser

### Option 2: Manual Setup
```bash
# 1. Build the project
npm run build

# 2. Start MCP server
npm start

# 3. Open grid-test.html in your browser
# or serve it via a local web server
```

### Option 3: Command Line Benchmark
```bash
# Run automated accuracy benchmark
node src/tests/mcp-accuracy-test.js
```

## Test Scenarios

The accuracy test includes several scenarios:

1. **Small Grid (10x10)** - 50px cells, 20 targets
   - Tests basic accuracy with larger targets
   
2. **Medium Grid (15x15)** - 40px cells, 30 targets  
   - Standard precision testing
   
3. **Large Grid (20x20)** - 30px cells, 25 targets
   - Higher density target testing
   
4. **Precision Test (25x25)** - 25px cells, 20 targets
   - Maximum precision challenge

## Using the Visual Grid Test

1. **Configure Grid**: Use the dropdown and slider to set grid size and cell size
2. **Start Test**: Click "Start Test" to begin manual testing
3. **Auto Test**: Click "Auto Test (MCP)" to run automated cursor testing
4. **Monitor Stats**: Watch real-time accuracy, hits, misses, and total targets

### Test Metrics

- **Accuracy**: Percentage of successful target hits
- **Average Offset**: Mean distance between target center and actual cursor position
- **Hit/Miss Ratio**: Visual representation of performance

## File Communication

The system uses temporary files for coordination:
- `C:\temp\cursor_pos.txt` - Current cursor position
- `C:\temp\cursor_hide.txt` - Cursor visibility control

## Accuracy Criteria

- **Hit**: Cursor within 10 pixels of target center
- **Miss**: Cursor more than 10 pixels from target center
- **Timeout**: Target not clicked within 5 seconds (counts as miss)

## Output and Reports

### JSON Report Format
```json
{
  "timestamp": "2025-01-XX...",
  "overallAccuracy": 85.5,
  "overallAvgOffset": 3.2,
  "totalHits": 171,
  "totalTargets": 200,
  "scenarios": [...]
}
```

Reports are saved to `src/tests/accuracy-report.json`

## Troubleshooting

### Common Issues

1. **MCP Server Not Starting**
   - Ensure project is built: `npm run build`
   - Check if port 3000 is available
   - Verify cursor overlay executable exists

2. **Cursor Not Visible**
   - Check temp directory exists and is writable
   - Verify C# overlay process is running
   - Ensure cursor visibility is set to true

3. **Inaccurate Measurements**
   - Verify screen resolution and scaling
   - Check if multiple monitors are affecting coordinates
   - Ensure browser zoom is at 100%

4. **Browser Bridge Connection Failed**
   - Fall back to file-based communication
   - Check browser console for errors
   - Verify MCP server is running

## Development Notes

- Grid coordinates are 0-indexed (0,0 = top-left)
- Screen coordinates assume standard Windows coordinate system
- All measurements are in pixels
- Test results include both raw data and statistical analysis