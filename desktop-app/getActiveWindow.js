const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const psScript = `
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;
  public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);
    [DllImport("user32.dll")]
    public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
  }
"@
$hwnd = [Win32]::GetForegroundWindow()
if ($hwnd -eq 0) { Write-Output "Desktop|||"; exit }
$processId = 0
[Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$p = Get-Process -Id $processId -ErrorAction SilentlyContinue
$b = New-Object System.Text.StringBuilder 256
[Win32]::GetWindowText($hwnd, $b, 256) | Out-Null
$title = $b.ToString()
$name = if ($p) { $p.Name } else { "Unknown" }
Write-Output "$name|||$title"
`;

function getActiveWindow() {
    return new Promise((resolve) => {
        if (os.platform() !== 'win32') {
            return resolve('Desktop - Desktop');
        }
        
        const tmpPath = path.join(os.tmpdir(), 'get-active-win.ps1');
        if (!fs.existsSync(tmpPath)) {
            fs.writeFileSync(tmpPath, psScript);
        }

        exec(`powershell -ExecutionPolicy Bypass -NoProfile -File "${tmpPath}"`, { windowsHide: true }, (err, stdout) => {
            if (err) {
                console.error("Powershell error:", err);
                return resolve('Desktop - Desktop');
            }
            const parts = stdout.trim().split('|||');
            if (parts.length === 2) {
                const name = parts[0].trim();
                const title = parts[1].trim();
                if (!title) return resolve(`${name}`);
                resolve(`${name} - ${title}`);
            } else {
                resolve('Desktop - Desktop');
            }
        });
    });
}

module.exports = getActiveWindow;

// Test
if (require.main === module) {
    getActiveWindow().then(console.log);
}
