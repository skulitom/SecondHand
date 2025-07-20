import { mouse, screen, Button, Point } from '@nut-tree-fork/nut-js';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
// import screenshot from 'screenshot-desktop'; // Removed due to Windows compatibility issues

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
      
      // Add a small delay to allow animation to be visible
      await new Promise(resolve => setTimeout(resolve, 350));
    }
  }

  private async rawMoveTo(x: number, y: number): Promise<void> {
    // Raw move without coordinate transformation - for internal use
    const screenSize = await this.getScreenSize();
    const clampedX = Math.max(0, Math.min(x, screenSize.width - 1));
    const clampedY = Math.max(0, Math.min(y, screenSize.height - 1));

    await mouse.setPosition(new Point(clampedX, clampedY));
  }

  async moveTo(x: number, y: number): Promise<void> {
    // Transform screenshot coordinates to click coordinates
    const transformed = await this.transformScreenshotToClickCoordinates(x, y);
    await this.rawMoveTo(transformed.x, transformed.y);
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
    
    // Move system cursor to virtual position with validation
    const screenSize = await this.getScreenSize();
    const clickX = Math.max(0, Math.min(this.virtualX, screenSize.width - 1));
    const clickY = Math.max(0, Math.min(this.virtualY, screenSize.height - 1));
    
    await mouse.setPosition(new Point(clickX, clickY));
    
    // Increased delay to ensure cursor position is registered properly
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Verify cursor position before clicking
    const actualPosition = await mouse.getPosition();
    console.log(`Virtual click: intended (${clickX}, ${clickY}), actual (${actualPosition.x}, ${actualPosition.y})`);
    
    // Perform click
    const nutButton = this.mapButton(button);
    await mouse.click(nutButton);
    
    // Small delay before restoring cursor position
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Restore original cursor position
    if (this.originalCursorPosition) {
      await mouse.setPosition(new Point(this.originalCursorPosition.x, this.originalCursorPosition.y));
    }
  }

  async virtualClickAt(x: number, y: number, button: string = 'left'): Promise<void> {
    // For webgrid testing, coordinates are already in screen coordinates
    // Skip transformation since scaling factors are 1.0 and causes coordinate errors
    console.log(`Virtual click at: input coordinates (${x}, ${y})`);
    
    // Update virtual cursor position directly - no transformation needed
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
    // Transform screenshot coordinates to click coordinates
    const transformedFrom = await this.transformScreenshotToClickCoordinates(fromX, fromY);
    const transformedTo = await this.transformScreenshotToClickCoordinates(toX, toY);
    
    // Move to starting position
    await this.rawMoveTo(transformedFrom.x, transformedFrom.y);
    
    // Press and hold
    await mouse.pressButton(Button.LEFT);
    
    // Small delay to ensure the mouse button is registered as pressed
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Move to end position
    await this.rawMoveTo(transformedTo.x, transformedTo.y);
    
    // Release
    await mouse.releaseButton(Button.LEFT);
  }

  async virtualDrag(fromX: number, fromY: number, toX: number, toY: number): Promise<void> {
    // Transform screenshot coordinates to click coordinates
    const transformedFrom = await this.transformScreenshotToClickCoordinates(fromX, fromY);
    const transformedTo = await this.transformScreenshotToClickCoordinates(toX, toY);
    
    // Save current system cursor position
    this.originalCursorPosition = await mouse.getPosition();
    
    // Move system cursor to transformed start position (raw coordinates)
    const screenSize = await this.getScreenSize();
    const clampedFromX = Math.max(0, Math.min(transformedFrom.x, screenSize.width - 1));
    const clampedFromY = Math.max(0, Math.min(transformedFrom.y, screenSize.height - 1));
    await mouse.setPosition(new Point(clampedFromX, clampedFromY));
    
    // Press and hold
    await mouse.pressButton(Button.LEFT);
    
    // Small delay to ensure the mouse button is registered as pressed
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Move to transformed end position (raw coordinates)
    const clampedToX = Math.max(0, Math.min(transformedTo.x, screenSize.width - 1));
    const clampedToY = Math.max(0, Math.min(transformedTo.y, screenSize.height - 1));
    await mouse.setPosition(new Point(clampedToX, clampedToY));
    
    // Release
    await mouse.releaseButton(Button.LEFT);
    
    // Update virtual cursor to transformed end position
    await this.moveVirtualCursor(transformedTo.x, transformedTo.y);
    
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

  async getPhysicalScreenSize(): Promise<Size> {
    const { spawn } = await import('child_process');
    
    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      $primaryScreen = [System.Windows.Forms.Screen]::PrimaryScreen
      Write-Host "$($primaryScreen.Bounds.Width),$($primaryScreen.Bounds.Height)"
    `;
    
    return new Promise((resolve, reject) => {
      const process = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-Command', psScript], {
        windowsHide: true,
        stdio: 'pipe'
      });
      
      let output = '';
      
      if (process.stdout) {
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
      }
      
      process.on('exit', (code) => {
        if (code === 0) {
          const [width, height] = output.trim().split(',').map(Number);
          resolve({ width, height });
        } else {
          reject(new Error(`Failed to get physical screen size: ${code}`));
        }
      });
    });
  }

  async transformScreenshotToClickCoordinates(screenshotX: number, screenshotY: number): Promise<{x: number, y: number}> {
    const logicalSize = await this.getScreenSize();
    const physicalSize = await this.getPhysicalScreenSize();
    
    // Calculate scaling factors
    const scaleX = logicalSize.width / physicalSize.width;
    const scaleY = logicalSize.height / physicalSize.height;
    
    // Transform coordinates
    const clickX = Math.round(screenshotX * scaleX);
    const clickY = Math.round(screenshotY * scaleY);
    
    console.log(`Coordinate transformation: screenshot(${screenshotX}, ${screenshotY}) -> click(${clickX}, ${clickY}), scale(${scaleX.toFixed(3)}, ${scaleY.toFixed(3)})`);
    
    return { x: clickX, y: clickY };
  }

  async setCursorVisibility(visible: boolean): Promise<void> {
    this.cursorVisible = visible;
    
    if (visible) {
      await this.showOverlay();
    } else {
      await this.hideOverlay();
    }
  }

  async takeScreenshot(options: { format?: 'png' | 'jpg' } = {}): Promise<Buffer> {
    const { format = 'png' } = options;
    
    // Use PowerShell screenshot directly due to compatibility issues with screenshot packages
    return await this.takeScreenshotWithPowerShell(format);
  }

  private async takeScreenshotWithPowerShell(format: 'png' | 'jpg'): Promise<Buffer> {
    const { spawn } = await import('child_process');
    const { promisify } = await import('util');
    const fs = await import('fs');
    const path = await import('path');
    const { randomUUID } = await import('crypto');
    
    const tempDir = 'C:\\temp';
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const tempFile = path.join(tempDir, `screenshot_${randomUUID()}.${format}`);
    
    const psScript = `
      Add-Type -AssemblyName System.Drawing
      Add-Type -AssemblyName System.Windows.Forms
      
      # Get primary screen bounds
      $primaryScreen = [System.Windows.Forms.Screen]::PrimaryScreen
      $width = $primaryScreen.Bounds.Width
      $height = $primaryScreen.Bounds.Height
      
      # Create bitmap
      $bitmap = New-Object System.Drawing.Bitmap $width, $height
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      
      # Copy from screen
      $graphics.CopyFromScreen(0, 0, 0, 0, [System.Drawing.Size]::new($width, $height))
      
      $imageFormat = [System.Drawing.Imaging.ImageFormat]::${format.toUpperCase() === 'JPG' ? 'Jpeg' : 'Png'}
      $bitmap.Save("${tempFile}", $imageFormat)
      
      $graphics.Dispose()
      $bitmap.Dispose()
      
      Write-Host "Screenshot saved to: ${tempFile}"
    `;
    
    return new Promise((resolve, reject) => {
      const process = spawn('powershell', ['-ExecutionPolicy', 'Bypass', '-Command', psScript], {
        windowsHide: true,
        stdio: 'pipe'
      });
      
      let output = '';
      let error = '';
      
      if (process.stdout) {
        process.stdout.on('data', (data) => {
          output += data.toString();
        });
      }
      
      if (process.stderr) {
        process.stderr.on('data', (data) => {
          error += data.toString();
        });
      }
      
      process.on('exit', (code) => {
        if (code === 0) {
          try {
            // Read the screenshot file
            const buffer = fs.readFileSync(tempFile);
            
            // Clean up temp file
            fs.unlinkSync(tempFile);
            
            resolve(buffer);
          } catch (readError) {
            reject(new Error(`Failed to read screenshot file: ${readError}`));
          }
        } else {
          reject(new Error(`PowerShell screenshot failed with code ${code}: ${error}`));
        }
      });
      
      process.on('error', (err) => {
        reject(new Error(`PowerShell process error: ${err}`));
      });
    });
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
      
      // No offset needed - cursor should appear exactly where clicks happen
      const adjustedX = this.virtualX;
      const adjustedY = this.virtualY;
      
      // Write position to file
      fs.writeFileSync(path.join(tempDir, 'cursor_pos.txt'), `${adjustedX},${adjustedY}`);
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