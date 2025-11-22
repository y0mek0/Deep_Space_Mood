// Настройка сцены Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg') });

renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(30);

// Переменные для хранения объектов
let stars, nebula;
let currentStyle = {};

// --- Инициализация и цикл анимации ---

function init() {
    // Дефолтный стиль при запуске
    const defaultStyle = {
        palette: ["#0d1b2a", "#1b263b", "#415a77"],
        nebula: { intensity: 0.5, movement: 0.05, detail: 0.3 },
        stars: { count: 300, twinkleSpeed: 0.1 },
        effects: { clickFlash: true, mouseDistortion: true, colorShift: false },
        camera: { rotationSpeed: 0.0, zoomSpeed: 1.0 }
    };
    applyCosmicStyle(defaultStyle);
    animate();
}

function animate() {
    requestAnimationFrame(animate);

    if (stars) {
        stars.material.uniforms.time.value += (currentStyle.stars.twinkleSpeed || 0.1) * 0.1;
    }

    if (nebula) {
        nebula.material.uniforms.time.value += (currentStyle.nebula.movement || 0.05) * 0.1;
    }

    renderer.render(scene, camera);
}

// --- Генерация космических объектов ---

function createStars(params) {
    if (stars) scene.remove(stars);

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    for (let i = 0; i < params.count; i++) {
        positions.push((Math.random() - 0.5) * 600, (Math.random() - 0.5) * 600, (Math.random() - 0.5) * 600);
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 1.0 },
            color: { value: new THREE.Color(params.palette[2] || "#ffffff") }
        },
        vertexShader: `
            uniform float time;
            varying float vOpacity;
            void main() {
                vOpacity = sin(position.x * 10.0 + time) * 0.5 + 0.5;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 1.5;
            }
        `,
        fragmentShader: `
            uniform vec3 color;
            varying float vOpacity;
            void main() {
                gl_FragColor = vec4(color, vOpacity);
            }
        `,
        transparent: true
    });

    stars = new THREE.Points(geometry, material);
    scene.add(stars);
}

