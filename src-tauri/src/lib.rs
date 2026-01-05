use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::{Manager, Emitter};
use core_graphics::event::CGEvent;
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
struct WidgetRect {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Clone, serde::Serialize, serde::Deserialize, Debug)]
struct WidgetConfig {
    id: String,
    w_type: String, // 'clock' or 'todo'
    // Optional props could go here
}

struct AppState {
    rects: Arc<Mutex<Vec<WidgetRect>>>,
    #[allow(dead_code)]
    ignoring: Arc<Mutex<bool>>, 
    widgets: Arc<Mutex<Vec<WidgetConfig>>>,
}

#[tauri::command]
fn get_widgets(state: tauri::State<AppState>) -> Vec<WidgetConfig> {
    state.widgets.lock().unwrap().clone()
}

#[tauri::command]
fn add_widget(app: tauri::AppHandle, state: tauri::State<AppState>, w_type: String) {
    let mut widgets = state.widgets.lock().unwrap();
    let id =  uuid::Uuid::new_v4().to_string();
    widgets.push(WidgetConfig {
        id: id.clone(),
        w_type,
    });
    // Emit event to update frontend
    let _ = app.emit("widgets-update", widgets.clone());
}

#[tauri::command]
fn remove_widget(app: tauri::AppHandle, state: tauri::State<AppState>, id: String) {
    let mut widgets = state.widgets.lock().unwrap();
    widgets.retain(|w| w.id != id);
    let _ = app.emit("widgets-update", widgets.clone());
}

#[tauri::command]
fn update_widget_rects(app_state: tauri::State<AppState>, rects: Vec<WidgetRect>) {
    // Update the shared state with new rects
    let mut state_rects = app_state.rects.lock().unwrap();
    *state_rects = rects;
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let rects = Arc::new(Mutex::new(Vec::new()));
    let ignoring = Arc::new(Mutex::new(false)); // Default to NOT ignoring (interactive initially)

    let rects_clone = rects.clone();
    let ignoring_clone = ignoring.clone();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState { 
            rects: rects,
            ignoring: ignoring,
            widgets: Arc::new(Mutex::new(vec![
                // Default widgets
                WidgetConfig { id: "default-clock".into(), w_type: "ClockWidget".into() },
                WidgetConfig { id: "default-todo".into(), w_type: "TodoWidget".into() }
            ])),
        })
        .invoke_handler(tauri::generate_handler![greet, update_widget_rects, get_widgets, add_widget, remove_widget])
        .setup(move |app| {
            let window = app.get_webview_window("main").unwrap();
            
            // Set Activation Policy to Accessory (hides dock icon)
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            // System Tray Setup
            let quit_i = tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>).unwrap();
            let show_i = tauri::menu::MenuItem::with_id(app, "show_control", "Control Menu", true, None::<&str>).unwrap();
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &quit_i]).unwrap();

            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
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
                        _ => {}
                    }
                })
                .build(app);

            // Setup for Main Window
            #[cfg(desktop)]
            let _ = window.set_always_on_bottom(true);
            let _ = window.maximize();
            let _ = window.set_ignore_cursor_events(true);
            *ignoring_clone.lock().unwrap() = true;

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

            let app_handle = app.handle().clone();
            
            thread::spawn(move || {
                loop {
                    // Get Global Mouse Position
                    // core-graphics approach
                    // HIDSystemState source gives us an event reflecting current state
                    if let Ok(source) = CGEventSource::new(CGEventSourceStateID::HIDSystemState) {
                        if let Ok(event) = CGEvent::new(source) {
                             let point = event.location();
                             // Convert point if needed? CGEvent location is usually in screen coordinates.
                         // Standard macOS screen coords: (0,0) is top-left of main screen usually.
                         
                         let rects = rects_clone.lock().unwrap();
                         let mut is_over_widget = false;
                         
                         for r in rects.iter() {
                             // Simple AABB check
                             // Note: App window might be different size than screen if not maximized correctly
                             // But we maximized it.
                             if point.x >= r.x && point.x <= (r.x + r.width) &&
                                point.y >= r.y && point.y <= (r.y + r.height) {
                                 is_over_widget = true;
                                 break;
                             }
                         }
                         
                         let mut currently_ignoring = ignoring_clone.lock().unwrap();
                         
                         // Logic:
                         // If over widget -> We want interaction -> ignore = false
                         // If NOT over widget -> We want pass-through -> ignore = true
                         
                         let should_ignore = !is_over_widget;
                         
                         if *currently_ignoring != should_ignore {
                             // State change!
                             let w = app_handle.get_webview_window("main");
                             if let Some(win) = w {
                                 let _ = win.set_ignore_cursor_events(should_ignore);
                                 *currently_ignoring = should_ignore;
                                 
                                 // Optional: Debug logging
                                 // println!("State change: ignoring={}", should_ignore);
                             }
                         }
                    } // End event
                    } // End source
                    
                    // Poll rate: 50ms = 20fps check. Good enough for UI.
                    thread::sleep(Duration::from_millis(50));
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
