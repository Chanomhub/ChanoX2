; ChanoX2 Custom NSIS Installer Script
; This file customizes the installer appearance and behavior

!include "MUI2.nsh"

; =============================================
; Branding and Visual Customization
; =============================================

; Note: Many constants are already defined by electron-builder
; We use !ifndef to only define them if not already set

; Sidebar image for Welcome and Finish pages (164x314 pixels, BMP format)
!ifndef MUI_WELCOMEFINISHPAGE_BITMAP
  !define MUI_WELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-sidebar.bmp"
!endif
!ifndef MUI_UNWELCOMEFINISHPAGE_BITMAP
  !define MUI_UNWELCOMEFINISHPAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-sidebar.bmp"
!endif

; Header image (150x57 pixels, BMP format)
!ifndef MUI_HEADERIMAGE
  !define MUI_HEADERIMAGE
!endif
!ifndef MUI_HEADERIMAGE_BITMAP
  !define MUI_HEADERIMAGE_BITMAP "${BUILD_RESOURCES_DIR}\installer-header.bmp"
!endif
!ifndef MUI_HEADERIMAGE_BITMAP_NOSTRETCH
  !define MUI_HEADERIMAGE_BITMAP_NOSTRETCH
!endif
!ifndef MUI_HEADERIMAGE_RIGHT
  !define MUI_HEADERIMAGE_RIGHT
!endif

; Abort warning
!ifndef MUI_ABORTWARNING
  !define MUI_ABORTWARNING
!endif
!ifndef MUI_ABORTWARNING_TEXT
  !define MUI_ABORTWARNING_TEXT "Are you sure you want to cancel ChanoX2 installation?"
!endif

; =============================================
; Custom Welcome Page
; =============================================
!macro customWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Welcome to ChanoX2 Setup"
  !define MUI_WELCOMEPAGE_TITLE_3LINES
  !define MUI_WELCOMEPAGE_TEXT "This wizard will guide you through the installation of ChanoX2.$\r$\n$\r$\nChanoX2 is a desktop application for ChanomHub that lets you browse, download, and manage your game library.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_PAGE_WELCOME
!macroend

; =============================================
; Custom Uninstaller Welcome Page  
; =============================================
!macro customUnWelcomePage
  !define MUI_WELCOMEPAGE_TITLE "Uninstall ChanoX2"
  !define MUI_WELCOMEPAGE_TEXT "This wizard will uninstall ChanoX2 from your computer.$\r$\n$\r$\nBefore continuing, make sure ChanoX2 is not running.$\r$\n$\r$\nClick Next to continue."
  !insertmacro MUI_UNPAGE_WELCOME
!macroend

; =============================================
; Post-Installation Actions
; =============================================
!macro customInstall
  ; Create desktop shortcut (handled by electron-builder config, but can add custom ones here)
  ; Additional post-install tasks can go here
  
  ; Write install info to registry for better integration
  WriteRegStr HKCU "Software\ChanoX2" "InstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\ChanoX2" "Version" "${VERSION}"
!macroend

; =============================================
; Pre-Uninstall Actions
; =============================================
!macro customUnInstall
  ; Clean up registry entries
  DeleteRegKey HKCU "Software\ChanoX2"
  
  ; Remove user data directory (optional - uncomment if desired)
  ; RMDir /r "$APPDATA\ChanoX2"
!macroend

; =============================================
; Custom Finish Page
; =============================================
; Note: Finish page is handled by electron-builder's runAfterFinish option
