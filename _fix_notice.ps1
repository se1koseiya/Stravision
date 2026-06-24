$f = 'c:\Users\24121\Documents\stravision\meijie\berry-realm-v4.0\app\ai-assistant\page.tsx'
$c = [System.IO.File]::ReadAllText($f)
$old = "    />`r`n    </App>"
$new = "    />`r`n    </GlassNotificationProvider>`r`n    </App>"
if ($c.Contains($old)) {
  $c = $c.Replace($old, $new)
  [System.IO.File]::WriteAllText($f, $c, [System.Text.Encoding]::UTF8)
  Write-Host "OK: replaced"
} else {
  Write-Host "SKIP: pattern not found"
}
