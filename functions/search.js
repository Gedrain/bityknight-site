const Search = {
    run: async () => {
        const searchInput = document.getElementById('search-in');
        if (!searchInput) return;
        
        const q = searchInput.value.toLowerCase().trim();
        const list = document.getElementById('search-results'); 
        list.innerHTML = '';
        
        if(q.length < 1) return;

        try {
            // 1. Users
            // Исправлено: ищем по name или username (вместо nickname и shortId)
            const users = await pb.collection('users').getList(1, 10, {
                filter: `name ~ "${q}" || username ~ "${q}"`
            });

            users.items.forEach(u => {
                let roleHtml = '<span style="color:#777">USER</span>';
                if (u.role === 'admin') roleHtml = '<span style="color:#ff0055; font-weight:800;">ADMIN</span>';
                else if (u.role === 'super') roleHtml = '<span style="color:#d600ff; font-weight:800;">ROOT</span>';

                const bannerUrl = u.banner ? pb.files.getUrl(u, u.banner) : '';
                const avatar = u.avatar ? pb.files.getUrl(u, u.avatar) : 'https://via.placeholder.com/100';
                
                // Используем name и username
                const displayName = u.name || "No Name";
                const displayId = u.username; 

                const el = document.createElement('div'); 
                el.className = 'channel-card';
                el.innerHTML = `
                    <div class="ch-card-banner" style="${bannerUrl ? `background-image: url('${bannerUrl}')` : ''}"></div>
                    <div class="ch-card-body">
                        <img src="${avatar}" class="ch-card-avi">
                        <div class="ch-card-info">
                            <div class="ch-name">${displayName}</div>
                            <div class="ch-meta">${roleHtml} &bull; <span>@${displayId}</span></div>
                        </div>
                    </div>
                `;
                el.onclick = () => window.Profile.view(u.id);
                list.appendChild(el);
            });

            // 2. Channels
            const channels = await pb.collection('channels').getList(1, 10, {
                filter: `name ~ "${q}"`
            });

            channels.items.forEach(ch => {
                const bannerUrl = ch.banner ? pb.files.getUrl(ch, ch.banner) : '';
                const img = ch.image ? pb.files.getUrl(ch, ch.image) : 'https://via.placeholder.com/100';
                
                // Проверяем, вступил ли уже
                const isMember = ch.members && ch.members.includes(State.user.uid);

                const actionBtn = isMember 
                    ? `<span style="color:#00ff9d; font-size:0.8rem; font-weight:bold;">JOINED <i class="fas fa-check"></i></span>`
                    : `<button class="btn-solid" style="padding:5px 15px; font-size:0.8rem; width:auto;" onclick="event.stopPropagation(); Search.joinChannel('${ch.id}', '${ch.pass||''}')">JOIN</button>`;

                const el = document.createElement('div');
                el.className = 'channel-card';
                el.innerHTML = `
                    <div class="ch-card-banner" style="${bannerUrl ? `background-image: url('${bannerUrl}')` : ''}"></div>
                    <div class="ch-card-body">
                        <img src="${img}" class="ch-card-avi" style="border-radius:12px;">
                        <div class="ch-card-info">
                            <div class="ch-name">${ch.name}</div>
                            <div class="ch-meta"><i class="fas fa-users"></i> ${ch.membersCount} &bull; Channel</div>
                        </div>
                        <div>${actionBtn}</div>
                    </div>
                `;
                // Исправлено: при клике открываем чат
                el.onclick = () => { if(isMember) Channels.openChat(ch.id); };
                list.appendChild(el);
            });

        } catch(e) { console.error(e); }
    },

    joinChannel: (chid, pass) => {
        if(pass && pass.trim() !== '') {
            const input = prompt("Enter Channel Password:");
            if(input === pass) Channels.join(chid);
            else UI.toast("Wrong Password", "error");
        } else {
            Channels.join(chid);
        }
    }
};