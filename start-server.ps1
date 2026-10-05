# Запуск Next.js без зависания от QuickEdit в CMD
$Host.UI.RawUI.FlushInputBuffer() | Out-Null
try {
  # Отключаем QuickEdit в текущей консоли
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public class ConsoleMode {
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern IntPtr GetStdHandle(int nStdHandle);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
  [DllImport("kernel32.dll", SetLastError=true)]
  public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
}
"@
  $handle = [ConsoleMode]::GetStdHandle(-10) # STD_INPUT_HANDLE
  $mode = 0
  if ([ConsoleMode]::GetConsoleMode($handle, [ref]$mode)) {
    $mode = $mode -band (-bnot 0x0040) # ~ENABLE_QUICK_EDIT_MODE
    $mode = $mode -bor 0x0080          # ENABLE_EXTENDED_FLAGS
    [ConsoleMode]::SetConsoleMode($handle, $mode) | Out-Null
  }
} catch {}

Set-Location $PSScriptRoot
npm run dev
