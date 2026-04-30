; Custom NSIS-Hooks für den Hirsch Music Hit Maker Installer.
; Wird von electron-builder über package.json (build.nsis.include) eingebunden.

!macro customInstall
  ; Hier können später z.B. Registry-Einträge oder Datei-Assoziationen ergänzt werden.
  DetailPrint "Hirsch Music Hit Maker wird installiert…"
!macroend

!macro customUnInstall
  DetailPrint "Hirsch Music Hit Maker wird entfernt…"
  ; Nutzerdaten bleiben absichtlich erhalten (deleteAppDataOnUninstall: false in package.json).
!macroend
