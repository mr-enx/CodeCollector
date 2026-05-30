import os
import json
import hashlib
import tkinter as tk
from tkinter import ttk, filedialog, messagebox


FAVORITES_FILE = "code_collector_favorites.json"
APP_CONFIG_FILE = "code_collector_app_config.json"


DEFAULT_APP_CONFIG = {
    "ignore_enabled": True,
    "ignore_items": [
        "node_modules",
        ".git",
        ".next",
        "dist",
        "build",
        "__pycache__",
        ".venv",
        "venv",
        "coverage",
        ".idea",
        ".godot",
        ".vscode",
        "*.zip",
        "*.rar"
    ],
    "show_only_enabled": False,
    "show_only_items": [],
    "paths_output_header": "این لیست آدرس تمام فایل های من هست :"
}


def get_folder_id(folder_path: str) -> str:
    normalized = os.path.abspath(folder_path).lower()
    return hashlib.md5(normalized.encode("utf-8")).hexdigest()


class CodeCollectorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Code Collector")
        self.root.geometry("1280x820")
        self.root.minsize(980, 620)
        self.root.configure(bg="#f4f6f8")

        self.folder_path = tk.StringVar()
        self.search_var = tk.StringVar()

        self.files = []
        self.tree_item_to_file = {}

        self.favorites_data = self.load_favorites()
        self.app_config = self.load_app_config()

        self.setup_styles()
        self.create_widgets()
        self.bind_text_shortcuts_globally()

    def setup_styles(self):
        self.default_font = ("Tahoma", 11)
        self.bold_font = ("Tahoma", 11, "bold")
        self.big_font = ("Tahoma", 12)

        style = ttk.Style()
        try:
            style.theme_use("clam")
        except Exception:
            pass

        style.configure(
            "Treeview",
            font=self.default_font,
            rowheight=34,
            background="white",
            fieldbackground="white",
            borderwidth=0
        )
        style.configure(
            "Treeview.Heading",
            font=self.bold_font,
            padding=(10, 8)
        )

        style.configure("TButton", font=self.default_font, padding=(12, 8))
        style.configure("TEntry", padding=(8, 6))
        style.configure("TLabelframe", background="#f4f6f8")
        style.configure("TLabelframe.Label", font=self.bold_font)

    def load_favorites(self):
        if not os.path.exists(FAVORITES_FILE):
            return {}

        try:
            with open(FAVORITES_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def save_favorites(self):
        try:
            with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
                json.dump(self.favorites_data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            messagebox.showerror("خطا", f"خطا در ذخیره ستاره‌ها:\n{e}")

    def load_app_config(self):
        if not os.path.exists(APP_CONFIG_FILE):
            self.save_app_config(DEFAULT_APP_CONFIG.copy())
            return DEFAULT_APP_CONFIG.copy()

        try:
            with open(APP_CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            for key, value in DEFAULT_APP_CONFIG.items():
                if key not in data:
                    data[key] = value

            return data
        except Exception:
            messagebox.showwarning("هشدار", "فایل تنظیمات خراب است. تنظیمات پیش‌فرض بارگذاری شد.")
            self.save_app_config(DEFAULT_APP_CONFIG.copy())
            return DEFAULT_APP_CONFIG.copy()

    def save_app_config(self, config=None):
        try:
            data = config if config is not None else self.app_config
            with open(APP_CONFIG_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        except Exception as e:
            messagebox.showerror("خطا", f"خطا در ذخیره تنظیمات:\n{e}")

    def get_ignore_enabled(self):
        return bool(self.app_config.get("ignore_enabled", True))

    def get_ignore_items(self):
        return [item.strip() for item in self.app_config.get("ignore_items", []) if item.strip()]

    def get_show_only_enabled(self):
        return bool(self.app_config.get("show_only_enabled", False))

    def get_show_only_items(self):
        return [item.strip() for item in self.app_config.get("show_only_items", []) if item.strip()]

    def get_paths_output_header(self):
        return str(self.app_config.get("paths_output_header", "")).strip()

    # ------------------------------------------------------------------
    # Shortcut support for Persian keyboard layout
    # Ctrl + A / C / V / X / Z
    # Works for Entry and Text widgets
    # ------------------------------------------------------------------

    def bind_text_shortcuts_globally(self):
        for widget_class in ("Entry", "Text"):
            self.root.bind_class(widget_class, "<Control-KeyPress>", self.handle_control_shortcut)

            self.root.bind_class(widget_class, "<Control-a>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-A>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-c>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-C>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-v>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-V>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-x>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-X>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-z>", self.handle_control_shortcut)
            self.root.bind_class(widget_class, "<Control-Z>", self.handle_control_shortcut)

    def detect_ctrl_shortcut_key(self, event):
        keysym = str(event.keysym).lower()

        # English and Persian characters on the same physical keys
        persian_map = {
            "a": ["a", "ش"],
            "c": ["c", "ز"],
            "v": ["v", "ر"],
            "x": ["x", "ط"],
            "z": ["z", "ظ"],
        }

        for action, values in persian_map.items():
            if keysym in values:
                return action

        # Windows virtual key codes
        win_keycodes = {
            65: "a",
            67: "c",
            86: "v",
            88: "x",
            90: "z",
        }

        if event.keycode in win_keycodes:
            return win_keycodes[event.keycode]

        # Common Linux/X11 physical keycodes
        linux_keycodes = {
            38: "a",
            54: "c",
            55: "v",
            53: "x",
            52: "z",
        }

        if event.keycode in linux_keycodes:
            return linux_keycodes[event.keycode]

        return None

    def handle_control_shortcut(self, event):
        key = self.detect_ctrl_shortcut_key(event)

        if not key:
            return None

        widget = event.widget

        if key == "a":
            self.widget_select_all(widget)
            return "break"

        if key == "c":
            self.widget_copy(widget)
            return "break"

        if key == "v":
            self.widget_paste(widget)
            return "break"

        if key == "x":
            self.widget_cut(widget)
            return "break"

        if key == "z":
            self.widget_undo(widget)
            return "break"

        return None

    def is_text_widget(self, widget):
        return isinstance(widget, tk.Text)

    def is_entry_widget(self, widget):
        return isinstance(widget, tk.Entry) or widget.winfo_class() in ("Entry", "TEntry")

    def widget_select_all(self, widget):
        try:
            if self.is_text_widget(widget):
                widget.tag_add("sel", "1.0", "end-1c")
                widget.mark_set("insert", "end-1c")
                widget.see("insert")
            else:
                widget.select_range(0, tk.END)
                widget.icursor(tk.END)
        except Exception:
            pass

    def widget_copy(self, widget):
        try:
            if self.is_text_widget(widget):
                try:
                    text = widget.get("sel.first", "sel.last")
                except Exception:
                    return
            else:
                if not widget.selection_present():
                    return
                text = widget.selection_get()

            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self.root.update()
        except Exception:
            pass

    def widget_paste(self, widget):
        try:
            text = self.root.clipboard_get()

            if self.is_text_widget(widget):
                try:
                    widget.delete("sel.first", "sel.last")
                except Exception:
                    pass
                widget.insert("insert", text)
            else:
                if widget.selection_present():
                    start = widget.index("sel.first")
                    end = widget.index("sel.last")
                    widget.delete(start, end)
                    widget.insert(start, text)
                else:
                    widget.insert(widget.index(tk.INSERT), text)
        except Exception:
            pass

    def widget_cut(self, widget):
        try:
            if self.is_text_widget(widget):
                try:
                    text = widget.get("sel.first", "sel.last")
                except Exception:
                    return

                self.root.clipboard_clear()
                self.root.clipboard_append(text)
                self.root.update()
                widget.delete("sel.first", "sel.last")
            else:
                if not widget.selection_present():
                    return

                text = widget.selection_get()
                self.root.clipboard_clear()
                self.root.clipboard_append(text)
                self.root.update()

                start = widget.index("sel.first")
                end = widget.index("sel.last")
                widget.delete(start, end)
        except Exception:
            pass

    def widget_undo(self, widget):
        try:
            widget.event_generate("<<Undo>>")
        except Exception:
            pass

    def create_widgets(self):
        self.create_top_bar()
        self.create_search_bar()
        self.create_actions_bar()
        self.create_main_area()
        self.create_status_bar()

    def create_top_bar(self):
        top_frame = tk.Frame(self.root, bg="#f4f6f8")
        top_frame.pack(fill="x", padx=14, pady=(14, 8))

        tk.Label(top_frame, text="فولدر پروژه:", font=self.bold_font, bg="#f4f6f8").pack(side="left", padx=(0, 8))

        folder_entry = tk.Entry(
            top_frame,
            textvariable=self.folder_path,
            font=self.big_font,
            relief="solid",
            bd=1
        )
        folder_entry.pack(side="left", fill="x", expand=True, padx=5, ipady=6)

        ttk.Button(top_frame, text="انتخاب فولدر", command=self.select_folder).pack(side="left", padx=8)
        ttk.Button(top_frame, text="تنظیمات", command=self.open_settings_window).pack(side="left", padx=8)

    def create_search_bar(self):
        search_frame = tk.Frame(self.root, bg="#f4f6f8")
        search_frame.pack(fill="x", padx=14, pady=(0, 8))

        tk.Label(search_frame, text="جستجو:", font=self.bold_font, bg="#f4f6f8").pack(side="left", padx=(0, 8))

        search_entry = tk.Entry(
            search_frame,
            textvariable=self.search_var,
            font=self.big_font,
            relief="solid",
            bd=1
        )
        search_entry.pack(side="left", fill="x", expand=True, padx=5, ipady=6)
        search_entry.bind("<KeyRelease>", lambda e: self.render_tree())

    def create_actions_bar(self):
        actions_frame = tk.Frame(self.root, bg="#f4f6f8")
        actions_frame.pack(fill="x", padx=14, pady=(0, 8))

        ttk.Button(actions_frame, text="انتخاب همه", command=self.select_all).pack(side="left", padx=6)
        ttk.Button(actions_frame, text="لغو انتخاب همه", command=self.deselect_all).pack(side="left", padx=6)
        ttk.Button(actions_frame, text="اسکن دوباره", command=self.scan_folder).pack(side="left", padx=6)

        copy_code_btn = tk.Button(
            actions_frame,
            text="خروجی گرفتن کد در کلیپ‌بورد",
            command=self.copy_selected_to_clipboard,
            bg="#2e7d32",
            fg="white",
            activebackground="#256628",
            activeforeground="white",
            font=self.bold_font,
            relief="flat",
            padx=18,
            pady=10,
            cursor="hand2"
        )
        copy_code_btn.pack(side="right", padx=6)

        copy_paths_btn = tk.Button(
            actions_frame,
            text="خروجی فقط آدرس فایل‌ها",
            command=self.copy_selected_paths_to_clipboard,
            bg="#1565c0",
            fg="white",
            activebackground="#0d47a1",
            activeforeground="white",
            font=self.bold_font,
            relief="flat",
            padx=18,
            pady=10,
            cursor="hand2"
        )
        copy_paths_btn.pack(side="right", padx=6)

    def create_main_area(self):
        main_pane = tk.PanedWindow(self.root, orient=tk.HORIZONTAL, sashwidth=8, bg="#d0d7de", bd=0)
        main_pane.pack(fill="both", expand=True, padx=14, pady=10)

        left_frame = tk.Frame(main_pane, bg="#f4f6f8")
        main_pane.add(left_frame, minsize=320, width=400)

        favorites_frame = ttk.LabelFrame(left_frame, text="فایل‌های ستاره‌دار")
        favorites_frame.pack(fill="both", expand=True, pady=(0, 10))

        favorites_list_frame = tk.Frame(favorites_frame, bg="white")
        favorites_list_frame.pack(fill="both", expand=True, padx=8, pady=8)

        self.favorites_listbox = tk.Listbox(
            favorites_list_frame,
            font=self.big_font,
            activestyle="none",
            selectbackground="#dbeafe",
            selectforeground="#111",
            relief="flat",
            bd=0
        )
        self.favorites_listbox.pack(side="left", fill="both", expand=True)

        favorites_scroll = tk.Scrollbar(favorites_list_frame, orient="vertical", command=self.favorites_listbox.yview)
        favorites_scroll.pack(side="right", fill="y")
        self.favorites_listbox.config(yscrollcommand=favorites_scroll.set)
        self.favorites_listbox.bind("<Double-Button-1>", self.toggle_selected_from_favorites_list)
        self.bind_mousewheel(self.favorites_listbox)

        tk.Label(
            favorites_frame,
            text="دوبار کلیک: انتخاب / لغو انتخاب فایل",
            fg="#555",
            bg="#f4f6f8",
            font=("Tahoma", 10)
        ).pack(fill="x", padx=8, pady=(0, 8))

        selected_frame = ttk.LabelFrame(left_frame, text="فایل‌های انتخاب‌شده")
        selected_frame.pack(fill="both", expand=True)

        selected_list_frame = tk.Frame(selected_frame, bg="white")
        selected_list_frame.pack(fill="both", expand=True, padx=8, pady=8)

        self.selected_listbox = tk.Listbox(
            selected_list_frame,
            font=self.big_font,
            activestyle="none",
            selectbackground="#dbeafe",
            selectforeground="#111",
            relief="flat",
            bd=0
        )
        self.selected_listbox.pack(side="left", fill="both", expand=True)

        selected_scroll = tk.Scrollbar(selected_list_frame, orient="vertical", command=self.selected_listbox.yview)
        selected_scroll.pack(side="right", fill="y")
        self.selected_listbox.config(yscrollcommand=selected_scroll.set)
        self.selected_listbox.bind("<Double-Button-1>", self.unselect_from_selected_list)
        self.bind_mousewheel(self.selected_listbox)

        tk.Label(
            selected_frame,
            text="دوبار کلیک: حذف از انتخاب",
            fg="#555",
            bg="#f4f6f8",
            font=("Tahoma", 10)
        ).pack(fill="x", padx=8, pady=(0, 8))

        right_frame = tk.Frame(main_pane, bg="#f4f6f8")
        main_pane.add(right_frame, minsize=580)

        tk.Label(
            right_frame,
            text="لیست پوشه‌بندی‌شده فایل‌ها",
            font=("Tahoma", 12, "bold"),
            anchor="w",
            bg="#f4f6f8"
        ).pack(fill="x", pady=(0, 8))

        tree_frame = tk.Frame(right_frame, bg="white", relief="solid", bd=1)
        tree_frame.pack(fill="both", expand=True)

        self.tree = ttk.Treeview(
            tree_frame,
            columns=("selected", "favorite"),
            show="tree headings",
            selectmode="browse"
        )

        self.tree.heading("#0", text="نام فایل / پوشه")
        self.tree.heading("selected", text="انتخاب")
        self.tree.heading("favorite", text="ستاره")

        self.tree.column("#0", width=700, minwidth=300, stretch=True)
        self.tree.column("selected", width=120, minwidth=100, anchor="center", stretch=False)
        self.tree.column("favorite", width=110, minwidth=90, anchor="center", stretch=False)

        self.tree.pack(side="left", fill="both", expand=True)

        tree_scroll = tk.Scrollbar(tree_frame, orient="vertical", command=self.tree.yview)
        tree_scroll.pack(side="right", fill="y")
        self.tree.configure(yscrollcommand=tree_scroll.set)

        self.tree.bind("<Button-1>", self.on_tree_click)
        self.tree.bind("<Double-Button-1>", self.on_tree_double_click)
        self.tree.bind("<space>", self.on_tree_space)

        self.bind_mousewheel(self.tree)

    def create_status_bar(self):
        bottom_frame = tk.Frame(self.root, bg="#e9eef3", height=34)
        bottom_frame.pack(fill="x", padx=0, pady=(0, 0))

        self.status_label = tk.Label(
            bottom_frame,
            text="آماده",
            anchor="w",
            bg="#e9eef3",
            font=("Tahoma", 10),
            padx=12,
            pady=8
        )
        self.status_label.pack(side="left", fill="x", expand=True)

    def bind_mousewheel(self, widget):
        widget.bind("<Enter>", lambda e: widget.focus_set())
        widget.bind("<MouseWheel>", lambda e: self.on_mousewheel(e, widget))
        widget.bind("<Button-4>", lambda e: self.on_linux_scroll_up(e, widget))
        widget.bind("<Button-5>", lambda e: self.on_linux_scroll_down(e, widget))

    def on_mousewheel(self, event, widget):
        widget.yview_scroll(int(-1 * (event.delta / 120)), "units")
        return "break"

    def on_linux_scroll_up(self, event, widget):
        widget.yview_scroll(-1, "units")
        return "break"

    def on_linux_scroll_down(self, event, widget):
        widget.yview_scroll(1, "units")
        return "break"

    def get_current_folder_id(self):
        folder = self.folder_path.get().strip()
        if not folder:
            return None
        return get_folder_id(folder)

    def get_current_folder_favorites(self):
        folder_id = self.get_current_folder_id()
        if not folder_id:
            return set()
        return set(self.favorites_data.get(folder_id, []))

    def save_current_folder_favorites(self):
        folder_id = self.get_current_folder_id()
        if not folder_id:
            return

        favorites = sorted([item["relative_path"] for item in self.files if item["favorite"]])
        self.favorites_data[folder_id] = favorites
        self.save_favorites()

    def parse_multiline_items(self, text):
        items = []
        for line in text.splitlines():
            value = line.strip()
            if value:
                items.append(value)
        return items

    def normalize_rule(self, value):
        return value.strip().replace("\\", "/").lower()

    def match_rule(self, relative_path, rule):
        relative_path = relative_path.replace("\\", "/").lower()
        rule = self.normalize_rule(rule)

        if not rule:
            return False

        parts = relative_path.split("/")
        filename = parts[-1]
        name_without_ext, ext = os.path.splitext(filename)

        if "/" in rule:
            return relative_path == rule or relative_path.startswith(rule + "/")

        if rule.startswith("*."):
            return ext == rule[1:]

        if rule.startswith("."):
            return ext == rule or filename == rule

        if "." not in rule:
            if ext == "." + rule:
                return True

        if filename == rule:
            return True

        if rule in parts[:-1]:
            return True

        if name_without_ext == rule:
            return True

        return False

    def should_include_file(self, relative_path):
        relative_path = relative_path.replace("\\", "/")

        ignore_enabled = self.get_ignore_enabled()
        ignore_items = self.get_ignore_items()
        show_only_enabled = self.get_show_only_enabled()
        show_only_items = self.get_show_only_items()

        if show_only_enabled:
            if not any(self.match_rule(relative_path, rule) for rule in show_only_items):
                return False

        if ignore_enabled:
            if any(self.match_rule(relative_path, rule) for rule in ignore_items):
                return False

        return True

    def should_enter_directory(self, relative_dir):
        relative_dir = relative_dir.replace("\\", "/")

        if self.get_ignore_enabled():
            if any(self.match_rule(relative_dir, rule) for rule in self.get_ignore_items()):
                return False

        return True

    def get_visible_files(self):
        query = self.search_var.get().strip().lower()
        if not query:
            return list(self.files)

        return [item for item in self.files if query in item["relative_path"].lower()]

    def find_file_by_relative_path(self, relative_path):
        for item in self.files:
            if item["relative_path"] == relative_path:
                return item
        return None

    def select_folder(self):
        folder = filedialog.askdirectory(title="انتخاب فولدر پروژه")
        if folder:
            self.folder_path.set(folder)
            self.scan_folder()

    def scan_folder(self):
        folder = self.folder_path.get().strip()

        if not folder or not os.path.isdir(folder):
            messagebox.showwarning("خطا", "لطفاً یک فولدر معتبر انتخاب کنید.")
            return

        self.files = []
        self.tree_item_to_file = {}

        favorites = self.get_current_folder_favorites()

        for root_dir, dirs, filenames in os.walk(folder):
            dirs[:] = [
                d for d in sorted(dirs, key=lambda x: x.lower())
                if self.should_enter_directory(
                    os.path.relpath(os.path.join(root_dir, d), folder).replace("\\", "/")
                )
            ]

            for filename in sorted(filenames, key=lambda x: x.lower()):
                full_path = os.path.join(root_dir, filename)
                relative_path = os.path.relpath(full_path, folder).replace("\\", "/")

                if not self.should_include_file(relative_path):
                    continue

                self.files.append({
                    "full_path": full_path,
                    "relative_path": relative_path,
                    "name": filename,
                    "selected": False,
                    "favorite": relative_path in favorites
                })

        self.files.sort(key=lambda x: x["relative_path"].lower())

        self.render_tree()
        self.update_left_lists()
        self.status_label.config(text=f"{len(self.files)} فایل پیدا شد.")

    def render_tree(self):
        if not hasattr(self, "tree"):
            return

        self.tree.delete(*self.tree.get_children())
        self.tree_item_to_file = {}

        visible_files = self.get_visible_files()
        folder_nodes = {}

        def get_or_create_folder(folder_path):
            if folder_path in folder_nodes:
                return folder_nodes[folder_path]

            if "/" not in folder_path:
                parent_path = ""
                folder_name = folder_path
            else:
                parent_path, folder_name = folder_path.rsplit("/", 1)

            parent_id = "" if not parent_path else get_or_create_folder(parent_path)

            node_id = self.tree.insert(
                parent_id,
                "end",
                text=f"📁 {folder_name}",
                values=("", ""),
                open=True
            )
            folder_nodes[folder_path] = node_id
            return node_id

        for item in visible_files:
            relative_path = item["relative_path"]
            parts = relative_path.split("/")

            if len(parts) > 1:
                folder_path = "/".join(parts[:-1])
                parent_id = get_or_create_folder(folder_path)
            else:
                parent_id = ""

            selected_icon = "☑" if item["selected"] else "☐"
            favorite_icon = "★" if item["favorite"] else "☆"

            file_id = self.tree.insert(
                parent_id,
                "end",
                text=f"📄 {item['name']}",
                values=(selected_icon, favorite_icon),
                open=True
            )

            self.tree_item_to_file[file_id] = item

        self.update_status_counts()

    def update_tree_item(self, tree_id, item):
        if not tree_id:
            return
        selected_icon = "☑" if item["selected"] else "☐"
        favorite_icon = "★" if item["favorite"] else "☆"
        try:
            self.tree.item(tree_id, values=(selected_icon, favorite_icon))
        except Exception:
            pass

    def refresh_tree_values(self):
        for tree_id, item in self.tree_item_to_file.items():
            self.update_tree_item(tree_id, item)

    def select_all(self):
        for item in self.get_visible_files():
            item["selected"] = True
        self.refresh_tree_values()
        self.update_left_lists()
        self.update_status_counts()

    def deselect_all(self):
        for item in self.get_visible_files():
            item["selected"] = False
        self.refresh_tree_values()
        self.update_left_lists()
        self.update_status_counts()

    def toggle_file_selected(self, item):
        item["selected"] = not item["selected"]
        self.update_left_lists()
        self.update_status_counts()

    def toggle_file_favorite(self, item):
        item["favorite"] = not item["favorite"]
        self.save_current_folder_favorites()
        self.update_left_lists()
        self.update_status_counts()

    def on_tree_click(self, event):
        region = self.tree.identify("region", event.x, event.y)
        if region != "cell":
            return

        tree_id = self.tree.identify_row(event.y)
        column = self.tree.identify_column(event.x)

        if not tree_id or tree_id not in self.tree_item_to_file:
            return

        item = self.tree_item_to_file[tree_id]

        if column == "#1":
            self.toggle_file_selected(item)
            self.update_tree_item(tree_id, item)
            return "break"

        if column == "#2":
            self.toggle_file_favorite(item)
            self.update_tree_item(tree_id, item)
            return "break"

    def on_tree_double_click(self, event):
        tree_id = self.tree.identify_row(event.y)
        if not tree_id or tree_id not in self.tree_item_to_file:
            return
        item = self.tree_item_to_file[tree_id]
        self.toggle_file_selected(item)
        self.update_tree_item(tree_id, item)
        return "break"

    def on_tree_space(self, event):
        selected = self.tree.selection()
        if not selected:
            return "break"

        tree_id = selected[0]
        if tree_id not in self.tree_item_to_file:
            return "break"

        item = self.tree_item_to_file[tree_id]
        self.toggle_file_selected(item)
        self.update_tree_item(tree_id, item)
        return "break"

    def update_left_lists(self):
        if not hasattr(self, "favorites_listbox") or not hasattr(self, "selected_listbox"):
            return

        self.favorites_listbox.delete(0, tk.END)
        self.selected_listbox.delete(0, tk.END)

        favorites = [item for item in self.files if item["favorite"]]
        selected = [item for item in self.files if item["selected"]]

        favorites.sort(key=lambda x: x["relative_path"].lower())
        selected.sort(key=lambda x: x["relative_path"].lower())

        for item in favorites:
            mark = "☑ " if item["selected"] else "☐ "
            self.favorites_listbox.insert(tk.END, mark + item["relative_path"])

        for item in selected:
            fav = "★ " if item["favorite"] else ""
            self.selected_listbox.insert(tk.END, fav + item["relative_path"])

    def toggle_selected_from_favorites_list(self, event=None):
        selection = self.favorites_listbox.curselection()
        if not selection:
            return

        index = selection[0]
        favorites = [item for item in self.files if item["favorite"]]
        favorites.sort(key=lambda x: x["relative_path"].lower())

        if index >= len(favorites):
            return

        item = favorites[index]
        item["selected"] = not item["selected"]

        self.render_tree()
        self.update_left_lists()
        self.update_status_counts()

    def unselect_from_selected_list(self, event=None):
        selection = self.selected_listbox.curselection()
        if not selection:
            return

        index = selection[0]
        selected = [item for item in self.files if item["selected"]]
        selected.sort(key=lambda x: x["relative_path"].lower())

        if index >= len(selected):
            return

        item = selected[index]
        item["selected"] = False

        self.render_tree()
        self.update_left_lists()
        self.update_status_counts()

    def read_file_content(self, path):
        encodings = ["utf-8", "utf-8-sig", "cp1256", "latin-1"]

        for enc in encodings:
            try:
                with open(path, "r", encoding=enc) as f:
                    return f.read()
            except UnicodeDecodeError:
                continue
            except Exception as e:
                return f"[خطا در خواندن فایل: {e}]"

        return "[خطا: encoding فایل قابل تشخیص نیست]"

    def copy_selected_to_clipboard(self):
        selected_files = [item for item in self.files if item["selected"]]

        if not selected_files:
            messagebox.showwarning("هشدار", "هیچ فایلی انتخاب نشده است.")
            return

        selected_files.sort(key=lambda x: x["relative_path"].lower())
        output_parts = []

        for item in selected_files:
            content = self.read_file_content(item["full_path"])
            output_parts.append(
                "============================================================\n"
                f"FILE: {item['relative_path']}\n"
                "============================================================\n"
                f"{content}\n"
            )

        final_text = "\n".join(output_parts)

        self.root.clipboard_clear()
        self.root.clipboard_append(final_text)
        self.root.update()

        self.status_label.config(text=f"کد {len(selected_files)} فایل در کلیپ‌بورد کپی شد.")
        messagebox.showinfo("انجام شد", f"کد {len(selected_files)} فایل در کلیپ‌بورد کپی شد.")

    def copy_selected_paths_to_clipboard(self):
        selected_files = [item for item in self.files if item["selected"]]

        if not selected_files:
            messagebox.showwarning("هشدار", "هیچ فایلی انتخاب نشده است.")
            return

        selected_files.sort(key=lambda x: x["relative_path"].lower())

        paths_text = "\n".join(item["relative_path"] for item in selected_files)
        header = self.get_paths_output_header()

        if header:
            final_text = f"{header}\n{paths_text}"
        else:
            final_text = paths_text

        self.root.clipboard_clear()
        self.root.clipboard_append(final_text)
        self.root.update()

        self.status_label.config(text=f"آدرس {len(selected_files)} فایل در کلیپ‌بورد کپی شد.")
        messagebox.showinfo("انجام شد", f"آدرس {len(selected_files)} فایل در کلیپ‌بورد کپی شد.")

    def update_status_counts(self):
        total = len(self.files)
        visible = len(self.get_visible_files())
        selected = len([item for item in self.files if item["selected"]])
        favorites = len([item for item in self.files if item["favorite"]])

        query = self.search_var.get().strip()

        if query:
            text = f"کل: {total} | نمایش فعلی: {visible} | انتخاب‌شده: {selected} | ستاره‌دار: {favorites}"
        else:
            text = f"کل: {total} | انتخاب‌شده: {selected} | ستاره‌دار: {favorites}"

        if hasattr(self, "status_label"):
            self.status_label.config(text=text)

    def open_settings_window(self):
        win = tk.Toplevel(self.root)
        win.title("تنظیمات")
        win.geometry("900x680")
        win.minsize(780, 600)
        win.configure(bg="#f4f6f8")
        win.transient(self.root)
        win.grab_set()

        container = tk.Frame(win, bg="#f4f6f8")
        container.pack(fill="both", expand=True, padx=16, pady=16)

        ignore_enabled_var = tk.BooleanVar(value=self.get_ignore_enabled())
        show_only_enabled_var = tk.BooleanVar(value=self.get_show_only_enabled())
        paths_header_var = tk.StringVar(value=self.get_paths_output_header())

        middle_frame = tk.Frame(container, bg="#f4f6f8")
        middle_frame.pack(fill="both", expand=True)
        middle_frame.grid_columnconfigure(0, weight=1)
        middle_frame.grid_columnconfigure(1, weight=1)
        middle_frame.grid_rowconfigure(0, weight=1)

        ignore_frame = ttk.LabelFrame(middle_frame, text="فایل یا فولدرهایی که باید نادیده گرفته شوند (Ignore)")
        ignore_frame.grid(row=0, column=0, sticky="nsew", padx=(0, 8))

        tk.Checkbutton(
            ignore_frame,
            text="فعال باشد",
            variable=ignore_enabled_var,
            bg="#f4f6f8",
            font=self.default_font
        ).pack(anchor="w", padx=10, pady=(10, 6))

        ignore_text = tk.Text(ignore_frame, font=self.big_font, relief="solid", bd=1, undo=True)
        ignore_text.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        ignore_text.insert("1.0", "\n".join(self.get_ignore_items()))

        show_frame = ttk.LabelFrame(middle_frame, text="فقط این فایل‌ها یا فولدرها نمایش داده شوند (Show Only)")
        show_frame.grid(row=0, column=1, sticky="nsew", padx=(8, 0))

        tk.Checkbutton(
            show_frame,
            text="فعال باشد",
            variable=show_only_enabled_var,
            bg="#f4f6f8",
            font=self.default_font
        ).pack(anchor="w", padx=10, pady=(10, 6))

        show_text = tk.Text(show_frame, font=self.big_font, relief="solid", bd=1, undo=True)
        show_text.pack(fill="both", expand=True, padx=10, pady=(0, 10))
        show_text.insert("1.0", "\n".join(self.get_show_only_items()))

        paths_header_frame = ttk.LabelFrame(container, text="متن بالای خروجی فقط آدرس فایل‌ها")
        paths_header_frame.pack(fill="x", pady=(12, 0))

        tk.Label(
            paths_header_frame,
            text="اگر خالی باشد، هیچ متنی بالای لیست آدرس‌ها اضافه نمی‌شود.",
            bg="#f4f6f8",
            fg="#555",
            font=("Tahoma", 10)
        ).pack(anchor="w", padx=10, pady=(10, 4))

        paths_header_entry = tk.Entry(
            paths_header_frame,
            textvariable=paths_header_var,
            font=self.big_font,
            relief="solid",
            bd=1
        )
        paths_header_entry.pack(fill="x", padx=10, pady=(0, 12), ipady=6)

        bottom = tk.Frame(container, bg="#f4f6f8")
        bottom.pack(fill="x", pady=(10, 0))

        def save_and_close():
            self.app_config["ignore_enabled"] = ignore_enabled_var.get()
            self.app_config["ignore_items"] = self.parse_multiline_items(ignore_text.get("1.0", "end-1c"))
            self.app_config["show_only_enabled"] = show_only_enabled_var.get()
            self.app_config["show_only_items"] = self.parse_multiline_items(show_text.get("1.0", "end-1c"))
            self.app_config["paths_output_header"] = paths_header_var.get().strip()

            self.save_app_config()
 
            if self.folder_path.get().strip(): 
                self.scan_folder()

            win.destroy()

        ttk.Button(bottom, text="ذخیره و بستن", command=save_and_close).pack(side="right", padx=6)


if __name__ == "__main__":
    root = tk.Tk()
    app = CodeCollectorApp(root)
    root.mainloop()
