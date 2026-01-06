use std::sync::{Arc, Mutex};
use tauri::{Manager, Emitter};
use sysinfo::{System};



#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
struct WidgetConfig {
    id: String,
    w_type: String, 
    is_background: bool,
}

struct AppState {
    widgets: Arc<Mutex<Vec<WidgetConfig>>>,
    sys: Arc<Mutex<System>>,
}

#[tauri::command]
fn get_widgets(state: tauri::State<AppState>) -> Vec<WidgetConfig> {
    state.widgets.lock().unwrap().clone()
}

#[tauri::command]
fn add_widget(app: tauri::AppHandle, state: tauri::State<AppState>, w_type: String, is_background: Option<bool>) {
    println!("Backend: add_widget called with type: {}, is_background: {:?}", w_type, is_background);
    let mut widgets = state.widgets.lock().unwrap();
    let id =  uuid::Uuid::new_v4().to_string();
    let is_bg = is_background.unwrap_or(true);
    
    widgets.push(WidgetConfig {
        id: id.clone(),
        w_type: w_type.clone(),
        is_background: is_bg,
    });
    
    // Spawn a new window for the widget
    let label = format!("widget-{}", id);
    let window = tauri::WebviewWindowBuilder::new(&app, label.clone(), tauri::WebviewUrl::App("index.html".into()))
        .title(format!("Widget: {}", w_type))
        .transparent(true)
        .decorations(false)
        .resizable(false)
        .shadow(false)
        .visible_on_all_workspaces(true)
        .maximized(true)
        .build()
        .unwrap();

    // Apply background settings immediately
    #[cfg(not(target_os = "macos"))]
    let _ = window.set_ignore_cursor_events(is_bg);
    
    #[cfg(target_os = "macos")]
    {
        use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};
        use cocoa::base::id as cocoa_id;
        
        extern "C" {
            pub fn CGWindowLevelForKey(key: i32) -> i32;
        }

        if let Ok(ns_window) = window.ns_window() {
            let ns_window = ns_window as cocoa_id;
            unsafe {
                if is_bg {
                    // kCGDesktopWindowLevelKey is 2
                    let level = CGWindowLevelForKey(2);
                    ns_window.setLevel_(level as i64);
                    ns_window.setIgnoresMouseEvents_(if is_bg { cocoa::base::YES } else { cocoa::base::NO });
                    ns_window.setCollectionBehavior_(
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces |
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary |
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle
                    );
                } else {
                    // kCGFloatingWindowLevelKey is 3
                    let level = CGWindowLevelForKey(3);
                    ns_window.setLevel_(level as i64); 
                    ns_window.setIgnoresMouseEvents_(cocoa::base::NO);
                    ns_window.setCollectionBehavior_(
                        NSWindowCollectionBehavior::NSWindowCollectionBehaviorDefault
                    );
                }
            }
        }
    }

    #[cfg(not(target_os = "macos"))]
    {
        let _ = window.set_always_on_bottom(is_bg);
    }

    println!("Backend: Emitting widgets-update with {} widgets", widgets.len());
    let _ = app.emit("widgets-update", widgets.clone());
}

#[tauri::command]
fn set_widget_background(app: tauri::AppHandle, state: tauri::State<AppState>, id: String, background: bool) {
    let mut widgets = state.widgets.lock().unwrap();
    if let Some(w) = widgets.iter_mut().find(|w| w.id == id) {
        w.is_background = background;
        
        if let Some(window) = app.get_webview_window(&format!("widget-{}", id)) {
            #[cfg(not(target_os = "macos"))]
            let _ = window.set_ignore_cursor_events(background);
            
            #[cfg(target_os = "macos")]
            {
                use cocoa::appkit::{NSWindow, NSWindowCollectionBehavior};
                use cocoa::base::id as cocoa_id;
                
                extern "C" {
                    pub fn CGWindowLevelForKey(key: i32) -> i32;
                }

                let ns_window = window.ns_window().unwrap() as cocoa_id;
                unsafe {
                    if background {
                        // kCGDesktopWindowLevelKey is 2
                        let level = CGWindowLevelForKey(2);
                        ns_window.setLevel_(level as i64);
                        ns_window.setIgnoresMouseEvents_(if background { cocoa::base::YES } else { cocoa::base::NO });
                        ns_window.setCollectionBehavior_(
                            NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces |
                            NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary |
                            NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle
                        );
                    } else {
                        // kCGFloatingWindowLevelKey is 3
                        let level = CGWindowLevelForKey(3);
                        ns_window.setLevel_(level as i64); 
                        ns_window.setIgnoresMouseEvents_(cocoa::base::NO);
                        ns_window.setCollectionBehavior_(
                            NSWindowCollectionBehavior::NSWindowCollectionBehaviorDefault
                        );
                    }
                }
            }
            
            #[cfg(not(target_os = "macos"))]
            {
                let _ = window.set_always_on_bottom(background);
            }
        }
    }
    let _ = app.emit("widgets-update", widgets.clone());
}

