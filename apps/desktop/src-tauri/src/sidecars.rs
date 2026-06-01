use crate::packaging::load_packaging_info;
use crate::sidecar_auth::{generate_sidecar_token, register_sidecar_token, sidecar_bearer};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};

#[derive(Clone)]
pub struct SidecarSupervisor(pub Arc<Mutex<SidecarState>>);

pub struct SidecarState {
    pub children: Vec<Child>,
}

impl Default for SidecarState {
    fn default() -> Self {
        Self {
            children: Vec::new(),
        }
    }
}

impl Default for SidecarSupervisor {
    fn default() -> Self {
        Self(Arc::new(Mutex::new(SidecarState::default())))
    }
}

struct SidecarDef {
    id: &'static str,
    rel_dir: &'static str,
    port: u16,
    env_key: &'static str,
    auth_env_key: &'static str,
}

const SIDECAR_AUTH_ENV: &str = "AURA_SIDECAR_AUTH_TOKEN";

const SIDECARS: &[SidecarDef] = &[
    SidecarDef {
        id: "aura-agent",
        rel_dir: "sidecar/aura-agent",
        port: 47821,
        env_key: "AURA_AGENT_PORT",
        auth_env_key: SIDECAR_AUTH_ENV,
    },
    SidecarDef {
        id: "aura-vm-helper",
        rel_dir: "sidecar/aura-vm-helper",
        port: 47822,
        env_key: "AURA_VM_PORT",
        auth_env_key: SIDECAR_AUTH_ENV,
    },
    SidecarDef {
        id: "aura-browser-helper",
        rel_dir: "sidecar/aura-browser-helper",
        port: 47823,
        env_key: "AURA_BROWSER_PORT",
        auth_env_key: SIDECAR_AUTH_ENV,
    },
    SidecarDef {
        id: "aura-plugins-helper",
        rel_dir: "sidecar/aura-plugins-helper",
        port: 47824,
        env_key: "AURA_PLUGINS_PORT",
        auth_env_key: SIDECAR_AUTH_ENV,
    },
    SidecarDef {
        id: "aura-cloud-sync",
        rel_dir: "sidecar/aura-cloud-sync",
        port: 47825,
        env_key: "AURA_CLOUD_SYNC_PORT",
        auth_env_key: SIDECAR_AUTH_ENV,
    },
    SidecarDef {
        id: "aura-bridge",
        rel_dir: "sidecar/aura-bridge",
        port: 47826,
        env_key: "AURA_BRIDGE_PORT",
        auth_env_key: SIDECAR_AUTH_ENV,
    },
    SidecarDef {
        id: "aura-computer-use",
        rel_dir: "sidecar/aura-computer-use",
        port: 47828,
        env_key: "AURA_COMPUTER_USE_PORT",
        auth_env_key: SIDECAR_AUTH_ENV,
    },
];

fn find_workspace_root() -> Option<PathBuf> {
    let mut candidates = Vec::new();
    if let Ok(cwd) = std::env::current_dir() {
        candidates.push(cwd);
    }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(parent) = exe.parent() {
            candidates.push(parent.to_path_buf());
            if let Some(grand) = parent.parent() {
                candidates.push(grand.to_path_buf());
            }
        }
    }
    for start in candidates {
        let mut p: &Path = start.as_path();
        loop {
            if p.join("sidecar").is_dir() && p.join("package.json").exists() {
                return Some(p.to_path_buf());
            }
            p = p.parent()?;
        }
    }
    None
}

fn node_binary(app: &AppHandle) -> String {
    if let Ok(resource) = app.path().resource_dir() {
        #[cfg(windows)]
        let bundled = resource.join("node").join("node.exe");
        #[cfg(not(windows))]
        let bundled = resource.join("node").join("bin").join("node");
        if bundled.exists() {
            return bundled.to_string_lossy().to_string();
        }
    }
    "node".into()
}

