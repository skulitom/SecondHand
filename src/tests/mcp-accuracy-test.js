import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPAccuracyTest {
    constructor() {
        this.mcpServer = null;
        this.testResults = [];
        this.isRunning = false;
    }

    async startMCPServer() {
        console.log('Starting MCP server...');
        const serverPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
        
        this.mcpServer = spawn('node', [serverPath], {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..', '..')
        });

        this.mcpServer.stdout.on('data', (data) => {
            console.log(`MCP Server: ${data}`);
        });

        this.mcpServer.stderr.on('data', (data) => {
            console.error(`MCP Server Error: ${data}`);
        });

        // Wait for server to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
    }

    async stopMCPServer() {
        if (this.mcpServer) {
            this.mcpServer.kill();
            this.mcpServer = null;
        }
    }

    async testCursorAccuracy(targets = 50, gridSize = 15, cellSize = 40) {
        console.log(`Starting accuracy test with ${targets} targets...`);
        
        const results = {
            totalTargets: targets,
            hits: 0,
            misses: 0,
            accuracy: 0,
            avgOffset: 0,
            offsets: []
        };

        // Show cursor
        await this.sendMCPCommand('show_cursor', { visible: true });
        await this.sleep(500);

        for (let i = 0; i < targets; i++) {
            console.log(`Target ${i + 1}/${targets}`);
            
            // Generate random target coordinates
            const targetRow = Math.floor(Math.random() * gridSize);
            const targetCol = Math.floor(Math.random() * gridSize);
            
            // Calculate screen coordinates (assuming grid is centered at 960x540)
            const screenX = 960 + (targetCol - gridSize/2) * cellSize;
            const screenY = 540 + (targetRow - gridSize/2) * cellSize;
            
            console.log(`  Target: (${targetCol}, ${targetRow}) -> Screen: (${screenX}, ${screenY})`);
            
            // Move cursor to target
            const moveResult = await this.sendMCPCommand('move_cursor', { 
                x: screenX, 
                y: screenY 
            });
            
            await this.sleep(100);
            
            // Get actual cursor position
            const posResult = await this.sendMCPCommand('get_cursor_position', {});
            
            if (posResult && posResult.x !== undefined && posResult.y !== undefined) {
                const offsetX = Math.abs(posResult.x - screenX);
                const offsetY = Math.abs(posResult.y - screenY);
                const totalOffset = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
                
                results.offsets.push(totalOffset);
                
                // Consider it a hit if within 10 pixels
                if (totalOffset <= 10) {
                    results.hits++;
                    console.log(`  HIT - Offset: ${totalOffset.toFixed(2)}px`);
                } else {
                    results.misses++;
                    console.log(`  MISS - Offset: ${totalOffset.toFixed(2)}px`);
                }
            } else {
                results.misses++;
                console.log(`  MISS - Could not get cursor position`);
            }
            
            await this.sleep(200);
        }

        // Calculate statistics
        results.accuracy = (results.hits / results.totalTargets) * 100;
        results.avgOffset = results.offsets.reduce((a, b) => a + b, 0) / results.offsets.length;

        // Hide cursor
        await this.sendMCPCommand('show_cursor', { visible: false });

        return results;
    }

    async sendMCPCommand(command, params) {
        // This is a simplified version - in a real implementation,
        // you would communicate with the MCP server via JSON-RPC
        
        try {
            switch (command) {
                case 'show_cursor':
                    return await this.simulateShowCursor(params.visible);
                case 'move_cursor':
                    return await this.simulateMoveCursor(params.x, params.y);
                case 'get_cursor_position':
                    return await this.simulateGetCursorPosition();
                default:
                    throw new Error(`Unknown command: ${command}`);
            }
        } catch (error) {
            console.error(`Error executing command ${command}:`, error);
            return null;
        }
    }

    async simulateShowCursor(visible) {
        // Write to cursor visibility file
        const hideFilePath = 'C:\\temp\\cursor_hide.txt';
        try {
            if (visible) {
                // Remove hide file to show cursor
                if (fs.existsSync(hideFilePath)) {
                    fs.unlinkSync(hideFilePath);
                }
            } else {
                // Create hide file to hide cursor
                fs.writeFileSync(hideFilePath, 'hide');
            }
            return { success: true };
        } catch (error) {
            console.error('Error controlling cursor visibility:', error);
            return { success: false };
        }
    }

    async simulateMoveCursor(x, y) {
        // Write position to cursor position file
        const posFilePath = 'C:\\temp\\cursor_pos.txt';
        try {
            fs.writeFileSync(posFilePath, `${x},${y}`);
            return { success: true, x, y };
        } catch (error) {
            console.error('Error moving cursor:', error);
            return { success: false };
        }
    }

    async simulateGetCursorPosition() {
        // Read position from cursor position file
        const posFilePath = 'C:\\temp\\cursor_pos.txt';
        try {
            if (fs.existsSync(posFilePath)) {
                const content = fs.readFileSync(posFilePath, 'utf8').trim();
                const [x, y] = content.split(',').map(Number);
                return { x, y };
            }
            return { x: 0, y: 0 };
        } catch (error) {
            console.error('Error getting cursor position:', error);
            return null;
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async runBenchmark() {
        console.log('=== MCP Cursor Accuracy Benchmark ===\n');
        
        try {
            // Start MCP server
            await this.startMCPServer();
            
            // Run different test scenarios
            const scenarios = [
                { name: 'Small Grid (10x10)', targets: 20, gridSize: 10, cellSize: 50 },
                { name: 'Medium Grid (15x15)', targets: 30, gridSize: 15, cellSize: 40 },
                { name: 'Large Grid (20x20)', targets: 25, gridSize: 20, cellSize: 30 },
                { name: 'Precision Test (25x25)', targets: 20, gridSize: 25, cellSize: 25 }
            ];

            for (const scenario of scenarios) {
                console.log(`\n--- ${scenario.name} ---`);
                const results = await this.testCursorAccuracy(
                    scenario.targets, 
                    scenario.gridSize, 
                    scenario.cellSize
                );
                
                this.testResults.push({
                    scenario: scenario.name,
                    ...results
                });
                
                console.log(`Results: ${results.hits}/${results.totalTargets} hits (${results.accuracy.toFixed(1)}%)`);
                console.log(`Average offset: ${results.avgOffset.toFixed(2)}px`);
                
                await this.sleep(1000);
            }
            
            // Generate report
            this.generateReport();
            
        } catch (error) {
            console.error('Benchmark failed:', error);
        } finally {
            await this.stopMCPServer();
        }
    }

    generateReport() {
        console.log('\n=== FINAL REPORT ===');
        
        let totalHits = 0;
        let totalTargets = 0;
        let totalOffset = 0;
        let totalTests = 0;
        
        for (const result of this.testResults) {
            totalHits += result.hits;
            totalTargets += result.totalTargets;
            totalOffset += result.avgOffset;
            totalTests++;
            
            console.log(`\n${result.scenario}:`);
            console.log(`  Accuracy: ${result.accuracy.toFixed(1)}%`);
            console.log(`  Average Offset: ${result.avgOffset.toFixed(2)}px`);
            console.log(`  Hits: ${result.hits}/${result.totalTargets}`);
        }
        
        const overallAccuracy = (totalHits / totalTargets) * 100;
        const overallAvgOffset = totalOffset / totalTests;
        
        console.log('\n--- OVERALL PERFORMANCE ---');
        console.log(`Overall Accuracy: ${overallAccuracy.toFixed(1)}%`);
        console.log(`Overall Average Offset: ${overallAvgOffset.toFixed(2)}px`);
        console.log(`Total Hits: ${totalHits}/${totalTargets}`);
        
        // Save results to file
        const reportPath = path.join(__dirname, 'accuracy-report.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            overallAccuracy,
            overallAvgOffset,
            totalHits,
            totalTargets,
            scenarios: this.testResults
        }, null, 2));
        
        console.log(`\nDetailed report saved to: ${reportPath}`);
    }
}

// Run the benchmark if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new MCPAccuracyTest();
    test.runBenchmark().then(() => {
        console.log('\nBenchmark complete!');
        process.exit(0);
    }).catch(error => {
        console.error('Benchmark failed:', error);
        process.exit(1);
    });
}

export default MCPAccuracyTest;