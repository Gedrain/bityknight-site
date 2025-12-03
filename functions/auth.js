const Auth = {
    init: () => {
        auth.onAuthStateChanged(u => {
            if(u) {
                if(!u.emailVerified) { /* ... */ }

                const myStatus = db.ref('users/' + u.uid + '/status');
                const myLastSeen = db.ref('users/' + u.uid + '/lastSeen');
                
                db.ref('.info/connected').on('value', (snap) => {
                    if (snap.val() === true) {
                        myStatus.onDisconnect().set('offline');
                        myLastSeen.onDisconnect().set(firebase.database.ServerValue.TIMESTAMP);
                        myStatus.set('online');
                    }
                });

                db.ref('users/'+u.uid).on('value', s => {
                    if(!s.exists()) return;
                    const v = s.val();
                    if(v.isBanned) { auth.signOut(); return; }
                    State.user = u; State.profile = v;
                    
                    // Loader hides via animation script in index.html
                    
                    document.getElementById('view-auth').classList.add('hidden');
                    document.getElementById('view-main').classList.remove('hidden');
                    
                    if(v.role==='admin'||v.role==='super') document.getElementById('nav-admin').classList.remove('hidden');
                    
                    if(!document.querySelector('.tab-pane.active')) Route('channels');
                    
                    Channels.load(); 
                    if(v.role==='admin'||v.role==='super') Admin.load();

                    document.getElementById('my-nick').value = v.displayName;
                    document.getElementById('my-bio').value = v.bio || '';
                    document.getElementById('my-avi').src = v.avatar;
                    document.getElementById('my-id-badge').innerText = "ID: " + v.shortId;
                    if(v.banner) document.getElementById('my-banner-prev').style.backgroundImage=`url(${v.banner})`;

                    if(v.prefix) document.getElementById('set-prefix').value = v.prefix;
                    if(v.prefixColor) document.getElementById('set-prefix-color').value = v.prefixColor;

                    if(v.theme) {
                        document.getElementById('set-accent').value = v.theme.accent;
                        document.getElementById('set-bg').value = v.theme.bg;
                        document.getElementById('set-panel').value = v.theme.panel;
                        Settings.applyTheme(v.theme);
                    } else {
                        Settings.applyTheme(null);
                    }
                });
            } else {
                // Keep loader until animation finishes, form will be visible underneath
                document.getElementById('view-auth').classList.remove('hidden');
            }
        });
    },
    toggle: ()=>{State.isReg=!State.isReg;document.getElementById('auth-nick').style.display=State.isReg?'block':'none';},
    
    submit: ()=>{
        const e=document.getElementById('auth-email').value,
              p=document.getElementById('auth-pass').value,
              n=document.getElementById('auth-nick').value;
              
        if(!e||!p)return UI.toast("Error","error");
        
        if(State.isReg){
            if(!n)return UI.toast("Name req","error");
            
            auth.createUserWithEmailAndPassword(e,p).then(c=>{
                c.user.sendEmailVerification();
                const sid='#'+c.user.uid.substr(0,5).toUpperCase();
                
                db.ref('users/'+c.user.uid).set({
                    displayName:n,
                    email:e,
                    avatar:`https://robohash.org/${c.user.uid}`,
                    shortId:sid,
                    role:'user',
                    createdAt: firebase.database.ServerValue.TIMESTAMP
                });
            }).catch(err=>UI.alert("Error",err.message));
        } else {
            auth.signInWithEmailAndPassword(e,p).catch(err=>UI.alert("Error",err.message));
        }
    },
    
    reset: ()=>{const e=document.getElementById('auth-email').value;if(e)auth.sendPasswordResetEmail(e).then(()=>UI.toast("Sent","success"));},
    checkVerified: () => { State.user.reload().then(()=>{ if(State.user.emailVerified) location.reload(); }); },
    resendVerify: () => { State.user.sendEmailVerification(); },
    logout: ()=>auth.signOut().then(()=>location.reload())
};