function createNebula(params) {
    if (nebula) scene.remove(nebula);

    const geometry = new THREE.SphereGeometry(250, 64, 64);
    const material = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 1.0 },
            intensity: { value: params.intensity },
            detail: { value: params.detail },
            palette: { value: params.palette.map(c => new THREE.Color(c)) }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform float time;
            uniform float intensity;
            uniform float detail;
            uniform vec3 palette[3];
            
            vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
            vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
            float snoise(vec2 v) {
                const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
                vec2 i  = floor(v + dot(v, C.yy) );
                vec2 x0 = v -   i + dot(i, C.xx);
                vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
                vec4 x12 = x0.xyxy + C.xxzz;
                x12.xy -= i1;
                i = mod289(i);
                vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
                vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
                m = m*m; m = m*m;
                vec3 x = 2.0 * fract(p * C.www) - 1.0;
                vec3 h = abs(x) - 0.5;
                vec3 ox = floor(x + 0.5);
                vec3 a0 = x - ox;
                m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
                vec3 g;
                g.x  = a0.x  * x0.x  + h.x  * x0.y;
                g.yz = a0.yz * x12.xz + h.yz * x12.yw;
                return 130.0 * dot(m, g);
            }

            void main() {
                vec2 scrollingUv = vec2(vUv.x + time * 0.1, vUv.y);
                float n = snoise(scrollingUv * detail * 5.0);

                n = (n + 1.0) / 2.0;
                vec3 color = mix(palette[0], palette[1], smoothstep(0.4, 0.6, n));
                color = mix(color, palette[2], smoothstep(0.7, 0.9, n));
                gl_FragColor = vec4(color * intensity, 1.0);
            }
        `,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide
    });

    nebula = new THREE.Mesh(geometry, material);
    scene.add(nebula);
}

function applyCosmicStyle(style) {
    // Ограничиваем скорость, чтобы избежать слишком быстрой анимации.
    // Это защита на случай, если API вернет слишком большое значение.
    if (style.nebula && typeof style.nebula.movement === 'number') {
        style.nebula.movement = Math.min(style.nebula.movement, 0.3); // Ограничение максимальной скорости
    }

    currentStyle = style;

    if (style.palette) {
        document.body.style.background = `linear-gradient(180deg, ${style.palette[0]}, ${style.palette[1]})`;
    }

    if (style.stars) {
        createStars({ ...style.stars, palette: style.palette });
    }

    if (style.nebula) {
        createNebula({ ...style.nebula, palette: style.palette });
    }
}


async function requestCosmicStyleFromNous(mood) {
    const apiKey = 'sk-7l89m19dfmdqo114vxrhj';
    const url = 'https://inference-api.nousresearch.com/v1/chat/completions';

    const headers = {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    };

    const body = {
        model: "DeepHermes-3-Mistral-24B-Preview",
        messages: [
            { role: "system", content: "You output ONLY valid JSON for cosmic generation. The JSON must follow this structure: { \"palette\": [\"#RRGGBB\", \"#RRGGBB\", \"#RRGGBB\"], \"nebula\": { \"intensity\": float, \"movement\": float (a small value, e.g. 0.01 to 0.2), \"detail\": float }, \"stars\": { \"count\": integer, \"twinkleSpeed\": float }, \"camera\": { \"rotationSpeed\": float (must be 0.0), \"zoomSpeed\": float } }" },
            { role: "user", content: `Generate cosmic style for mood: ${mood}` }
        ]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const jsonContent = data.choices[0].message.content;
        
        const cleanedJson = jsonContent.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        return JSON.parse(cleanedJson);

    } catch (error) {
        console.error("Error fetching cosmic style:", error);
        alert("Failed to generate style. Please check the console for details.");
        return null;
    }
}

const moodInput = document.getElementById('mood-input');
const generateBtn = document.getElementById('generate-btn');
const saveBtn = document.getElementById('save-style-btn');
const loadBtn = document.getElementById('load-styles-btn');
const stylesList = document.getElementById('saved-styles-list');

generateBtn.addEventListener('click', async () => {
    const mood = moodInput.value.trim();
    if (!mood) {
        alert("Please enter a mood.");
        return;
    }
    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;

    const style = await requestCosmicStyleFromNous(mood);
    if (style) {
        applyCosmicStyle(style);
    }
    
    generateBtn.textContent = 'Generate Universe';
    generateBtn.disabled = false;
});

saveBtn.addEventListener('click', () => {
    const mood = moodInput.value.trim() || 'unnamed_style';
    const name = prompt("Enter a name for this style:", mood.replace(/\s+/g, '_'));
    if (name && currentStyle) {
        saveStyle(name, currentStyle);
        updateSavedStylesList();
    }
});

loadBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    stylesList.classList.toggle('show');
    if (stylesList.classList.contains('show')) {
        updateSavedStylesList();
    }
});

stylesList.addEventListener('click', (e) => {
    if (e.target.tagName === 'LI') {
        const name = e.target.dataset.name;
        const style = loadStyle(name);
        if (style) {
            applyCosmicStyle(style);
            moodInput.value = name;
        }
        stylesList.classList.remove('show');
    }
});

window.addEventListener('click', () => {
    if (stylesList.classList.contains('show')) {
        stylesList.classList.remove('show');
    }
});


function saveStyle(name, json) {
    localStorage.setItem(`cosmic_style_${name}`, JSON.stringify(json));
}

function loadStyle(name) {
    return JSON.parse(localStorage.getItem(`cosmic_style_${name}`));
}

function listSavedStyles() {
    return Object.keys(localStorage)
        .filter(key => key.startsWith('cosmic_style_'))
        .map(key => key.replace('cosmic_style_', ''));
}

function updateSavedStylesList() {
    stylesList.innerHTML = '';
    const saved = listSavedStyles();
    if (saved.length === 0) {
        stylesList.innerHTML = '<li>No saved styles</li>';
    } else {
        saved.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.dataset.name = name;
            stylesList.appendChild(li);
        });
    }
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('wheel', (event) => {
    camera.position.z += event.deltaY * 0.01 * (currentStyle.camera.zoomSpeed || 1.0);
});

init();
