const Auth = {
    init: () => {
        auth.onAuthStateChanged(u => {
            if(u) {
                const myStatus = db.ref('users/' + u.uid + '/status'); const myLastSeen = db.ref('users/' + u.uid + '/lastSeen');
                db.ref('.info/connected').on('value', (snap) => { if (snap.val() === true) { myStatus.onDisconnect().set('offline'); myLastSeen.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP); myStatus.set('online'); } });
                db.ref('users/'+u.uid).on('value', s => {
                    if(!s.exists()) return; const v = s.val(); if(v.isBanned) { auth.signOut(); return; }
                    State.user = u; State.profile = v;
                    document.getElementById('view-auth').classList.add('hidden'); document.getElementById('view-main').classList.remove('hidden');
                    if(v.role==='admin'||v.role==='super') document.getElementById('nav-admin').classList.remove('hidden');
                    if(!document.querySelector('.tab-pane.active')) Route('channels');
                    Channels.load(); if(v.role==='admin'||v.role==='super') Admin.load();
                    if(v.themeConfig) { localStorage.setItem('neko_theme_config', JSON.stringify(v.themeConfig)); Settings.config = v.themeConfig; Settings.applyTheme(v.themeConfig); }
                });
            } else { document.getElementById('view-auth').classList.remove('hidden'); }
        });
    },
    setMode: (isReg) => {
        State.isReg = isReg; const container = document.querySelector('.auth-switch-container'); const nickGroup = document.getElementById('group-nick'); const btnText = document.querySelector('.btn-cyber .btn-content'); const tabLogin = document.getElementById('tab-login'); const tabReg = document.getElementById('tab-reg');
        if (isReg) { container.classList.add('reg-mode'); nickGroup.classList.remove('collapsed'); btnText.innerText = "REGISTER_NEKO_ID"; tabLogin.classList.remove('active'); tabReg.classList.add('active'); } 
        else { container.classList.remove('reg-mode'); nickGroup.classList.add('collapsed'); btnText.innerText = "INITIALIZE_SESSION"; tabLogin.classList.add('active'); tabReg.classList.remove('active'); }
    },
    togglePassVisibility: (el) => {
        const input = document.getElementById('auth-pass');
        if (input.type === 'password') { input.type = 'text'; el.classList.replace('fa-eye', 'fa-eye-slash'); el.style.color = 'var(--secondary)'; } 
        else { input.type = 'password'; el.classList.replace('fa-eye-slash', 'fa-eye'); el.style.color = ''; }
    },
    submit: () => {
        const e = document.getElementById('auth-email').value; const p = document.getElementById('auth-pass').value; const n = document.getElementById('auth-nick').value;
        if (!e || !p) return UI.toast("CREDENTIALS MISSING", "error");
        const btn = document.querySelector('.btn-cyber'); const originalText = btn.querySelector('.btn-content').innerText; btn.querySelector('.btn-content').innerText = "PROCESSING...";
        if (State.isReg) {
            if (!n) { btn.querySelector('.btn-content').innerText = originalText; return UI.toast("CODENAME REQUIRED", "error"); }
            auth.createUserWithEmailAndPassword(e, p).then(c => {
                c.user.sendEmailVerification(); const sid = '#' + c.user.uid.substr(0, 5).toUpperCase();
                const defaultTheme = { accent: '#d600ff', bg: '#05000a', panel: '#0e0e12', text: '#ffffff', msgText: '#ffffff', msgSize: '1', radius: '0' };
                db.ref('users/' + c.user.uid).set({ displayName: n, email: e, avatar: `https://robohash.org/${c.user.uid}`, shortId: sid, role: 'user', themeConfig: defaultTheme, createdAt: firebase.database.ServerValue.TIMESTAMP });
            }).catch(err => { UI.alert("ACCESS DENIED", err.message); btn.querySelector('.btn-content').innerText = originalText; });
        } else { auth.signInWithEmailAndPassword(e, p).catch(err => { UI.alert("AUTH FAILED", err.message); btn.querySelector('.btn-content').innerText = originalText; }); }
    },
    reset: () => { const e = document.getElementById('auth-email').value; if (e) auth.sendPasswordResetEmail(e).then(() => UI.toast("RECOVERY LINK SENT", "success")); else UI.toast("ENTER EMAIL FIRST", "info"); },
    logout: () => auth.signOut().then(() => location.reload())
};