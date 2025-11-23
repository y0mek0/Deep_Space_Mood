
// --- Базовая настройка Three.js ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(5);

// --- Глобальные переменные ---
let currentThemeName = 'space';
let currentMaterial;
let planeMesh;
let currentStyle = {};
const shaderCache = {}; 

// --- Хранилище для всех стилей ---
let allSavedStyles = {};

// --- Константы тем ---
const THEMES = {
    space: { vertex: 'base_vertex.glsl', fragment: 'space.frag' },
    platok: { vertex: 'base_vertex.glsl', fragment: 'platok.frag' },
    exotic_nebula: { vertex: 'base_vertex.glsl', fragment: 'exotic_nebula.frag' },
    backbone: { vertex: 'base_vertex.glsl', fragment: 'backbone.frag' },
    galaxy: { vertex: 'base_vertex.glsl', fragment: 'galaxy.frag' },
    gargantua: { vertex: 'base_vertex.glsl', fragment: 'gargantua.frag' }
};

// --- Элементы UI ---
const moodInput = document.getElementById('mood-input');
const generateBtn = document.getElementById('generate-btn');
const saveStyleBtn = document.getElementById('save-style-btn');
const deleteStyleBtn = document.getElementById('delete-style-btn');
const themeSelect = document.getElementById('theme-select');
const savedStylesSelect = document.getElementById('saved-styles-select');
const styleInfoContainer = document.getElementById('style-info-container');

// --- Основная логика ---

async function init() {
    loadAllStylesFromStorage();
    await preloadShaders();
    const geometry = new THREE.PlaneGeometry(window.innerWidth / 100, window.innerHeight / 100, 1, 1);
    await switchTheme(currentThemeName, true);
    planeMesh = new THREE.Mesh(geometry, currentMaterial);
    scene.add(planeMesh);
    applyStyle(getDefaultStyleForTheme(currentThemeName));
    addEventListeners();
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    if (currentMaterial && currentMaterial.uniforms.iTime) {
        currentMaterial.uniforms.iTime.value += 0.016;
    }
    renderer.render(scene, camera);
}

// --- Управление темами и стилями ---

async function switchTheme(themeName, isInitial = false) {
    if (!THEMES[themeName]) {
        console.error(`Theme ${themeName} not found!`);
        return;
    }
    currentThemeName = themeName;

    const vertexShader = await loadShader(THEMES[themeName].vertex);
    const fragmentShader = await loadShader(THEMES[themeName].fragment);

    currentMaterial = new THREE.ShaderMaterial({
        uniforms: getUniformsForTheme(themeName),
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
    });
    
    if (planeMesh) {
        planeMesh.material.dispose();
        planeMesh.material = currentMaterial;
    }

    updateSavedStylesDropdown();
    applyStyle(getDefaultStyleForTheme(themeName));
}

function applyStyle(style) {
    currentStyle = style;
    if (!currentMaterial) return;

    for (const key in style) {
        if (currentMaterial.uniforms[key]) {
            const uniformValue = currentMaterial.uniforms[key].value;
            if (key === 'palette' && Array.isArray(style[key])) {
                currentMaterial.uniforms[key].value = style[key].map(c => new THREE.Color(c));
            } else if (uniformValue instanceof THREE.Color) {
                currentMaterial.uniforms[key].value = new THREE.Color(style[key]);
            } else {
                currentMaterial.uniforms[key].value = style[key];
            }
        }
    }
    updateStyleInfo(style);
}

// --- Логика сохранения/загрузки/удаления стилей ---

function loadAllStylesFromStorage() {
    allSavedStyles = JSON.parse(localStorage.getItem('shaderStyles')) || {};
}

function saveAllStylesToStorage() {
    localStorage.setItem('shaderStyles', JSON.stringify(allSavedStyles));
}

