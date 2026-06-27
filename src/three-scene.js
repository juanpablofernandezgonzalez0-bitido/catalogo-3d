import * as THREE from 'three';

export function initScene(canvas) {
  try {
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 15;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const particlesGeo = new THREE.BufferGeometry();
    const count = 800;
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      sizes[i] = Math.random() * 2 + 0.5;
    }

    particlesGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const particleTex = createParticleTexture();

    const particlesMat = new THREE.PointsMaterial({
      size: 0.08,
      map: particleTex,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xd63384,
    });

    const particles = new THREE.Points(particlesGeo, particlesMat);
    scene.add(particles);

    const shapes = [];
    const shapeColors = [0xd63384, 0xf48fb1, 0xa03060, 0xfce4ec];

    for (let i = 0; i < 6; i++) {
      const geo =
        i % 3 === 0
          ? new THREE.IcosahedronGeometry(0.5, 0)
          : i % 3 === 1
            ? new THREE.OctahedronGeometry(0.4, 0)
            : new THREE.TorusKnotGeometry(0.3, 0.12, 40, 8);

      const mat = new THREE.MeshPhysicalMaterial({
        color: shapeColors[i % shapeColors.length],
        metalness: 0.3,
        roughness: 0.2,
        transparent: true,
        opacity: 0.35,
        wireframe: i % 2 === 0,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 - 5
      );
      mesh.userData = {
        rotSpeed: { x: (Math.random() - 0.5) * 0.01, y: (Math.random() - 0.5) * 0.01 },
        floatSpeed: 0.002 + Math.random() * 0.004,
        floatOffset: Math.random() * Math.PI * 2,
      };
      scene.add(mesh);
      shapes.push(mesh);
    }

    let mouseY = 0;
    let mouseX = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    let time = 0;

    function animate() {
      requestAnimationFrame(animate);
      time += 0.005;

      particles.rotation.y += 0.0003;
      particles.rotation.x = Math.sin(time * 0.1) * 0.05;

      for (const mesh of shapes) {
        mesh.rotation.x += mesh.userData.rotSpeed.x;
        mesh.rotation.y += mesh.userData.rotSpeed.y;
        mesh.position.y += Math.sin(time * mesh.userData.floatSpeed * 20 + mesh.userData.floatOffset) * 0.003;
      }

      camera.position.x += (mouseX * 1.5 - camera.position.x) * 0.02;
      camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.02;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    console.log('Three.js scene initialized successfully');
  } catch (err) {
    console.warn('Three.js scene failed to initialize:', err);
    canvas.style.display = 'none';
  }
}

function createParticleTexture() {
  const c = document.createElement('canvas');
  c.width = 32;
  c.height = 32;
  const ctx = c.getContext('2d');
  const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(c);
}
