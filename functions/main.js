window.Route = (t) => {
    document.querySelectorAll('.nav-item').forEach(e => e.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(e => e.classList.remove('active'));
    const btn = document.querySelector(`.nav-item[onclick="Route('${t}')"]`);
    if(btn) btn.classList.add('active');
    document.getElementById('tab-'+t).classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    if(t === 'dms') Chat.loadDMs();
};

const Background = {
    init: () => {
        const container = document.getElementById('bg-canvas');
        if(!container) return;
        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050508, 0.002);
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        camera.position.z = 5;
        const renderer = new THREE.WebGLRenderer({alpha:true, antialias:true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(renderer.domElement);
        
        const bgGeo = new THREE.BufferGeometry();
        const pos = new Float32Array(3000*3);
        for(let i=0; i<3000*3; i++) pos[i] = (Math.random()-0.5)*40;
        bgGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        const stars = new THREE.Points(bgGeo, new THREE.PointsMaterial({size:0.02, color:0xd600ff}));
        scene.add(stars);
        const geo = new THREE.IcosahedronGeometry(1.2, 1);
        const mat = new THREE.MeshBasicMaterial({color: 0xd600ff, wireframe: true, transparent:true, opacity:0.15});
        const mesh = new THREE.Mesh(geo, mat);
        scene.add(mesh);
        
        const anim = () => {
            requestAnimationFrame(anim);
            stars.rotation.y += 0.0005;
            mesh.rotation.y -= 0.002; mesh.rotation.x += 0.001;
            renderer.render(scene, camera);
        };
        anim();
        window.onresize = () => { camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Background.init();
    if(window.Notifications) window.Notifications.init();
    if(Auth && Auth.init) Auth.init();
});