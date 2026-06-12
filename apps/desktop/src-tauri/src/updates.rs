use serde::Serialize;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInstallResult {
    pub installed: bool,
    pub version: Option<String>,
    pub message: String,
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<UpdateInstallResult, String> {
    #[cfg(desktop)]
    {
        use tauri_plugin_updater::UpdaterExt;

        let updater = app
            .updater_builder()
            .build()
            .map_err(|e| format!("Updater not configured: {e}"))?;

        let Some(update) = updater
            .check()
            .await
            .map_err(|e| format!("Update check failed: {e}"))?
        else {
            return Ok(UpdateInstallResult {
                installed: false,
                version: None,
                message: "You are already on the latest signed release.".into(),
            });
        };

        let version = update.version.clone();
        update
            .download_and_install(|_, _| {}, || {})
            .await
            .map_err(|e| format!("Update installation failed: {e}"))?;

        app.restart();

        #[allow(unreachable_code)]
        Ok(UpdateInstallResult {
            installed: true,
            version: Some(version),
            message: "Update installed. Restarting Aura Work.".into(),
        })
    }

    #[cfg(not(desktop))]
    {
        let _ = app;
        Ok(UpdateInstallResult {
            installed: false,
            version: None,
            message: "Updates are not supported on this platform.".into(),
        })
    }
}
