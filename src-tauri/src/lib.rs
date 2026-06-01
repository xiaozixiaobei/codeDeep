use tauri::Manager;
use std::process::Command;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to CodeDeep.", name)
}

#[tauri::command]
async fn execute_command(cmd: String, cwd: Option<String>) -> Result<serde_json::Value, String> {
    tokio::task::spawn_blocking(move || {
        let shell = if cfg!(target_os = "windows") { "powershell" } else { "/bin/sh" };
        let args = if cfg!(target_os = "windows") { vec!["-Command".to_string(), cmd] } else { vec!["-c".to_string(), cmd] };

        let mut command = Command::new(shell);
        command.args(&args);

        if let Some(cwd) = cwd {
            command.current_dir(cwd);
        }

        let output = command.output().map_err(|e| e.to_string())?;

        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        let code = output.status.code().unwrap_or(-1);

        Ok(serde_json::json!({
            "code": code,
            "stdout": stdout,
            "stderr": stderr
        }))
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet, execute_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
