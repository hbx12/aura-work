mod agent;
mod audit;
mod bridge;
mod bridge_helper;
mod bridge_internal;
mod browser;
mod computer_use;
mod i18n;
mod packaging;
mod updates;
mod cloud;
mod cloud_crypto;
mod cloud_helper;
mod db;
mod extensions_helper;
mod files;
mod git;
mod mcp;
mod memory;
mod sidecar_auth;
mod sidecars;
mod permissions;
mod plugins;
mod pricing;
mod projects;
mod providers;
mod scheduled;
mod shell;
mod task_writes;
mod tasks;
mod vault;
mod vm;
mod web;

use db::{init_db, seed_if_empty, DbState};
use providers::VaultHandle;
use std::sync::Arc;
use std::sync::Mutex;
use tauri::Manager;
use sidecars::SidecarSupervisor;
use vault::VaultState;

#[tauri::command]
fn toggle_pet_window(app: tauri::AppHandle, pet_type: String) {
    if let Some(window) = app.get_webview_window("pet-window") {
        let _ = window.close();
    } else {
        let url_str = format!("index.html?view=pet&type={}", pet_type);
        let url = tauri::WebviewUrl::App(std::path::PathBuf::from(url_str));
        let builder = tauri::WebviewWindowBuilder::new(&app, "pet-window", url)
            .title("Pet")
            .inner_size(150.0, 150.0)
            .transparent(true)
            .decorations(false)
            .always_on_top(true)
            .resizable(false)
            .skip_taskbar(true);
        #[cfg(target_os = "macos")]
        let builder = builder.shadow(false);
        if let Err(e) = builder.build() {
            eprintln!("Failed to spawn pet window: {:?}", e);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let conn = init_db(&app.handle())?;
            seed_if_empty(&conn)?;
            let db = DbState(Arc::new(Mutex::new(conn)));
            app.manage(db.clone());
            let pricing_db = db.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(error) = pricing::refresh_remote_pricing(&pricing_db).await {
                    eprintln!("[pricing] WARN: remote pricing refresh failed: {error}");
                }
            });
            let vault = VaultState::init(&app.handle())?;
            let vault_handle = VaultHandle(Arc::new(Mutex::new(vault)));
            app.manage(vault_handle.clone());
            bridge::init_bridge_runtime(db, vault_handle);
            scheduled::start_scheduler(app.handle().clone());
            app.manage(SidecarSupervisor::default());
            sidecars::start_all(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            projects::list_projects,
            projects::get_project,
            projects::create_project,
            projects::delete_project,
            projects::set_project_permission_mode,
            projects::pick_folder,
            agent::get_sidecar_status,
            providers::list_providers,
            providers::update_provider,
            providers::set_provider_secret,
            providers::connect_codex_account,
            providers::login_codex_account,
            providers::start_codex_login,
            providers::start_codex_device_login,
            providers::open_codex_login_page,
            providers::poll_codex_login,
            providers::clear_provider_secret,
            providers::get_routing_policy,
            providers::set_routing_policy,
            providers::get_vault_status,
            providers::export_vault,
            providers::import_vault,
            pricing::fetch_pricing,
            pricing::list_pricing,
            agent::validate_provider,
            agent::list_provider_models,
            agent::list_chat_models,
            agent::run_chat,
            agent::get_latest_usage,
            agent::list_task_usage,
            audit::list_audit_entries,
            permissions::resolve_permission,
            permissions::list_pending_permissions,
            files::list_project_files,
            files::read_project_file,
            files::search_project_files,
            files::write_project_file,
            files::approve_pending_edit,
            files::list_pending_edits,
            git::git_status,
            git::git_init,
            git::git_diff,
            git::propose_git_commit,
            git::approve_git_commit,
            git::list_pending_commits,
            tasks::create_task,
            tasks::list_tasks,
            tasks::get_task,
            tasks::start_task,
            tasks::approve_task_plan,
            tasks::advance_task,
            tasks::get_task_stream_text,
            tasks::pause_task,
            tasks::resume_task,
            tasks::cancel_task,
            tasks::resume_after_permission,
            tasks::resume_after_edit,
            vm::get_vm_status,
            vm::start_vm,
            vm::stop_vm,
            browser::get_browser_status,
            browser::start_browser,
            browser::stop_browser,
            plugins::get_plugins_status,
            plugins::start_plugins,
            plugins::stop_plugins,
            plugins::list_installed_plugins,
            plugins::install_local_plugin,
            plugins::uninstall_plugin,
            plugins::set_plugin_enabled,
            plugins::sync_marketplace,
            plugins::list_marketplace_entries,
            plugins::reload_plugins_helper,
            plugins::create_local_skill,
            plugins::list_local_skills,
            mcp::list_mcp_servers,
            mcp::add_mcp_server,
            mcp::delete_mcp_server,
            mcp::set_mcp_server_enabled,
            mcp::set_project_mcp_enabled,
            mcp::list_project_mcp_settings,
            cloud::get_cloud_status,
            cloud::cloud_register,
            cloud::cloud_login,
            cloud::cloud_logout,
            cloud::cloud_setup_recovery,
            cloud::cloud_set_sync_enabled,
            cloud::cloud_sync_now,
            cloud::cloud_create_pairing,
            cloud::cloud_list_devices,
            cloud::cloud_revoke_device,
            cloud::cloud_remote_dispatch,
            cloud::cloud_inspect_server,
            cloud::start_cloud_sync,
            cloud::stop_cloud_sync,
            cloud::get_cloud_sync_helper_status,
            scheduled::list_scheduled_tasks,
            scheduled::get_scheduled_task,
            scheduled::create_scheduled_task,
            scheduled::update_scheduled_task,
            scheduled::delete_scheduled_task,
            scheduled::list_scheduled_task_runs,
            scheduled::run_scheduled_task_now,
            scheduled::pause_scheduled_task,
            scheduled::resume_scheduled_task,
            bridge::get_bridge_status,
            bridge::start_bridge,
            bridge::stop_bridge,
            bridge::create_bridge_pairing,
            bridge::list_bridge_clients,
            bridge::revoke_bridge_client,
            bridge::list_bridge_projects,
            computer_use::get_computer_use_status,
            computer_use::start_computer_use,
            computer_use::stop_computer_use,
            computer_use::list_desktop_windows,
            computer_use::list_computer_use_blocklist,
            computer_use::update_computer_use_blocklist,
            computer_use::get_project_computer_settings,
            computer_use::set_project_screenshot_retention,
            computer_use::list_computer_use_screenshots,
            computer_use::delete_computer_use_screenshot,
            memory::list_pending_memories,
            memory::list_memories,
            memory::approve_memory,
            memory::reject_memory,
            memory::delete_memory,
            memory::propose_memory,
            i18n::list_supported_locales,
            i18n::get_app_locale,
            i18n::set_app_locale,
            i18n::detect_system_locale_cmd,
            packaging::get_packaging_info,
            packaging::verify_vm_image,
            packaging::check_for_updates,
            updates::install_update,
            packaging::get_pending_open_task,
            packaging::clear_pending_open_task,
            toggle_pet_window,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            if let tauri::RunEvent::Exit = event {
                sidecars::shutdown(app);
            }
        });
}
