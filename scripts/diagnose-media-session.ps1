# Inspects the Windows media sessions (SMTC) that Chrome/YouTube registers.
# Run it, then run it AGAIN right after a track switch has "blocked" the buttons
# and compare the IsNextEnabled / IsPlayPauseEnabled flags.
#
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\diagnose-media-session.ps1

Add-Type -AssemblyName System.Runtime.WindowsRuntime

$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() |
    Where-Object {
        $_.Name -eq 'AsTask' -and
        $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]

function Await($WinRtTask, $ResultType) {
    $asTask  = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtTask))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media, ContentType = WindowsRuntime] | Out-Null

$mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])

$sessions = $mgr.GetSessions()
$current  = $mgr.GetCurrentSession()

Write-Host ""
Write-Host "Sessions found: $($sessions.Count)" -ForegroundColor Cyan
if ($current) {
    Write-Host "Current session: $($current.SourceAppUserModelId)" -ForegroundColor Cyan
} else {
    Write-Host "Current session: <none>  <-- nothing will respond to media keys" -ForegroundColor Yellow
}

foreach ($s in $sessions) {
    $info = $s.GetPlaybackInfo()
    $ctl  = $info.Controls
    $isCurrent = $current -and ($s.SourceAppUserModelId -eq $current.SourceAppUserModelId)

    Write-Host ""
    Write-Host "--- $($s.SourceAppUserModelId)$(if ($isCurrent) { '   [CURRENT]' })" -ForegroundColor Green
    Write-Host "    Status            : $($info.PlaybackStatus)"
    Write-Host "    IsPlayEnabled     : $($ctl.IsPlayEnabled)"
    Write-Host "    IsPauseEnabled    : $($ctl.IsPauseEnabled)"
    Write-Host "    IsNextEnabled     : $($ctl.IsNextEnabled)"
    Write-Host "    IsPreviousEnabled : $($ctl.IsPreviousEnabled)"

    try {
        $props = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
        Write-Host "    Title             : $($props.Title)"
    } catch {
        Write-Host "    Title             : <unavailable>"
    }
}

Write-Host ""
Write-Host "If IsNextEnabled flips to False after a track switch, the browser dropped" -ForegroundColor Yellow
Write-Host "its media-session handlers - the key is fine, nothing is listening." -ForegroundColor Yellow
Write-Host ""
