!macro NSIS_HOOK_PREINSTALL
  DetailPrint "Closing Aura Work before installing files..."
  nsExec::ExecToLog 'taskkill /F /T /IM "Aura Work.exe"'
  nsExec::ExecToLog 'taskkill /F /T /IM "aura-desktop.exe"'
  Sleep 1500
!macroend
