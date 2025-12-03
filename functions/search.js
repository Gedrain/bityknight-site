const Search = {
    run: () => {
        const q = document.getElementById('search-in').value.toLowerCase().trim();
        const list = document.getElementById('search-results'); 
        list.innerHTML = '';
        
        if(q.length < 1) return;

        const pUsers = db.ref('users').once('value');
        const pChannels = db.ref('channels').once('value');

        Promise.all([pUsers, pChannels]).then(snapshots => {
            const usersSnap = snapshots[0];
            const channelsSnap = snapshots[1];
            let found = false;

            // 1. Users
            usersSnap.forEach(c => {
                const u = c.val();
                if(u.displayName.toLowerCase().includes(q) || u.shortId.toLowerCase().includes(q)) {
                    found = true;
                    
                    let roleHtml = '<span style="color:#777">USER</span>';
                    if (u.role === 'admin') roleHtml = '<span style="color:#ff0055; font-weight:800;">ADMIN</span>';
                    else if (u.role === 'super') roleHtml = '<span style="color:#d600ff; font-weight:800;">ROOT</span>';

                    const bannerStyle = u.banner ? `background-image: url('${u.banner}')` : '';
                    const avatar = u.avatar || 'https://via.placeholder.com/100';
                    const el = document.createElement('div'); 
                    el.className = 'channel-card';
                    el.innerHTML = `
                        <div class="ch-card-banner" style="${bannerStyle}"></div>
                        <div class="ch-card-body">
                            <img src="${avatar}" class="ch-card-avi">
                            <div class="ch-card-info">
                                <div class="ch-name">${u.displayName}</div>
                                <div class="ch-meta">${roleHtml} &bull; <span>#${u.shortId}</span></div>
                            </div>
                        </div>
                    `;
                    el.onclick = () => window.Profile.view(c.key);
                    list.appendChild(el);
                }
            });

            // 2. Channels
            channelsSnap.forEach(c => {
                const ch = c.val();
                const chId = c.key;
                
                if(ch.name.toLowerCase().includes(q) || chId === q) {
                    found = true;
                    const bannerStyle = ch.banner ? `background-image: url('${ch.banner}')` : '';
                    const img = ch.image || 'https://via.placeholder.com/100/000000/ffffff?text=+';
                    const members = ch.membersCount || 1;

                    db.ref(`users_channels/${State.user.uid}/${chId}`).once('value', snap => {
                        const isMember = snap.exists();
                        const actionBtn = isMember 
                            ? `<span style="color:#00ff9d; font-size:0.8rem; font-weight:bold;">JOINED <i class="fas fa-check"></i></span>`
                            : `<button class="btn-solid" style="padding:5px 15px; font-size:0.8rem; width:auto;" onclick="event.stopPropagation(); Search.joinChannel('${chId}', '${ch.pass||''}')">JOIN</button>`;

                        const el = document.createElement('div');
                        el.className = 'channel-card';
                        el.innerHTML = `
                            <div class="ch-card-banner" style="${bannerStyle}"></div>
                            <div class="ch-card-body">
                                <img src="${img}" class="ch-card-avi" style="border-radius:12px;">
                                <div class="ch-card-info">
                                    <div class="ch-name">${ch.name}</div>
                                    <div class="ch-meta"><i class="fas fa-users"></i> ${members} &bull; Channel</div>
                                </div>
                                <div>${actionBtn}</div>
                            </div>
                        `;
                        
                        el.onclick = () => {
                            if(isMember) Channels.openChat(chId);
                        };
                        list.appendChild(el);
                    });
                }
            });

            if(!found) {
                list.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:#555; margin-top:30px;"><i class="fas fa-ghost" style="font-size:2rem;"></i><br>Nothing found</div>`;
            }
        });
    },

    joinChannel: (chid, pass) => {
        if(pass && pass.trim() !== '') {
            const input = prompt("Enter Channel Password:");
            if(input === pass) {
                Channels.join(chid);
            } else {
                UI.toast("Wrong Password", "error");
            }
        } else {
            Channels.join(chid);
        }
    }
};