function updateSavedStylesDropdown() {
    savedStylesSelect.innerHTML = ''; 
    const stylesForCurrentTheme = allSavedStyles[currentThemeName] || {};
    const styleNames = Object.keys(stylesForCurrentTheme);

    if (styleNames.length === 0) {
        savedStylesSelect.add(new Option('- No saved styles -', ''));
        savedStylesSelect.disabled = true;
        deleteStyleBtn.disabled = true;
    } else {
        savedStylesSelect.add(new Option('- Select a style -', ''));
        styleNames.forEach(name => savedStylesSelect.add(new Option(name, name)));
        savedStylesSelect.disabled = false;
        deleteStyleBtn.disabled = true; // Disable until a style is selected
    }
}

function handleSaveStyle() {
    const styleName = prompt("Enter a name for this style:", "My Awesome Style");
    if (!styleName || !styleName.trim()) {
        alert("Save cancelled: Style name cannot be empty.");
        return;
    }

    if (!allSavedStyles[currentThemeName]) {
        allSavedStyles[currentThemeName] = {};
    }

    // --- ИЗМЕНЕННАЯ ЛОГИКА С ПАРОЛЕМ ---
    if (allSavedStyles[currentThemeName][styleName]) {
        const password = prompt(`Style "${styleName}" already exists. Enter the password to overwrite:`);
        if (password !== "стиль") { // Проверяем кодовое слово
            alert("Incorrect password. Save cancelled.");
            return;
        }
    }

    // Убираем ненужные свойства перед сохранением
    const styleToSave = { ...currentStyle };
    delete styleToSave.iSeed; // Не сохраняем случайное число

    allSavedStyles[currentThemeName][styleName] = styleToSave;
    saveAllStylesToStorage();
    updateSavedStylesDropdown();
    savedStylesSelect.value = styleName; // Сразу выбираем сохраненный стиль
    deleteStyleBtn.disabled = false;
    alert(`Style "${styleName}" saved for theme "${currentThemeName}"!`);
}

function handleDeleteStyle() {
    const styleName = savedStylesSelect.value;
    if (!styleName) {
        alert("Please select a style to delete.");
        return;
    }

    if (confirm(`Are you sure you want to delete the style "${styleName}"?`)) {
        delete allSavedStyles[currentThemeName][styleName];
        saveAllStylesToStorage();
        updateSavedStylesDropdown();
        applyStyle(getDefaultStyleForTheme(currentThemeName)); // Сбрасываем на дефолт
        alert(`Style "${styleName}" deleted.`);
    }
}

// --- Отображение информации о стиле ---

function updateStyleInfo(style) {
    if (!styleInfoContainer) return;
    styleInfoContainer.innerHTML = '';

    for (const key in style) {
        const value = style[key];
        const paramDiv = document.createElement('div');
        let displayValue;
        if (key === 'iSeed') continue;

        if (key === 'palette' && Array.isArray(value)) {
            displayValue = value.map(color =>
                `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border: 1px solid #fff; margin-right: 5px; vertical-align: middle;"></span>${color}`
            ).join(', ');
        } else if (typeof value === 'string' && value.startsWith('#')) {
            displayValue = `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${value}; border: 1px solid #fff; margin-right: 5px; vertical-align: middle;"></span>${value}`;
        } else if (typeof value === 'number') {
            displayValue = value.toFixed(4);
        } else {
            continue;
        }
        paramDiv.innerHTML = `<span class="param-name">${key}:</span> <span class="param-value">${displayValue}</span>`;
        styleInfoContainer.appendChild(paramDiv);
    }
}

// --- API и Генерация ---

