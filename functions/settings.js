window.Settings = {
    croppedData: { avi: null, ban: null },
    
    // Пресеты тем (Киберпанк палитра)
    presets: {
        'default': { name: 'Neko Core', accent: '#d600ff', bg: '#05000a', panel: '#0e0e12', text: '#ffffff' },
        'matrix':  { name: 'Matrix',    accent: '#00ff9d', bg: '#001100', panel: '#002200', text: '#e0ffe0' },
        'cyber':   { name: 'Cyberpunk', accent: '#fcee0a', bg: '#0b0b10', panel: '#1a1a24', text: '#ffffff' },
        'red':     { name: 'Arasaka',   accent: '#ff003c', bg: '#000000', panel: '#140000', text: '#ffcccc' },
        'ice':     { name: 'Ice Wall',  accent: '#00e5ff', bg: '#081014', panel: '#0d1b24', text: '#dfffff' },
        'void':    { name: 'Deep Void', accent: '#888888', bg: '#000000', panel: '#111111', text: '#aaaaaa' },
    },

    // Инициализация слушателей (загрузка файлов)
    init: () => {
        const handleUpload = (file, ratio, callback) => {
            if (!file) return;
            if (file.type.toLowerCase().includes('gif')) {
                const reader = new FileReader();
                reader.onload = (e) => callback(e.target.result);
                reader.readAsDataURL(file);
            } else {
                UI.Crop.start(file, ratio, (base64) => callback(base64), () => { 
                    if(document.activeElement) document.activeElement.value = ''; 
                });
            }
        };

        const aviIn = document.getElementById('avi-in');
        if(aviIn) aviIn.onchange = e => {
            handleUpload(e.target.files[0], 1, (base64) => {
                Settings.croppedData.avi = base64;
                const el = document.getElementById('my-avi');
                if(el) el.src = base64;
                aviIn.value = '';
            });
        };

        const banIn = document.getElementById('banner-in');
        if(banIn) banIn.onchange = e => {
            handleUpload(e.target.files[0], 2.5, (base64) => {
                Settings.croppedData.ban = base64;
                const el = document.getElementById('my-banner-prev');
                if(el) el.style.backgroundImage = `url(${base64})`;
                banIn.value = '';
            });
        };

        Settings.renderPresets();
    },

    // Переключение вкладок внутри настроек
    switchTab: (tabName) => {
        // Убираем активный класс у кнопок
        document.querySelectorAll('.settings-nav-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`btn-set-${tabName}`).classList.add('active');

        // Скрываем все секции
        document.querySelectorAll('.settings-section').forEach(s => s.classList.add('hidden'));
        // Показываем нужную
        document.getElementById(`set-sec-${tabName}`).classList.remove('hidden');
    },

    // Рендер кнопок пресетов
    renderPresets: () => {
        const container = document.getElementById('theme-presets');
        if(!container) return;
        container.innerHTML = '';

        Object.keys(Settings.presets).forEach(key => {
            const p = Settings.presets[key];
            const div = document.createElement('div');
            div.className = 'theme-preset-card';
            div.onclick = () => Settings.loadPreset(key);
            
            div.innerHTML = `
                <div class="preset-preview" style="background:${p.bg}; border-color:${p.accent}">
                    <div style="width:100%; height:50%; background:${p.panel}"></div>
                    <div style="width:20px; height:20px; background:${p.accent}; border-radius:50%; position:absolute; bottom:5px; right:5px; box-shadow:0 0 5px ${p.accent}"></div>
                </div>
                <div class="preset-name">${p.name}</div>
            `;
            container.appendChild(div);
        });
    },

    loadPreset: (key) => {
        const p = Settings.presets[key];
        document.getElementById('set-accent').value = p.accent;
        document.getElementById('set-bg').value = p.bg;
        document.getElementById('set-panel').value = p.panel;
        Settings.previewTheme();
        UI.toast(`Theme loaded: ${p.name}`);
    },

    save: () => {
        const n = document.getElementById('my-nick').value.trim();
        const bio = document.getElementById('my-bio').value.trim();
        const prefix = document.getElementById('set-prefix').value.trim();
        const prefixColor = document.getElementById('set-prefix-color').value;

        if(!n) return UI.toast("Name required", "error");
        
        const update = { 
            displayName: n, bio: bio, prefix: prefix, prefixColor: prefixColor,
            theme: {
                accent: document.getElementById('set-accent').value,
                bg: document.getElementById('set-bg').value,
                panel: document.getElementById('set-panel').value
            }
        };

        if(Settings.croppedData.avi) update.avatar = Settings.croppedData.avi;
        if(Settings.croppedData.ban) update.banner = Settings.croppedData.ban;

        db.ref('users/'+State.user.uid).update(update).then(()=>{
            UI.toast("SYSTEM UPDATED","success");
            Settings.croppedData = { avi: null, ban: null };
        });
    },

    previewTheme: () => {
        const theme = {
            accent: document.getElementById('set-accent').value,
            bg: document.getElementById('set-bg').value,
            panel: document.getElementById('set-panel').value
        };
        Settings.applyTheme(theme);
    },

    applyTheme: (t) => {
        if(!t) t = Settings.presets['default'];
        const styleEl = document.getElementById('theme-style');
        if(!styleEl) return;

        const hexToRgba = (hex, alpha) => {
            let r = 0, g = 0, b = 0;
            if (hex.length === 4) {
                r = parseInt(hex[1] + hex[1], 16);
                g = parseInt(hex[2] + hex[2], 16);
                b = parseInt(hex[3] + hex[3], 16);
            } else if (hex.length === 7) {
                r = parseInt(hex.slice(1, 3), 16);
                g = parseInt(hex.slice(3, 5), 16);
                b = parseInt(hex.slice(5, 7), 16);
            }
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        };

        // Мы генерируем CSS переменные, чтобы style.css и style2.css их подхватили
        styleEl.innerHTML = `
            :root { 
                --bg: ${t.bg}; 
                --primary: ${t.accent}; 
                --primary-dim: ${hexToRgba(t.accent, 0.15)};
                --secondary: ${t.accent}; /* Используем акцент как вторичный */
                --panel: ${t.panel};
            }
            
            /* GLOBAL OVERRIDES */
            body, #bg-canvas { background-color: var(--bg) !important; }
            .sidebar { background: var(--panel) !important; border-right: 1px solid var(--primary-dim); }
            
            /* ACCENT COLORS */
            .sidebar-header span, .top-title, .nav-item.active, .nav-item.active i, .btn-text, .ch-name i, .accent-text { 
                color: var(--primary) !important; 
            }
            .nav-item.active { 
                border-left-color: var(--primary);
                background: linear-gradient(90deg, var(--primary-dim), transparent); 
            }
            
            /* BUTTONS & INPUTS */
            .btn-solid { background: var(--primary); color: #000; } /* Text black on bright accent */
            .btn-solid:hover { box-shadow: 0 0 15px var(--primary-dim); }
            
            /* CHAT BUBBLES */
            .msg.mine .bubble { 
                background: var(--primary-dim); 
                border-color: var(--primary); 
                color: #fff;
            }
            
            /* PANELS */
            .panel-box, .channel-card, .bubble, .auth-card { 
                background: var(--panel); 
                border-color: rgba(255,255,255,0.05); 
            }
            .top-bar { background: var(--panel); border-bottom-color: rgba(255,255,255,0.05); }
            
            /* INPUTS */
            input, textarea { background: rgba(0,0,0,0.3) !important; border-color: #333 !important; }
            input:focus, textarea:focus { border-color: var(--primary) !important; }
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => { Settings.init(); });