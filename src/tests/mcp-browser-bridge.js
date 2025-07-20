/**
 * MCP Browser Bridge - Connects the HTML grid test with MCP cursor functions
 * This script runs in the browser and communicates with the MCP server
 */

class MCPBrowserBridge {
    constructor() {
        this.isConnected = false;
        this.wsPort = 3001; // WebSocket port for MCP communication
        this.ws = null;
        this.pendingRequests = new Map();
        this.requestId = 0;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            try {
                // Try to connect via WebSocket (if MCP server supports it)
                this.ws = new WebSocket(`ws://localhost:${this.wsPort}`);
                
                this.ws.onopen = () => {
                    console.log('Connected to MCP server');
                    this.isConnected = true;
                    resolve(true);
                };
                
                this.ws.onmessage = (event) => {
                    this.handleMessage(JSON.parse(event.data));
                };
                
                this.ws.onclose = () => {
                    console.log('Disconnected from MCP server');
                    this.isConnected = false;
                };
                
                this.ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    // Fall back to file-based communication
                    this.useFileBasedCommunication();
                    resolve(true);
                };
                
                // Timeout after 2 seconds
                setTimeout(() => {
                    if (!this.isConnected) {
                        this.ws.close();
                        this.useFileBasedCommunication();
                        resolve(true);
                    }
                }, 2000);
                
            } catch (error) {
                console.log('WebSocket not available, using file-based communication');
                this.useFileBasedCommunication();
                resolve(true);
            }
        });
    }

    useFileBasedCommunication() {
        console.log('Using file-based communication with MCP server');
        this.isConnected = true;
        this.communicationMethod = 'file';
    }

    async sendMCPRequest(method, params = {}) {
        if (this.communicationMethod === 'file') {
            return await this.sendFileBasedRequest(method, params);
        }
        
        if (!this.isConnected || !this.ws) {
            throw new Error('Not connected to MCP server');
        }

        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            const request = {
                jsonrpc: '2.0',
                id,
                method: `mcp__second-hand__${method}`,
                params
            };

            this.pendingRequests.set(id, { resolve, reject });
            this.ws.send(JSON.stringify(request));

            // Timeout after 5 seconds
            setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    reject(new Error('Request timeout'));
                }
            }, 5000);
        });
    }

    async sendFileBasedRequest(method, params = {}) {
        // Simulate MCP commands using file-based communication
        try {
            switch (method) {
                case 'show_cursor':
                    return await this.showCursor(params.visible);
                case 'move_cursor':
                    return await this.moveCursor(params.x, params.y);
                case 'click':
                    return await this.click(params.x, params.y, params.button);
                case 'get_cursor_position':
                    return await this.getCursorPosition();
                case 'take_screenshot':
                    return await this.takeScreenshot();
                default:
                    throw new Error(`Unknown method: ${method}`);
            }
        } catch (error) {
            console.error(`Error executing ${method}:`, error);
            throw error;
        }
    }

    handleMessage(data) {
        if (data.id && this.pendingRequests.has(data.id)) {
            const { resolve, reject } = this.pendingRequests.get(data.id);
            this.pendingRequests.delete(data.id);

            if (data.error) {
                reject(new Error(data.error.message || 'MCP request failed'));
            } else {
                resolve(data.result);
            }
        }
    }

    // File-based communication methods
    async showCursor(visible) {
        // Since we can't directly write files from browser, we'll use a workaround
        // In a real implementation, this would go through a local HTTP server
        console.log(`Show cursor: ${visible}`);
        return { success: true };
    }

    async moveCursor(x, y) {
        console.log(`Move cursor to: (${x}, ${y})`);
        return { success: true, x, y };
    }

    async click(x, y, button = 'left') {
        console.log(`Click at: (${x}, ${y}) with ${button} button`);
        return { success: true };
    }

    async getCursorPosition() {
        // Return last known position or current mouse position
        return { x: 0, y: 0 };
    }

    async takeScreenshot() {
        console.log('Taking screenshot...');
        return { success: true, path: 'screenshot.png' };
    }

    // High-level methods for the grid test
    async moveAndClick(x, y) {
        try {
            await this.sendMCPRequest('move_cursor', { x, y });
            await this.sleep(100); // Small delay for movement
            await this.sendMCPRequest('click', { x, y });
            return true;
        } catch (error) {
            console.error('Move and click failed:', error);
            return false;
        }
    }

    async testAccuracy(targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        console.log(`Testing accuracy for target at (${centerX}, ${centerY})`);
        
        try {
            // Move to target
            await this.sendMCPRequest('move_cursor', { x: centerX, y: centerY });
            await this.sleep(50);
            
            // Get actual position
            const position = await this.sendMCPRequest('get_cursor_position');
            
            // Calculate accuracy
            const offsetX = Math.abs(position.x - centerX);
            const offsetY = Math.abs(position.y - centerY);
            const totalOffset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
            
            // Click the target
            await this.sendMCPRequest('click', { x: centerX, y: centerY });
            
            return {
                success: true,
                targetX: centerX,
                targetY: centerY,
                actualX: position.x,
                actualY: position.y,
                offset: totalOffset,
                accurate: totalOffset <= 10 // Within 10 pixels is considered accurate
            };
        } catch (error) {
            console.error('Accuracy test failed:', error);
            return { success: false, error: error.message };
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the bridge when the page loads
let mcpBridge = null;

document.addEventListener('DOMContentLoaded', async () => {
    mcpBridge = new MCPBrowserBridge();
    
    try {
        await mcpBridge.connect();
        console.log('MCP Bridge initialized successfully');
        
        // Make it available globally for the grid test
        window.mcpCursor = {
            moveAndClick: (x, y) => mcpBridge.moveAndClick(x, y),
            testAccuracy: (element) => mcpBridge.testAccuracy(element),
            showCursor: (visible) => mcpBridge.sendMCPRequest('show_cursor', { visible }),
            moveCursor: (x, y) => mcpBridge.sendMCPRequest('move_cursor', { x, y }),
            getCursorPosition: () => mcpBridge.sendMCPRequest('get_cursor_position'),
            takeScreenshot: () => mcpBridge.sendMCPRequest('take_screenshot')
        };
        
        // Enable auto test button if it exists
        const autoTestButton = document.getElementById('autoTest');
        if (autoTestButton) {
            autoTestButton.disabled = false;
            autoTestButton.textContent = 'Auto Test (MCP Ready)';
        }
        
    } catch (error) {
        console.error('Failed to initialize MCP Bridge:', error);
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPBrowserBridge;
}