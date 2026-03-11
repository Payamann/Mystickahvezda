/**
 * Mystická Hvězda - Natal Chart 3D Evolution
 * Powered by Three.js
 */

class Natal3D {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.z = 400;

        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const pointLight = new THREE.PointLight(0xffffff, 1);
        pointLight.position.set(100, 100, 200);
        this.scene.add(pointLight);

        this.planets = new THREE.Group();
        this.scene.add(this.planets);

        this.initZodiacRing();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize());
    }

    initZodiacRing() {
        // Simple 3D Ring representation
        const geometry = new THREE.TorusGeometry(220, 3, 16, 100);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0xd4af37, 
            emissive: 0xd4af37,
            emissiveIntensity: 0.2,
            shininess: 100 
        });
        const ring = new THREE.Mesh(geometry, material);
        this.scene.add(ring);

        // Add 12 segments markers
        for(let i=0; i<12; i++) {
            const angle = (i * 30) * (Math.PI / 180);
            const x = Math.cos(angle) * 220;
            const y = Math.sin(angle) * 220;
            
            const markerGeom = new THREE.BoxGeometry(2, 10, 2);
            const marker = new THREE.Mesh(markerGeom, material);
            marker.position.set(x, y, 0);
            marker.rotation.z = angle;
            this.scene.add(marker);
        }
    }

    updatePlanets(seed) {
        // Clear previous planets
        while(this.planets.children.length > 0) {
            this.planets.remove(this.planets.children[0]);
        }

        const orbitRadii = [0, 45, 75, 105, 135, 170, 200];
        const colors = [0xFFD700, 0xC0C0C0, 0xB0C4DE, 0xFFB6C1, 0xFF4500, 0xE6E6FA, 0x708090];
        const sizes = [25, 12, 10, 11, 10, 18, 16];

        for(let i=0; i<7; i++) {
            const radius = orbitRadii[i];
            const angle = (seed * (i + 1) * 37) % 360 * (Math.PI / 180);
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            const geometry = new THREE.SphereGeometry(sizes[i], 32, 32);
            const material = new THREE.MeshPhongMaterial({ 
                color: colors[i],
                shininess: 50,
                emissive: colors[i],
                emissiveIntensity: 0.1
            });
            
            const planet = new THREE.Mesh(geometry, material);
            planet.position.set(x, y, 0);
            
            // Add orbit line
            if (radius > 0) {
                const orbitGeom = new THREE.RingGeometry(radius - 0.5, radius + 0.5, 64);
                const orbitMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.1, transparent: true, side: THREE.DoubleSide });
                const orbit = new THREE.Mesh(orbitGeom, orbitMat);
                this.planets.add(orbit);
            }

            this.planets.add(planet);
        }
    }

    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.planets.rotation.z += 0.001; // Slow cosmic rotation
        this.renderer.render(this.scene, this.camera);
    }
}

// Global exposure
window.Natal3D = Natal3D;
window.Natal3DInstance = null;
