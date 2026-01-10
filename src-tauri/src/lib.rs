use std::sync::{Arc, Mutex};
use sysinfo::System;
use tauri::{Emitter, Manager, State};
use tauri_plugin_autostart::MacosLauncher;

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
struct WidgetConfig {
    id: String,
    w_type: String,
}

struct AppState {
    widgets: Arc<Mutex<Vec<WidgetConfig>>>,
    sys: Arc<Mutex<System>>,
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

    widgets.push(WidgetConfig {
        id: id.clone(),
        w_type: w_type.clone(),
    });

    let label = format!("widget-{}", id);
    let win_width = width.unwrap_or(300.0);
    let win_height = height.unwrap_or(200.0);
    let win_x = x.unwrap_or(100.0);
    let win_y = y.unwrap_or(100.0);

    let window = tauri::WebviewWindowBuilder::new(
        &app,
        label.clone(),
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title(format!("Widget: {}", w_type))
    .transparent(true)
    .decorations(false)
    .inner_size(win_width, win_height)
    .position(win_x, win_y)
    .resizable(false)
    .shadow(false)
    .build()
    .unwrap();

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
        .manage(AppState {
            widgets: Arc::new(Mutex::new(vec![])),
            sys: Arc::new(Mutex::new(System::new_all())),
        })
        .invoke_handler(tauri::generate_handler![
            get_widgets,
            add_widget,
            remove_widget,
            get_app_stats,
            set_launch_at_login,
            is_launch_at_login_enabled
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("control") {
                let window_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = window_clone.hide();
                    }
                });
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
