#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { CursorController } from './cursor-controller.js';

const server = new Server(
  {
    name: 'second-hand-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const cursorController = new CursorController();

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'move_cursor',
        description: 'Move the second cursor to specific coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            x: {
              type: 'number',
              description: 'X coordinate (pixels from left edge)',
            },
            y: {
              type: 'number',
              description: 'Y coordinate (pixels from top edge)',
            },
          },
          required: ['x', 'y'],
        },
      },
      {
        name: 'click',
        description: 'Perform a left click at current cursor position or specific coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            x: {
              type: 'number',
              description: 'X coordinate (optional, uses current position if not specified)',
            },
            y: {
              type: 'number',
              description: 'Y coordinate (optional, uses current position if not specified)',
            },
            button: {
              type: 'string',
              enum: ['left', 'right', 'middle'],
              description: 'Mouse button to click',
              default: 'left',
            },
          },
          required: [],
        },
      },
      {
        name: 'double_click',
        description: 'Perform a double click at current cursor position or specific coordinates',
        inputSchema: {
          type: 'object',
          properties: {
            x: {
              type: 'number',
              description: 'X coordinate (optional, uses current position if not specified)',
            },
            y: {
              type: 'number',
              description: 'Y coordinate (optional, uses current position if not specified)',
            },
          },
          required: [],
        },
      },
      {
        name: 'drag',
        description: 'Drag from one position to another',
        inputSchema: {
          type: 'object',
          properties: {
            fromX: {
              type: 'number',
              description: 'Starting X coordinate',
            },
            fromY: {
              type: 'number',
              description: 'Starting Y coordinate',
            },
            toX: {
              type: 'number',
              description: 'Ending X coordinate',
            },
            toY: {
              type: 'number',
              description: 'Ending Y coordinate',
            },
          },
          required: ['fromX', 'fromY', 'toX', 'toY'],
        },
      },
      {
        name: 'get_cursor_position',
        description: 'Get the current position of the second cursor',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'get_screen_size',
        description: 'Get the screen dimensions',
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'show_cursor',
        description: 'Show or hide the visual second cursor overlay',
        inputSchema: {
          type: 'object',
          properties: {
            visible: {
              type: 'boolean',
              description: 'Whether to show the cursor overlay',
            },
          },
          required: ['visible'],
        },
      },
      {
        name: 'take_screenshot',
        description: 'Take a screenshot of the current screen',
        inputSchema: {
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['png', 'jpg'],
              description: 'Image format for the screenshot',
              default: 'png',
            },
          },
          required: [],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'move_cursor':
        if (!args || typeof args.x !== 'number' || typeof args.y !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for move_cursor');
        }
        await cursorController.moveVirtualCursor(args.x, args.y);
        return {
          content: [
            {
              type: 'text',
              text: `Moved virtual cursor to (${args.x}, ${args.y})`,
            },
          ],
        };

      case 'click':
        if (!args) {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for click');
        }
        if (args.x !== undefined && args.y !== undefined) {
          if (typeof args.x !== 'number' || typeof args.y !== 'number') {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid coordinates for click');
          }
          const button = typeof args.button === 'string' ? args.button : 'left';
          await cursorController.virtualClickAt(args.x, args.y, button);
          return {
            content: [
              {
                type: 'text',
                text: `Clicked ${button} button at (${args.x}, ${args.y})`,
              },
            ],
          };
        } else {
          const button = typeof args.button === 'string' ? args.button : 'left';
          await cursorController.virtualClick(button);
          const pos = await cursorController.getVirtualPosition();
          return {
            content: [
              {
                type: 'text',
                text: `Clicked ${button} button at virtual position (${pos.x}, ${pos.y})`,
              },
            ],
          };
        }

      case 'double_click':
        if (!args) {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for double_click');
        }
        if (args.x !== undefined && args.y !== undefined) {
          if (typeof args.x !== 'number' || typeof args.y !== 'number') {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid coordinates for double_click');
          }
          await cursorController.virtualDoubleClickAt(args.x, args.y);
          return {
            content: [
              {
                type: 'text',
                text: `Double-clicked at (${args.x}, ${args.y})`,
              },
            ],
          };
        } else {
          await cursorController.virtualDoubleClick();
          const pos = await cursorController.getVirtualPosition();
          return {
            content: [
              {
                type: 'text',
                text: `Double-clicked at virtual position (${pos.x}, ${pos.y})`,
              },
            ],
          };
        }

      case 'drag':
        if (!args || typeof args.fromX !== 'number' || typeof args.fromY !== 'number' || 
            typeof args.toX !== 'number' || typeof args.toY !== 'number') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for drag');
        }
        await cursorController.virtualDrag(args.fromX, args.fromY, args.toX, args.toY);
        return {
          content: [
            {
              type: 'text',
              text: `Dragged from (${args.fromX}, ${args.fromY}) to (${args.toX}, ${args.toY})`,
            },
          ],
        };

      case 'get_cursor_position':
        const pos = await cursorController.getVirtualPosition();
        return {
          content: [
            {
              type: 'text',
              text: `Current virtual cursor position: (${pos.x}, ${pos.y})`,
            },
          ],
        };

      case 'get_screen_size':
        const size = await cursorController.getScreenSize();
        return {
          content: [
            {
              type: 'text',
              text: `Screen size: ${size.width}x${size.height}`,
            },
          ],
        };

      case 'show_cursor':
        if (!args || typeof args.visible !== 'boolean') {
          throw new McpError(ErrorCode.InvalidParams, 'Invalid parameters for show_cursor');
        }
        await cursorController.setCursorVisibility(args.visible);
        return {
          content: [
            {
              type: 'text',
              text: `Cursor overlay ${args.visible ? 'shown' : 'hidden'}`,
            },
          ],
        };

      case 'take_screenshot':
        const format = args?.format === 'jpg' ? 'jpg' : 'png';
        
        const screenshotBuffer = await cursorController.takeScreenshot({ format });
        
        return {
          content: [
            {
              type: 'image',
              data: screenshotBuffer.toString('base64'),
              mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png',
            },
            {
              type: 'text',
              text: `Screenshot taken (${format.toUpperCase()}, ${screenshotBuffer.length} bytes)`,
            },
          ],
        };

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Second Hand MCP server running on stdio');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});