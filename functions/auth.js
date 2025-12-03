window.Auth = {
    heartbeatInterval: null,

    init: async () => {
        if (pb.authStore.isValid) {
            try {
                const u = await pb.collection('users').getOne(pb.authStore.model.id);
                Auth.loginSuccess(u);
            } catch (err) {
                console.error("Auth invalid:", err);
                pb.authStore.clear();
                Auth.showLogin();
            }
        } else {
            Auth.showLogin();
        }

        pb.authStore.onChange((token, model) => {
            if (!token) window.location.reload();
        });
    },

    loginSuccess: async (userRecord) => {
        console.log("Logged in as:", userRecord.username);
        
        State.user = { uid: userRecord.id, email: userRecord.email };
        State.profile = userRecord;

        Auth.setStatus('online');

        if (Auth.heartbeatInterval) clearInterval(Auth.heartbeatInterval);
        Auth.heartbeatInterval = setInterval(() => {
            pb.collection('users').update(userRecord.id, { lastSeen: new Date() })
                .catch(e => console.warn("Heartbeat fail", e));
        }, 60000);

        window.addEventListener('beforeunload', () => {
            const url = SERVER_URL + '/api/collections/users/records/' + userRecord.id;
            const data = new FormData();
            data.append('status', 'offline');
            navigator.sendBeacon(url, data); 
        });

        document.getElementById('view-auth').classList.add('hidden');
        document.getElementById('view-main').classList.remove('hidden');
        const loader = document.getElementById('loader');
        if(loader) loader.classList.add('hidden');

        if (userRecord.role === 'admin' || userRecord.role === 'super') {
            document.getElementById('nav-admin').classList.remove('hidden');
            if(window.Admin) Admin.load();
        }

        // === ИСПОЛЬЗУЕМ USERNAME И ID ===
        // Если имя пустое, берем username
        const displayName = userRecord.name || userRecord.username || "User";
        document.getElementById('my-nick').value = displayName;
        document.getElementById('my-bio').value = userRecord.bio || '';
        // Используем системный ID
        document.getElementById('my-id-badge').innerText = "ID: " + userRecord.id.substr(0, 5);
        
        const aviEl = document.getElementById('my-avi');
        if (userRecord.avatar) aviEl.src = pb.files.getUrl(userRecord, userRecord.avatar);
        else aviEl.src = `https://robohash.org/${userRecord.id}?set=set4`;

        if (userRecord.banner) {
            const bannerUrl = pb.files.getUrl(userRecord, userRecord.banner);
            document.getElementById('my-banner-prev').style.backgroundImage = `url(${bannerUrl})`;
        }

        const savedTheme = localStorage.getItem('neko_theme');
        if (savedTheme && window.Settings) Settings.applyTheme(JSON.parse(savedTheme));

        if(window.Channels) Channels.load();
        if(!document.querySelector('.tab-pane.active')) Route('channels');
    },

    setStatus: async (status) => {
        if(!State.user) return;
        try {
            await pb.collection('users').update(State.user.uid, {
                status: status,
                lastSeen: new Date()
            });
        } catch(e) { console.log("Set status err", e); }
    },

    showLogin: () => {
        document.getElementById('view-auth').classList.remove('hidden');
        document.getElementById('view-main').classList.add('hidden');
    },

    toggle: () => {
        State.isReg = !State.isReg;
        const nickInput = document.getElementById('auth-nick');
        const btn = document.querySelector('#view-auth .btn-solid');
        const toggleLink = document.querySelector('#view-auth span[onclick="Auth.toggle()"]');
        
        if (State.isReg) {
            nickInput.style.display = 'block';
            nickInput.placeholder = "Username"; // Меняем подсказку
            btn.innerText = 'REGISTER';
            toggleLink.innerText = 'Back to Login';
        } else {
            nickInput.style.display = 'none';
            btn.innerText = 'LOGIN';
            toggleLink.innerText = 'Register';
        }
    },
    
    submit: async () => {
        const email = document.getElementById('auth-email').value.trim();
        const pass = document.getElementById('auth-pass').value.trim();
        const username = document.getElementById('auth-nick').value.trim(); // Это теперь username
              
        if (!email || !pass) return UI.toast("Email & Pass required", "error");
        
        if (State.isReg) {
            if (!username) return UI.toast("Username required", "error");
            if (pass.length < 8) return UI.toast("Password min 8 chars", "error");

            try {
                // === РЕГИСТРАЦИЯ БЕЗ shortId ===
                await pb.collection('users').create({
                    username: username, // Важно: пишем в username
                    email: email,
                    emailVisibility: true,
                    password: pass,
                    passwordConfirm: pass,
                    name: username, // Дублируем в имя
                    role: 'user',
                    status: 'online'
                });

                await pb.collection('users').authWithPassword(email, pass);
                Auth.loginSuccess(pb.authStore.model);
                UI.toast("Welcome!", "success");

            } catch (err) {
                console.error(err);
                // Обработка ошибок
                let msg = "Registration failed";
                if(err.response?.data?.username) msg = "Username taken or invalid";
                if(err.response?.data?.email) msg = "Email invalid or taken";
                UI.toast(msg, "error");
            }

        } else {
            try {
                await pb.collection('users').authWithPassword(email, pass);
                Auth.loginSuccess(pb.authStore.model);
            } catch (err) {
                console.error(err);
                UI.toast("Invalid Credentials", "error");
            }
        }
    },
    
    reset: async () => {
        const email = document.getElementById('auth-email').value;
        if (!email) return UI.toast("Enter Email first", "msg");
        try {
            await pb.collection('users').requestPasswordReset(email);
            UI.toast("Check your email", "success");
        } catch (err) { UI.toast("Error sending reset", "error"); }
    },
    
    logout: async () => {
        await Auth.setStatus('offline');
        pb.authStore.clear();
        location.reload();
    }
};