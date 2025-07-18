Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.Size = New-Object System.Drawing.Size(100, 100)
$form.Location = New-Object System.Drawing.Point(500, 300)
$form.BackColor = [System.Drawing.Color]::Red
$form.TopMost = $true
$form.ShowInTaskbar = $false
$form.ControlBox = $false

Write-Host "Showing red square at 500,300"
$form.Show()

# Keep it visible for 10 seconds
Start-Sleep -Seconds 10

$form.Close()
Write-Host "Done"