async function requestStyleFromNous(mood, theme) {
    const apiKey = 'sk-7l89m19dfmdqo114vxrhj';
    const url = 'https://inference-api.nousresearch.com/v1/chat/completions';
    const headers = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
    const systemPrompt = getSystemPromptForTheme(theme);
    if (!systemPrompt) {
        alert("Sorry, this theme isn't configured for generation yet.");
        return null;
    }
    const body = JSON.stringify({ model: "DeepHermes-3-Mistral-24B-Preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Generate a style for the mood: ${mood}` }] });

    try {
        const response = await fetch(url, { method: 'POST', headers, body });
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        const data = await response.json();
        const jsonContent = data.choices[0].message.content;
        const cleanedJson = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("Error fetching style:", error);
        alert("Failed to generate style. Please check the console for details.");
        return null;
    }
}

// --- Хелперы и утилиты ---

async function loadShader(url) {
    if (shaderCache[url]) return shaderCache[url];
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load shader: ${url}`);
        const text = await response.text();
        shaderCache[url] = text;
        return text;
    } catch (error) { console.error(error); return null; }
}

async function preloadShaders() {
    const promises = Object.values(THEMES).flatMap(theme => [loadShader(theme.vertex), loadShader(theme.fragment)]);
    await Promise.all(promises);
}

function getUniformsForTheme(theme) {
    const commonUniforms = {
        iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        iTime: { value: 0.0 },
        iMouse: { value: new THREE.Vector2(0,0) },
        iSeed: { value: Math.random() * 1000 },
    };

    if (theme === 'space') return { ...commonUniforms, intensity: { value: 0.5 }, detail: { value: 0.3 }, movement: { value: 0.05 }, palette: { value: [] } };
    if (theme === 'platok') return { ...commonUniforms, palette: { value: [] }, formuparam: { value: 0.53 }, zoom: { value: 0.8 }, speed: { value: 0.01 }, brightness: { value: 0.002 }, darkmatter: { value: 0.3 }, saturation: { value: 0.85 }, distfading: {value: 0.73} };
    if (theme === 'exotic_nebula') return { ...commonUniforms, iMouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) }, palette: { value: [] }, detail_scale: { value: 0.5 }, gamma: { value: 0.6 }, distortion: { value: 12.0 }, speed_multiplier: { value: 1.0 } };
    if (theme === 'backbone') return { ...commonUniforms, core_color: { value: new THREE.Color("#ff8c00") }, abstraction: { value: 0.7 }, gamma: { value: 1.05 }, brightness: { value: 1.2 }, nebula_strength: { value: 0.9 }, movement_speed: { value: 0.5 } };
    if (theme === 'galaxy') return { ...commonUniforms, palette: { value: [] }, brightness: { value: 1.0 }, star_density: { value: 17.0 }, nebula_complexity: { value: 0.9 } };
    if (theme === 'gargantua') return { ...commonUniforms, palette: { value: [] }, formuparam: { value: 0.53 }, zoom: { value: 0.997 }, speed: { value: -0.0001 }, brightness: { value: 0.00073 }, darkmatter: { value: 0.1 }, distfading: { value: 0.73 }, saturation: { value: 0.95 } };
    return commonUniforms;
}

function getSystemPromptForTheme(theme) {
    const artisticRule = "IMPORTANT: For sad, dark, or melancholic moods, do not use a monochrome palette. Instead, use a palette of desaturated, low-brightness colors, but ensure there is still visible contrast and texture. Keep detail/complexity parameters high enough to show the shape of the effect, but use a dark overall theme.";

    if (theme === 'space') return `You output ONLY valid JSON for cosmic generation. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "intensity": float, "movement": float (a small value, e.g. 0.01 to 0.2), "detail": float }`;
    if (theme === 'platok') return `You output ONLY valid JSON for a stable fractal shader. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "formuparam": float (0.4 to 0.6), "zoom": float (0.5 to 1.2), "speed": float (0.0 to 0.05), "brightness": float (0.001 to 0.003), "darkmatter": float (0.1 to 0.5), "saturation": float (0.5 to 1.0), "distfading": float(0.6, 0.9) }`;
    if (theme === 'exotic_nebula') return `You output ONLY valid JSON for an exotic nebula shader. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "detail_scale": float (0.1 to 1.0), "gamma": float (0.4 to 1.0), "distortion": float (5.0 to 25.0), "speed_multiplier": float (0.1 to 2.0) }`;
    if (theme === 'backbone') return `You output ONLY valid JSON for a complex abstract shader. ${artisticRule} The JSON must follow this structure: { "core_color": "#RRGGBB", "abstraction": float (0.6 to 0.8), "gamma": float (1.0 to 1.2), "brightness": float (1.0 to 1.5), "nebula_strength": float (0.5 to 1.0), "movement_speed": float (0.1 to 1.0) }`;
    if (theme === 'galaxy') return `You output ONLY valid JSON for a kaliset fractal galaxy. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "brightness": float (0.5 to 1.5), "star_density": float (15.0 to 25.0), "nebula_complexity": float (0.1 to 1.0) }`;
    if (theme === 'gargantua') return `You output ONLY valid JSON for a Gargantua fractal shader. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "formuparam": float (0.5 to 0.6), "zoom": float (0.9 to 1.1), "speed": float (-0.005 to 0.005), "brightness": float (0.0005 to 0.0015), "darkmatter": float (0.1 to 0.4), "distfading": float (0.6 to 0.8), "saturation": float (0.8 to 1.2) }`;
    return null;
}

function getDefaultStyleForTheme(theme) {
    if (theme === 'space') return { palette: ["#0d1b2a", "#1b263b", "#415a77"], intensity: 0.5, movement: 0.05, detail: 0.3 };
    if (theme === 'platok') return { palette: ["#f07167", "#0081a7", "#00afb9"], formuparam: 0.53, zoom: 0.8, speed: 0.01, brightness: 0.002, darkmatter: 0.3, saturation: 0.85, distfading: 0.73 };
    if (theme === 'exotic_nebula') return { palette: ["#4a00e0", "#8e2de2", "#0f0c29"], detail_scale: 0.5, gamma: 0.6, distortion: 12.0, speed_multiplier: 1.0 };
    if (theme === 'backbone') return { core_color: "#ff8c00", abstraction: 0.7, gamma: 1.05, brightness: 1.2, nebula_strength: 0.9, movement_speed: 0.5 };
    if (theme === 'galaxy') return { palette: ["#001f3f", "#7FDBFF", "#F012BE"], brightness: 1.0, star_density: 17.0, nebula_complexity: 0.9 };
    if (theme === 'gargantua') return { palette: ["#ff0000", "#00ff00", "#0000ff"], formuparam: 0.53, zoom: 0.997, speed: -0.0001, brightness: 0.00073, darkmatter: 0.1, distfading: 0.73, saturation: 0.95 };
    return {};
}

// --- Обработчики событий ---
function addEventListeners() {
    generateBtn.addEventListener('click', async () => {
        const mood = moodInput.value.trim();
        if (!mood) { alert("Please enter a mood."); return; }
        generateBtn.textContent = 'Generating...';
        generateBtn.disabled = true;
        const style = await requestStyleFromNous(mood, currentThemeName);
        if (style) {
            if (['backbone', 'platok', 'exotic_nebula', 'gargantua'].includes(currentThemeName)) {
                style.iSeed = Math.random() * 1000;
            }
            applyStyle(style);
            savedStylesSelect.value = ''; // Сбрасываем выбор сохраненного стиля
            deleteStyleBtn.disabled = true;
        }
        generateBtn.textContent = 'Generate New';
        generateBtn.disabled = false;
    });

    themeSelect.addEventListener('change', (e) => switchTheme(e.target.value));
    savedStylesSelect.addEventListener('change', (e) => {
        const styleName = e.target.value;
        if (styleName) {
            const savedStyle = allSavedStyles[currentThemeName][styleName];
            applyStyle({ ...savedStyle, iSeed: Math.random() * 1000 });
            deleteStyleBtn.disabled = false;
        } else {
            deleteStyleBtn.disabled = true;
        }
    });

    saveStyleBtn.addEventListener('click', handleSaveStyle);
    deleteStyleBtn.addEventListener('click', handleDeleteStyle);

    document.addEventListener('mousemove', (event) => {
        if (currentMaterial && currentMaterial.uniforms.iMouse) {
            currentMaterial.uniforms.iMouse.value.set(event.clientX, window.innerHeight - event.clientY);
        }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        if(currentMaterial) {
            currentMaterial.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight);
            if (currentMaterial.uniforms.iMouse) {
                currentMaterial.uniforms.iMouse.value.set(window.innerWidth / 2, window.innerHeight / 2);
            }
        }
    });
}

// --- Инициализация ---
init();
