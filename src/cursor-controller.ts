import { mouse, screen, Button, Point } from '@nut-tree-fork/nut-js';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export class CursorController {
  private virtualX: number = 0;
  private virtualY: number = 0;
  private cursorVisible: boolean = true;
  private overlayProcess: ChildProcess | null = null;
  private originalCursorPosition: Position | null = null;

  constructor() {
    // Initialize with screen center and show cursor
    this.initializePosition();
    
    // Ensure cleanup on process exit
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  private async initializePosition(): Promise<void> {
    try {
      const screenSize = await this.getScreenSize();
      // Start virtual cursor at screen center
      this.virtualX = Math.floor(screenSize.width / 2);
      this.virtualY = Math.floor(screenSize.height / 2);
      
      // Show cursor overlay by default
      await this.showOverlay();
    } catch (error) {
      console.error('Error initializing virtual cursor position:', error);
      this.virtualX = 100;
      this.virtualY = 100;
      // Still try to show overlay even if position init failed
      try {
        await this.showOverlay();
      } catch (overlayError) {
        console.error('Error showing initial cursor overlay:', overlayError);
      }
    }
  }

  async moveVirtualCursor(x: number, y: number): Promise<void> {
    // Validate coordinates
    const screenSize = await this.getScreenSize();
    x = Math.max(0, Math.min(x, screenSize.width - 1));
    y = Math.max(0, Math.min(y, screenSize.height - 1));

    // Update virtual cursor position (don't move system cursor)
    this.virtualX = x;
    this.virtualY = y;

    // Update overlay if visible
    if (this.cursorVisible) {
      await this.updateOverlay();
    }
  }

  async moveTo(x: number, y: number): Promise<void> {
    // Legacy method for backward compatibility - moves system cursor
    const screenSize = await this.getScreenSize();
    x = Math.max(0, Math.min(x, screenSize.width - 1));
    y = Math.max(0, Math.min(y, screenSize.height - 1));

    await mouse.setPosition(new Point(x, y));
  }

  async click(button: string = 'left'): Promise<void> {
    const nutButton = this.mapButton(button);
    await mouse.click(nutButton);
  }

  async clickAt(x: number, y: number, button: string = 'left'): Promise<void> {
    await this.moveTo(x, y);
    await this.click(button);
  }

  async virtualClick(button: string = 'left'): Promise<void> {
    // Save current system cursor position
    this.originalCursorPosition = await mouse.getPosition();
    
    // Move system cursor to virtual position
    await mouse.setPosition(new Point(this.virtualX, this.virtualY));
    
    // Perform click
    const nutButton = this.mapButton(button);
    await mouse.click(nutButton);
    
    // Restore original cursor position
    if (this.originalCursorPosition) {
      await mouse.setPosition(new Point(this.originalCursorPosition.x, this.originalCursorPosition.y));
    }
  }

  async virtualClickAt(x: number, y: number, button: string = 'left'): Promise<void> {
    // Update virtual cursor position
    await this.moveVirtualCursor(x, y);
    
    // Perform virtual click
    await this.virtualClick(button);
  }

  async doubleClick(): Promise<void> {
    await mouse.doubleClick(Button.LEFT);
  }

  async doubleClickAt(x: number, y: number): Promise<void> {
    await this.moveTo(x, y);
    await this.doubleClick();
  }

  async virtualDoubleClick(): Promise<void> {
    // Save current system cursor position
    this.originalCursorPosition = await mouse.getPosition();
    
    // Move system cursor to virtual position
    await mouse.setPosition(new Point(this.virtualX, this.virtualY));
    
    // Perform double click
    await mouse.doubleClick(Button.LEFT);
    
    // Restore original cursor position
    if (this.originalCursorPosition) {
      await mouse.setPosition(new Point(this.originalCursorPosition.x, this.originalCursorPosition.y));
    }
  }

  async virtualDoubleClickAt(x: number, y: number): Promise<void> {
    // Update virtual cursor position
    await this.moveVirtualCursor(x, y);
    
    // Perform virtual double click
    await this.virtualDoubleClick();
  }

  async drag(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    // Move to starting position
    await this.moveTo(fromX, fromY);
    
    // Press and hold
    await mouse.pressButton(Button.LEFT);
    
    // Small delay to ensure the mouse button is registered as pressed
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Move to end position
    await this.moveTo(toX, toY);
    
    // Release
    await mouse.releaseButton(Button.LEFT);
  }

  async virtualDrag(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    // Save current system cursor position
    this.originalCursorPosition = await mouse.getPosition();
    
    // Move system cursor to virtual start position
    await mouse.setPosition(new Point(fromX, fromY));
    
    // Press and hold
    await mouse.pressButton(Button.LEFT);
    
    // Small delay to ensure the mouse button is registered as pressed
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Move to end position
    await mouse.setPosition(new Point(toX, toY));
    
    // Release
    await mouse.releaseButton(Button.LEFT);
    
    // Update virtual cursor to end position
    await this.moveVirtualCursor(toX, toY);
    
    // Restore original cursor position
    if (this.originalCursorPosition) {
      await mouse.setPosition(new Point(this.originalCursorPosition.x, this.originalCursorPosition.y));
    }
  }

  async getPosition(): Promise<Position> {
    const position = await mouse.getPosition();
    return { x: position.x, y: position.y };
  }

  async getVirtualPosition(): Promise<Position> {
    return { x: this.virtualX, y: this.virtualY };
  }

  async getScreenSize(): Promise<Size> {
    const size = await screen.width();
    const height = await screen.height();
    return { width: size, height: height };
  }

  async setCursorVisibility(visible: boolean): Promise<void> {
    this.cursorVisible = visible;
    
    if (visible) {
      await this.showOverlay();
    } else {
      await this.hideOverlay();
    }
  }

  private mapButton(button: string): Button {
    switch (button.toLowerCase()) {
      case 'left':
        return Button.LEFT;
      case 'right':
        return Button.RIGHT;
      case 'middle':
        return Button.MIDDLE;
      default:
        return Button.LEFT;
    }
  }

  private async showOverlay(): Promise<void> {
    try {
      if (this.overlayProcess) {
        return; // Already showing
      }
      
      // Write position file
      await this.writePositionFile();
      
      const projectPath = join(__dirname, '..', 'src', 'cursor-overlay.csproj');
      const exePath = join(__dirname, '..', 'src', 'bin', 'Debug', 'net8.0-windows', 'cursor-overlay.exe');
      
      // Check if executable already exists
      const fs = await import('fs');
      const executableExists = fs.existsSync(exePath);
      
      if (!executableExists) {
        console.log('Building .NET cursor overlay...');
        
        // Build the .NET project
        const buildProcess = spawn('dotnet', ['build', projectPath], {
          windowsHide: true,
          stdio: 'pipe'
        });
        
        // Wait for build to complete
        await new Promise<void>((resolve, reject) => {
          buildProcess.on('exit', (code) => {
            if (code === 0) {
              console.log('.NET overlay built successfully');
              resolve();
            } else {
              console.error('Failed to build .NET overlay');
              reject(new Error(`Build failed with code ${code}`));
            }
          });
          
          buildProcess.on('error', (error) => {
            console.error('Build error:', error);
            reject(error);
          });
        });
      }
      
      // Start the compiled executable
      console.log('Starting cursor overlay executable...');
      this.overlayProcess = spawn(exePath, [], {
        windowsHide: false,
        stdio: 'pipe'
      });
      
      // Log overlay output for debugging
      if (this.overlayProcess.stdout) {
        this.overlayProcess.stdout.on('data', (data) => {
          console.log(`Overlay stdout: ${data}`);
        });
      }
      
      if (this.overlayProcess.stderr) {
        this.overlayProcess.stderr.on('data', (data) => {
          console.error(`Overlay stderr: ${data}`);
        });
      }
      
      this.overlayProcess.on('exit', (code) => {
        console.log(`Overlay process exited with code ${code}`);
        this.overlayProcess = null;
      });
      
      console.log(`Second cursor overlay process started at (${this.virtualX}, ${this.virtualY})`);
      
    } catch (error) {
      console.error('Error showing cursor overlay:', error);
    }
  }
  
  private async showPowerShellOverlay(): Promise<void> {
    try {
      // Fallback PowerShell implementation
      const psScript = `
        Add-Type -AssemblyName System.Windows.Forms
        Add-Type -AssemblyName System.Drawing
        
        $form = New-Object System.Windows.Forms.Form
        $form.FormBorderStyle = 'None'
        $form.Size = New-Object System.Drawing.Size(50, 50)
        $form.Location = New-Object System.Drawing.Point(${this.virtualX - 25}, ${this.virtualY - 25})
        $form.BackColor = [System.Drawing.Color]::Red
        $form.TopMost = $true
        $form.ShowInTaskbar = $false
        $form.ControlBox = $false
        $form.Show()
        
        while ($true) {
            Start-Sleep -Milliseconds 200
            if (Test-Path "C:\\temp\\cursor_pos.txt") {
                $pos = Get-Content "C:\\temp\\cursor_pos.txt" -Raw -ErrorAction SilentlyContinue
                if ($pos) {
                    $coords = $pos.Split(',')
                    if ($coords.Length -eq 2) {
                        $x = [int]$coords[0] - 25
                        $y = [int]$coords[1] - 25
                        $form.Location = New-Object System.Drawing.Point($x, $y)
                    }
                }
            }
            if (Test-Path "C:\\temp\\cursor_hide.txt") {
                Remove-Item "C:\\temp\\cursor_hide.txt" -Force -ErrorAction SilentlyContinue
                break
            }
        }
        $form.Close()
      `;
      
      this.overlayProcess = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-Command', psScript], {
        windowsHide: true,
        stdio: 'pipe'
      });
      
      this.overlayProcess.on('exit', (code) => {
        console.log(`PowerShell overlay process exited with code ${code}`);
        this.overlayProcess = null;
      });
      
    } catch (error) {
      console.error('Error showing PowerShell overlay:', error);
    }
  }

  private async hideOverlay(): Promise<void> {
    try {
      if (this.overlayProcess) {
        // Signal overlay to close
        const fs = await import('fs');
        fs.writeFileSync('C:\\temp\\cursor_hide.txt', 'hide');
        
        this.overlayProcess.kill();
        this.overlayProcess = null;
      }
      console.log('Second cursor overlay hidden');
    } catch (error) {
      console.error('Error hiding cursor overlay:', error);
    }
  }

  private async updateOverlay(): Promise<void> {
    if (this.cursorVisible) {
      await this.writePositionFile();
      console.log(`Second cursor moved to (${this.virtualX}, ${this.virtualY})`);
    }
  }

  private async writePositionFile(): Promise<void> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      // Ensure temp directory exists
      const tempDir = 'C:\\temp';
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Write position to file
      fs.writeFileSync(path.join(tempDir, 'cursor_pos.txt'), `${this.virtualX},${this.virtualY}`);
    } catch (error) {
      console.error('Error writing position file:', error);
    }
  }

  private cleanup(): void {
    try {
      if (this.overlayProcess) {
        this.overlayProcess.kill();
        this.overlayProcess = null;
      }
      
      // Clean up temp files using dynamic import
      import('fs').then(fs => {
        const tempFiles = ['C:\\temp\\cursor_pos.txt', 'C:\\temp\\cursor_hide.txt'];
        tempFiles.forEach(file => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
      }).catch(error => {
        console.error('Error cleaning up temp files:', error);
      });
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export default CursorController;