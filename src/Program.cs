using System;
using System.Drawing;
using System.Windows.Forms;
using System.IO;

class CursorOverlay : Form
{
    private System.Windows.Forms.Timer updateTimer;
    private System.Windows.Forms.Timer animationTimer;
    private string positionFile = @"C:\temp\cursor_pos.txt";
    private string hideFile = @"C:\temp\cursor_hide.txt";
    
    // Animation properties
    private Point targetPosition;
    private Point currentPosition;
    private DateTime animationStartTime;
    private TimeSpan animationDuration = TimeSpan.FromMilliseconds(800); // 800ms animation
    private bool isAnimating = false;
    
    public CursorOverlay()
    {
        // Form setup for transparent cursor overlay
        this.FormBorderStyle = FormBorderStyle.None;
        this.Size = new Size(32, 32); // Standard cursor size
        this.StartPosition = FormStartPosition.Manual;
        this.Location = new Point(400, 300); // Default position
        this.BackColor = Color.Magenta; // Will be made transparent
        this.TransparencyKey = Color.Magenta; // Make magenta transparent
        this.TopMost = true;
        this.ShowInTaskbar = false;
        this.ControlBox = false;
        this.Text = "SecondCursor";
        this.SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.DoubleBuffer, true);
        
        // Initialize positions
        currentPosition = this.Location;
        targetPosition = this.Location;
        
        // Setup timer for position updates
        updateTimer = new System.Windows.Forms.Timer();
        updateTimer.Interval = 100;
        updateTimer.Tick += UpdatePosition;
        updateTimer.Start();
        
        // Setup animation timer
        animationTimer = new System.Windows.Forms.Timer();
        animationTimer.Interval = 16; // ~60 FPS
        animationTimer.Tick += AnimationTick;
        
        Console.WriteLine("Orange cursor overlay started with animations");
    }
    
    private void UpdatePosition(object sender, EventArgs e)
    {
        try
        {
            // Check for hide signal
            if (File.Exists(hideFile))
            {
                File.Delete(hideFile);
                Console.WriteLine("Hide signal received");
                this.Close();
                return;
            }
            
            // Update target position from file
            if (File.Exists(positionFile))
            {
                string content = File.ReadAllText(positionFile).Trim();
                if (!string.IsNullOrEmpty(content))
                {
                    string[] coords = content.Split(',');
                    if (coords.Length == 2)
                    {
                        if (int.TryParse(coords[0], out int x) && int.TryParse(coords[1], out int y))
                        {
                            // Position form so the cursor tip appears exactly at the target coordinates
                            // Offset by cursor drawing offset so tip aligns with target
                            Point newTarget = new Point(x - 5, y - 5);
                            if (newTarget != targetPosition)
                            {
                                StartAnimation(newTarget);
                            }
                        }
                    }
                }
            }
            
            // Ensure we stay on top
            this.TopMost = true;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error: {ex.Message}");
        }
    }
    
    private void StartAnimation(Point newTarget)
    {
        targetPosition = newTarget;
        currentPosition = this.Location;
        animationStartTime = DateTime.Now;
        isAnimating = true;
        animationTimer.Start();
        Console.WriteLine($"Starting animation to ({newTarget.X}, {newTarget.Y})");
    }
    
    private void AnimationTick(object sender, EventArgs e)
    {
        if (!isAnimating) return;
        
        DateTime now = DateTime.Now;
        TimeSpan elapsed = now - animationStartTime;
        
        if (elapsed >= animationDuration)
        {
            // Animation complete
            this.Location = targetPosition;
            isAnimating = false;
            animationTimer.Stop();
            Console.WriteLine($"Animation complete at ({targetPosition.X}, {targetPosition.Y})");
            return;
        }
        
        // Calculate progress (0 to 1)
        double progress = elapsed.TotalMilliseconds / animationDuration.TotalMilliseconds;
        
        // Apply easing function (ease-out cubic)
        double easedProgress = 1 - Math.Pow(1 - progress, 3);
        
        // Interpolate position
        int x = (int)(currentPosition.X + (targetPosition.X - currentPosition.X) * easedProgress);
        int y = (int)(currentPosition.Y + (targetPosition.Y - currentPosition.Y) * easedProgress);
        
        this.Location = new Point(x, y);
    }
    
    protected override void OnPaint(PaintEventArgs e)
    {
        base.OnPaint(e);
        
        Graphics g = e.Graphics;
        g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
        
        // Draw orange cursor that looks like Windows cursor
        // Main cursor body (arrow shape) - offset so tip appears at intended coordinates
        int offsetX = 5;
        int offsetY = 5;
        Point[] cursorPoints = {
            new Point(0 + offsetX, 0 + offsetY),    // Top point
            new Point(0 + offsetX, 20 + offsetY),   // Left bottom
            new Point(7 + offsetX, 15 + offsetY),   // Inner point
            new Point(12 + offsetX, 24 + offsetY),  // Right bottom outer
            new Point(15 + offsetX, 22 + offsetY),  // Right bottom inner
            new Point(10 + offsetX, 13 + offsetY),  // Right inner
            new Point(18 + offsetX, 11 + offsetY),  // Right top
            new Point(0 + offsetX, 0 + offsetY)     // Close path
        };
        
        // Fill cursor with orange
        using (SolidBrush orangeBrush = new SolidBrush(Color.Orange))
        {
            g.FillPolygon(orangeBrush, cursorPoints);
        }
        
        // Draw black outline
        using (Pen blackPen = new Pen(Color.Black, 1))
        {
            g.DrawPolygon(blackPen, cursorPoints);
        }
        
        // Draw white inner outline for better visibility
        using (Pen whitePen = new Pen(Color.White, 1))
        {
            Point[] innerPoints = {
                new Point(1 + offsetX, 1 + offsetY),
                new Point(1 + offsetX, 18 + offsetY),
                new Point(7 + offsetX, 14 + offsetY),
                new Point(11 + offsetX, 22 + offsetY),
                new Point(13 + offsetX, 21 + offsetY),
                new Point(9 + offsetX, 12 + offsetY),
                new Point(16 + offsetX, 10 + offsetY),
                new Point(1 + offsetX, 1 + offsetY)
            };
            g.DrawPolygon(whitePen, innerPoints);
        }
    }
}

class Program
{
    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new CursorOverlay());
    }
}