use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex};
use sysinfo::System;
use tauri::{Emitter, Manager, State};
use tauri_plugin_autostart::MacosLauncher;

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
struct WidgetConfig {
    id: String,
    w_type: String,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
    always_on_top: bool,
    acrylic: bool,
    visible_on_all_workspaces: bool,
}

struct AppState {
    widgets: Arc<Mutex<Vec<WidgetConfig>>>,
    sys: Arc<Mutex<System>>,
}

fn create_widget_window(app: &tauri::AppHandle, config: &WidgetConfig) -> Result<(), String> {
    let label = format!("widget-{}", config.id);

    // If window already exists, don't create it again
    if app.get_webview_window(&label).is_some() {
        return Ok(());
    }

    let window = tauri::WebviewWindowBuilder::new(
        app,
        label.clone(),
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title(format!("Widget: {}", config.w_type))
    .transparent(true)
    .decorations(false)
    .inner_size(config.width, config.height)
    .position(config.x, config.y)
    .resizable(false)
    .shadow(false)
    .always_on_top(config.always_on_top)
    .visible_on_all_workspaces(config.visible_on_all_workspaces)
    .build()
    .map_err(|e| e.to_string())?;

    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::NSWindow;
        extern "C" {
            pub fn CGWindowLevelForKey(key: i32) -> i32;
        }

        if let Ok(ns_window) = window.ns_window() {
            let ns_window = ns_window as cocoa::base::id;
            unsafe {
                let level = CGWindowLevelForKey(3);
                ns_window.setLevel_(level as i64);
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn get_widgets(state: State<AppState>) -> Vec<WidgetConfig> {
    state.widgets.lock().unwrap().clone()
}

#[tauri::command]
fn add_widget(
    app: tauri::AppHandle,
    state: State<AppState>,
    w_type: String,
    x: Option<f64>,
    y: Option<f64>,
    width: Option<f64>,
    height: Option<f64>,
) {
    let mut widgets = state.widgets.lock().unwrap();
    let id = uuid::Uuid::new_v4().to_string();

    let config = WidgetConfig {
        id: id.clone(),
        w_type: w_type.clone(),
        x: x.unwrap_or(100.0),
        y: y.unwrap_or(100.0),
        width: width.unwrap_or(300.0),
        height: height.unwrap_or(200.0),
        always_on_top: false,
        acrylic: false,
        visible_on_all_workspaces: false,
    };

    widgets.push(config.clone());
    let _ = create_widget_window(&app, &config);
    let _ = app.emit("widgets-update", widgets.clone());
}

#[tauri::command]
fn remove_widget(app: tauri::AppHandle, state: State<AppState>, id: String) {
    let mut widgets = state.widgets.lock().unwrap();
    widgets.retain(|w| w.id != id);

    if let Some(w) = app.get_webview_window(&format!("widget-{}", id)) {
        let _ = w.close();
    }

    let _ = app.emit("widgets-update", widgets.clone());
}

#[tauri::command]
fn update_widget_config(app: tauri::AppHandle, state: State<AppState>, config: WidgetConfig) {
    let mut widgets = state.widgets.lock().unwrap();
    if let Some(idx) = widgets.iter().position(|w| w.id == config.id) {
        widgets[idx] = config;
        let _ = app.emit("widgets-update", widgets.clone());
    }
}

#[tauri::command]
fn restore_widgets(app: tauri::AppHandle, state: State<AppState>, widget_list: Vec<WidgetConfig>) {
    let mut widgets = state.widgets.lock().unwrap();
    *widgets = widget_list.clone();

    for config in &widget_list {
        let _ = create_widget_window(&app, config);
    }
    let _ = app.emit("widgets-update", widgets.clone());
}

#[tauri::command]
fn get_app_stats(state: State<AppState>) -> serde_json::Value {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_all();

    let mut main_cpu = 0.0;
    let mut main_mem = 0;
    let mut render_cpu = 0.0;
    let mut render_mem = 0;

    if let Ok(pid) = sysinfo::get_current_pid() {
        if let Some(process) = sys.process(pid) {
            main_cpu = process.cpu_usage();
            main_mem = process.memory();
        }

        for (_, process) in sys.processes() {
            if process.parent() == Some(pid) {
                render_cpu += process.cpu_usage();
                render_mem += process.memory();
            }
        }
    }

    serde_json::json!({
        "main": { "cpu": main_cpu, "memory": main_mem / 1024 / 1024 },
        "renderer": { "cpu": render_cpu, "memory": render_mem / 1024 / 1024 },
        "total": {
            "cpu_usage": main_cpu + render_cpu,
            "memory_usage": (main_mem + render_mem) / 1024 / 1024
        }
    })
}

#[tauri::command]
async fn set_launch_at_login(app: tauri::AppHandle, enable: bool) -> Result<(), String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();

    if enable {
        autostart_manager.enable().map_err(|e| e.to_string())?;
    } else {
        autostart_manager.disable().map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn is_launch_at_login_enabled(app: tauri::AppHandle) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;

    let autostart_manager = app.autolaunch();
    autostart_manager.is_enabled().map_err(|e| e.to_string())
}

#[tauri::command]
fn read_widget_file(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn execute_command(command: String, work_dir: Option<String>) -> Result<String, String> {
    use std::process::Command;
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = Command::new("cmd");
        c.args(&["/C", &command]);
        c
    } else {
        let mut c = Command::new("sh");
        c.args(&["-c", &command]);
        c
    };

    if let Some(dir) = work_dir {
        cmd.current_dir(dir);
    }

    let output = cmd.output();

    match output {
        Ok(output) => {
            if output.status.success() {
                Ok(String::from_utf8_lossy(&output.stdout).to_string())
            } else {
                Err(String::from_utf8_lossy(&output.stderr).to_string())
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn open_devtools(app: tauri::AppHandle, id: String) {
    if let Some(w) = app.get_webview_window(&format!("widget-{}", id)) {
        w.open_devtools();
    }
}
#[tauri::command]
fn delete_widget_source(folder_path: String, w_type: String) -> Result<(), String> {
    let path = Path::new(&folder_path).join(format!("{}.widget", w_type));
    if path.exists() {
        fs::remove_dir_all(path).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Widget source folder not found".to_string())
    }
}

#[tauri::command]
fn scan_widget_folder(folder_path: String) -> Result<Vec<String>, String> {
    let path = Path::new(&folder_path);

    if !path.exists() {
        return Err(format!("Folder does not exist: {}", folder_path));
    }

    if !path.is_dir() {
        return Err(format!("Path is not a directory: {}", folder_path));
    }

    let mut widget_types = Vec::new();

    match fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let entry_path = entry.path();

                    if entry_path.is_dir() {
                        if let Some(dir_name) = entry_path.file_name() {
                            if let Some(name_str) = dir_name.to_str() {
                                if name_str.ends_with(".widget") {
                                    let mut found = false;
                                    for ext in &["js", "jsx"] {
                                        if entry_path.join(format!("index.{}", ext)).exists() {
                                            found = true;
                                            break;
                                        }
                                    }
                                    if found {
                                        let widget_type = name_str.replace(".widget", "");
                                        widget_types.push(widget_type);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Err(e) => {
            return Err(format!("Failed to read directory: {}", e));
        }
    }

    Ok(widget_types)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            app.manage(AppState {
                widgets: Arc::new(Mutex::new(vec![])),
                sys: Arc::new(Mutex::new(System::new_all())),
            });

            if let Some(window) = app.get_webview_window("control") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });

                #[cfg(target_os = "macos")]
                {
                    use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};
                    if let Ok(ns_window) = window.ns_window() {
                        let ns_window = ns_window as cocoa::base::id;
                        unsafe {
                            let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
                                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle;
                            ns_window.setCollectionBehavior_(behavior);
                        }
                    }
                }
            }

            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let show_i = tauri::menu::MenuItem::with_id(
                app,
                "show_control",
                "Control Panel",
                true,
                None::<&str>,
            )?;

            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i])?;

            let icon_img = image::load_from_memory(include_bytes!("../icons/tray.png"))
                .expect("failed to load tray icon")
                .into_rgba8();
            let (w, h) = icon_img.dimensions();
            let tray_icon = tauri::image::Image::new_owned(icon_img.into_vec(), w, h);

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show_control" => {
                        if let Some(w) = app.get_webview_window("control") {
                            let _ = w.show();
                            let _ = w.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            if let Some(main) = app.get_webview_window("main") {
                let _ = main.hide();
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_widgets,
            add_widget,
            remove_widget,
            update_widget_config,
            restore_widgets,
            get_app_stats,
            set_launch_at_login,
            is_launch_at_login_enabled,
            scan_widget_folder,
            read_widget_file,
            execute_command,
            open_devtools,
            delete_widget_source
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
