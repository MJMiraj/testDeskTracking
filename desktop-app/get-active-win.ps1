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
$processId = 0
[Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId) | Out-Null
$p = Get-Process -Id $processId
$b = New-Object System.Text.StringBuilder 256
[Win32]::GetWindowText($hwnd, $b, 256) | Out-Null
Write-Output ($p.Name + "|||" + $b.ToString())
