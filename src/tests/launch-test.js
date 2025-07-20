import { spawn } from 'child_process';
import path from 'path';
import http from 'http';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TestLauncher {
    constructor() {
        this.mcpServer = null;
        this.httpServer = null;
        this.port = 8080;
    }

    async startHTTPServer() {
        return new Promise((resolve, reject) => {
            this.httpServer = http.createServer((req, res) => {
                const parsedUrl = new URL(req.url, `http://localhost:${this.port}`);
                let filePath = path.join(__dirname, parsedUrl.pathname === '/' ? 'grid-test.html' : parsedUrl.pathname);
                
                // Security check - only serve files from tests directory
                if (!filePath.startsWith(__dirname)) {
                    res.writeHead(403);
                    res.end('Forbidden');
                    return;
                }

                fs.readFile(filePath, (err, data) => {
                    if (err) {
                        res.writeHead(404);
                        res.end('File not found');
                        return;
                    }

                    let contentType = 'text/html';
                    if (filePath.endsWith('.js')) contentType = 'application/javascript';
                    if (filePath.endsWith('.css')) contentType = 'text/css';

                    res.writeHead(200, { 'Content-Type': contentType });
                    res.end(data);
                });
            });

            this.httpServer.listen(this.port, () => {
                console.log(`Test server running at http://localhost:${this.port}`);
                resolve();
            });

            this.httpServer.on('error', reject);
        });
    }

    async startMCPServer() {
        console.log('Starting MCP server...');
        const serverPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
        
        if (!fs.existsSync(serverPath)) {
            console.log('MCP server not found at', serverPath);
            console.log('Building project first...');
            await this.buildProject();
        }

        this.mcpServer = spawn('node', [serverPath], {
            stdio: 'pipe',
            cwd: path.join(__dirname, '..', '..')
        });

        this.mcpServer.stdout.on('data', (data) => {
            console.log(`MCP Server: ${data.toString().trim()}`);
        });

        this.mcpServer.stderr.on('data', (data) => {
            console.error(`MCP Server Error: ${data.toString().trim()}`);
        });

        this.mcpServer.on('close', (code) => {
            console.log(`MCP server exited with code ${code}`);
        });

        // Wait for server to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        return true;
    }

    async buildProject() {
        console.log('Building TypeScript project...');
        return new Promise((resolve, reject) => {
            const build = spawn('npm', ['run', 'build'], {
                stdio: 'inherit',
                cwd: path.join(__dirname, '..', '..')
            });

            build.on('close', (code) => {
                if (code === 0) {
                    console.log('Build completed successfully');
                    resolve();
                } else {
                    reject(new Error(`Build failed with code ${code}`));
                }
            });
        });
    }

    async openBrowser() {
        const url = `http://localhost:${this.port}`;
        console.log(`Opening browser to ${url}`);
        
        // Try to open browser (platform-specific)
        const start = process.platform === 'darwin' ? 'open' : 
                     process.platform === 'win32' ? 'start' : 'xdg-open';
        
        spawn(start, [url], { stdio: 'ignore' });
    }

    async launch() {
        console.log('=== MCP Cursor Accuracy Test Launcher ===\n');

        try {
            // Start HTTP server for the test application
            await this.startHTTPServer();

            // Start MCP server
            await this.startMCPServer();

            // Open browser
            await this.openBrowser();

            console.log('\n=== Test Environment Ready ===');
            console.log('- Grid test application: http://localhost:8080');
            console.log('- MCP server: Running in background');
            console.log('- Press Ctrl+C to stop all services');

            // Handle graceful shutdown
            process.on('SIGINT', () => {
                console.log('\nShutting down test environment...');
                this.shutdown();
            });

            // Keep the process alive
            process.stdin.resume();

        } catch (error) {
            console.error('Failed to launch test environment:', error);
            this.shutdown();
            process.exit(1);
        }
    }

    shutdown() {
        if (this.httpServer) {
            this.httpServer.close();
            console.log('HTTP server stopped');
        }

        if (this.mcpServer) {
            this.mcpServer.kill();
            console.log('MCP server stopped');
        }

        process.exit(0);
    }
}

// Launch if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const launcher = new TestLauncher();
    launcher.launch();
}

export default TestLauncher;