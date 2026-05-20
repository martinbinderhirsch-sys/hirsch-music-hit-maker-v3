; Hirsch Music Hit Maker v3.6 — Custom NSIS Install/Uninstall Script

!macro customHeader
  !system "echo Hirsch Music Hit Maker v3.6 Setup"
!macroend

!macro customInstall
  ; Registry entry for version tracking
  WriteRegStr HKCU "Software\HirschMusic\HitMaker" "Version" "3.6.0"
  WriteRegStr HKCU "Software\HirschMusic\HitMaker" "InstallDate" "$EXEDIR"
  
  ; Remove old versions from Add/Remove Programs
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\hirsch-music-hit-maker-3.5.0"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\hirsch-music-hit-maker-3.4.0"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\hirsch-music-hit-maker-3.3.0"
!macroend

!macro customUnInstall
  ; Clean up registry
  DeleteRegKey HKCU "Software\HirschMusic\HitMaker"
  
  ; Remove old version registry entries
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\hirsch-music-hit-maker-3.5.0"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\hirsch-music-hit-maker-3.4.0"
  
  ; Remove app data
  RMDir /r "$APPDATA\hirsch-music-hit-maker"
  RMDir /r "$APPDATA\Hirsch Music Hit Maker"
  RMDir /r "$LOCALAPPDATA\hirsch-music-hit-maker"
  RMDir /r "$LOCALAPPDATA\Hirsch Music Hit Maker"
  RMDir /r "$LOCALAPPDATA\Programs\Hirsch Music Hit Maker"
!macroend