#[tauri::command]
fn remove_widget(app: tauri::AppHandle, state: tauri::State<AppState>, id: String) {
    println!("Backend: remove_widget called with id: {}", id);
    let mut widgets = state.widgets.lock().unwrap();
    widgets.retain(|w| w.id != id);
    
    // Close the corresponding window
    if let Some(w) = app.get_webview_window(&format!("widget-{}", id)) {
        let _ = w.close();
    }

    let _ = app.emit("widgets-update", widgets.clone());
}

// Removed update_widget_rects as we're now using separate windows per widget

#[tauri::command]
fn get_app_stats(state: tauri::State<AppState>) -> serde_json::Value {
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

        // Include child processes (renderers)
        for (_, process) in sys.processes() {
            if process.parent() == Some(pid) {
                render_cpu += process.cpu_usage();
                render_mem += process.memory();
            }
        }
    }

    serde_json::json!({
        "main": {
            "cpu": main_cpu,
            "memory": main_mem / 1024 / 1024
        },
        "renderer": {
            "cpu": render_cpu,
            "memory": render_mem / 1024 / 1024
        },
        "total": {
            "cpu_usage": main_cpu + render_cpu,
            "memory_usage": (main_mem + render_mem) / 1024 / 1024
        }
    })
}


#[tauri::command]
async fn execute_command(command: String) -> Result<String, String> {
    use std::process::Command;
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", &command]).output()
    } else {
        Command::new("sh").args(["-c", &command]).output()
    };

    match output {
        Ok(o) => {
            if o.status.success() {
                Ok(String::from_utf8_lossy(&o.stdout).to_string())
            } else {
                Err(String::from_utf8_lossy(&o.stderr).to_string())
            }
        },
        Err(e) => Err(e.to_string()),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { 
            widgets: Arc::new(Mutex::new(vec![])),
            sys: Arc::new(Mutex::new(System::new_all())),
        })
        .invoke_handler(tauri::generate_handler![get_widgets, add_widget, remove_widget, get_app_stats, execute_command, set_widget_background])
        .setup(move |app| {
            // Set Activation Policy to Accessory (hides dock icon)
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // System Tray Setup
            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
            let show_i = tauri::menu::MenuItem::with_id(app, "show_control", "Control Panel", true, None::<&str>).unwrap();
            let debug_i = tauri::menu::MenuItem::with_id(app, "show_debug", "Show debug consoles", true, None::<&str>).unwrap();
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &debug_i, &quit_i]).unwrap();

            
            let icon_img = image::load_from_memory(include_bytes!("../icons/tray.png"))
                .expect("failed to load tray icon")
                .into_rgba8();
            let (width, height) = icon_img.dimensions();
            let tray_icon = tauri::image::Image::new_owned(icon_img.into_vec(), width, height);

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(tray_icon)
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "quit" => app.exit(0),
                        "show_control" => {
                             if let Some(w) = app.get_webview_window("control") {
                                 let _ = w.show();
                                 let _ = w.set_focus();
                             }
                        }
                        "show_debug" => {
                            // Open devtools for all widget windows
                            for (_, window) in app.webview_windows() {
                                window.open_devtools();
                            }
                        }
                        _ => {}
                    }
                })
                .build(app);

            // Hide or handle main window
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.hide();
            }

            // Spawn initial widget
            add_widget(app.handle().clone(), app.state::<AppState>(), "ClockWidget".into(), None);

            // Setup for Control Window if it exists
            if let Some(control_window) = app.get_webview_window("control") {
                let _ = control_window.set_resizable(false);
                let _ = control_window.set_maximizable(false);
                let _ = control_window.set_minimizable(false);

                let control_window_handle = control_window.clone();
                control_window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = control_window_handle.hide();
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
