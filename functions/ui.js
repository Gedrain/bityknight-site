const UI = {
    toast: (msg, type='info') => {
        const c = document.getElementById('toast-container');
        const e = document.createElement('div'); e.className=`toast ${type}`;
        e.innerHTML = `<i class="fas fa-info-circle"></i> <span>${msg}</span>`;
        c.appendChild(e); setTimeout(()=>{e.style.opacity=0;setTimeout(()=>e.remove(),300)},3000);
    },
    alert: (title, text) => {
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-text').innerText = text;
        document.getElementById('custom-alert').classList.add('open');
    },
    confirm: (title, text, cb) => {
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-text').innerText = text;
        const btn = document.getElementById('btn-confirm-yes');
        const newBtn = btn.cloneNode(true); btn.parentNode.replaceChild(newBtn, btn);
        newBtn.onclick = () => { document.getElementById('custom-confirm').classList.remove('open'); cb(); };
        document.getElementById('custom-confirm').classList.add('open');
    },
    closeConfirm: () => document.getElementById('custom-confirm').classList.remove('open'),
    
    // UPDATED TOGGLE MENU
    toggleMenu: () => {
        document.getElementById('sidebar').classList.toggle('open');
        document.getElementById('sidebar-overlay').classList.toggle('open');
    }
};

// UI Binds
document.getElementById('new-ch-priv').onchange = e => {
    if(e.target.checked) document.getElementById('new-ch-pass').classList.remove('hidden');
    else document.getElementById('new-ch-pass').classList.add('hidden');
};

const Scene = {
    init: () => {
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x05000a, 0.03);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        camera.position.z = 3.5;
        const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        document.body.prepend(renderer.domElement);

        const group = new THREE.Group(); scene.add(group);
        const mat = new THREE.MeshBasicMaterial({color: 0xb026ff, wireframe: true, transparent:true, opacity:0.3});
        group.add(new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), mat));
        const eG = new THREE.ConeGeometry(0.4, 0.9, 4);
        const e1 = new THREE.Mesh(eG, mat); e1.position.set(0.6,0.8,-0.2); e1.rotation.set(-0.2,0,-0.4); group.add(e1);
        const e2 = new THREE.Mesh(eG, mat); e2.position.set(-0.6,0.8,-0.2); e2.rotation.set(-0.2,0,0.4); group.add(e2);

        const pG = new THREE.BufferGeometry();
        const pArr = new Float32Array(3000);
        for(let i=0; i<3000; i++) pArr[i] = (Math.random()-0.5)*15;
        pG.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
        const stars = new THREE.Points(pG, new THREE.PointsMaterial({color:0x00ffff, size:0.03}));
        scene.add(stars);
        const anim = () => {
            requestAnimationFrame(anim);
            group.rotation.y += 0.003; group.rotation.x = Math.sin(Date.now()*0.001)*0.1;
            stars.rotation.y -= 0.0005;
            renderer.render(scene, camera);
        };
        anim();
        window.onresize = () => { camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    }
};