fn sidecar_entry(app: &AppHandle, def: &SidecarDef) -> Option<(PathBuf, PathBuf)> {
    // Dev: always prefer workspace sidecars (have access to hoisted node_modules).
    // Bundled copies under resources/ only contain dist/ and crash on import.
    if let Some(root) = find_workspace_root() {
        let pkg_dir = root.join(def.rel_dir);
        let script = pkg_dir.join("dist").join("index.js");
        if script.exists() {
            return Some((script, pkg_dir));
        }
    }

    if let Ok(resource) = app.path().resource_dir() {
        let pkg_dir = resource.join("sidecars").join(def.id);
        let script = pkg_dir.join("dist").join("index.js");
        if script.exists() {
            return Some((script, pkg_dir));
        }
    }

    None
}

fn spawn_sidecar(app: &AppHandle, def: &SidecarDef, token: &str) -> Option<Child> {
    let (script, workdir) = sidecar_entry(app, def)?;
    let node = node_binary(app);

    let mut cmd = Command::new(&node);
    cmd.arg(&script)
        .current_dir(&workdir)
        .env(def.env_key, def.port.to_string())
        .env(def.auth_env_key, token)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(root) = find_workspace_root() {
        let node_modules = root.join("node_modules");
        if node_modules.is_dir() {
            cmd.env("NODE_PATH", node_modules);
        }
    }

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        cmd.creation_flags(CREATE_NO_WINDOW);
    }

    match cmd.spawn() {
        Ok(child) => {
            eprintln!("[sidecars] started {} on port {} ({})", def.id, def.port, script.display());
            Some(child)
        }
        Err(e) => {
            eprintln!("[sidecars] failed to start {}: {e}", def.id);
            None
        }
    }
}

fn sidecar_health_url(port: u16) -> String {
    format!("http://127.0.0.1:{port}/health")
}

fn poll_sidecar_health(port: u16, sidecar_id: &str, attempts: u32) -> bool {
    for _ in 0..attempts {
        let mut req = ureq::get(&sidecar_health_url(port));
        if let Some(auth) = sidecar_bearer(sidecar_id) {
            req = req.set("Authorization", &auth);
        }
        if req
            .call()
            .map(|r| r.status() >= 200 && r.status() < 300)
            .unwrap_or(false)
        {
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(250));
    }
    false
}

pub fn start_all(app: &AppHandle) {
    if std::env::var("AURA_SKIP_SIDECARS").ok().as_deref() == Some("1") {
        return;
    }

    let supervisor = app.state::<SidecarSupervisor>();
    let Ok(mut state) = supervisor.0.lock() else {
        return;
    };

    for def in SIDECARS {
        let token = generate_sidecar_token();
        register_sidecar_token(def.id, token.clone());
        if let Some(child) = spawn_sidecar(app, def, &token) {
            state.children.push(child);
        }
    }

    drop(state);

    std::thread::spawn({
        let app = app.clone();
        move || {
            for def in SIDECARS {
                if poll_sidecar_health(def.port, def.id, 40) {
                    eprintln!("[sidecars] {} ready on port {}", def.id, def.port);
                } else {
                    eprintln!(
                        "[sidecars] WARN: {} did not respond on port {} — retrying once",
                        def.id, def.port
                    );
                    if let Ok(mut state) = app.state::<SidecarSupervisor>().0.lock() {
                        if let Some(token) = crate::sidecar_auth::sidecar_token(def.id) {
                            if let Some(child) = spawn_sidecar(&app, def, &token) {
                                state.children.push(child);
                            }
                        }
                    }
                    if poll_sidecar_health(def.port, def.id, 20) {
                        eprintln!("[sidecars] {} ready after retry", def.id);
                    } else {
                        eprintln!("[sidecars] ERROR: {} failed to start", def.id);
                    }
                }
            }
        }
    });
}

pub fn shutdown(app: &AppHandle) {
    if let Ok(mut state) = app.state::<SidecarSupervisor>().0.lock() {
        for mut child in state.children.drain(..) {
            let _ = child.kill();
            let _ = child.wait();
        }
    }
}

pub fn sidecar_manifest_ports() -> HashMap<String, u16> {
    let mut map = HashMap::new();
    for def in SIDECARS {
        map.insert(def.id.to_string(), def.port);
    }
    map
}

pub fn load_manifest_sidecars(app: &AppHandle) -> Vec<(String, u16)> {
    let _ = load_packaging_info(app);
    SIDECARS
        .iter()
        .map(|d| (d.id.to_string(), d.port))
        .collect()
}
