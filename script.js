
// --- Базовая настройка Three.js ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
camera.position.setZ(5);

// --- Глобальные переменные ---
let currentThemeName = 'space'; 
let currentTheme;
let planeMesh; 
let currentStyle = {};
const shaderCache = {};
let allSavedStyles = {};
let noiseTexture; 
let disabledThemes = {}; 
let lastGeneratedTheme = null;
let currentUIMode = 'basic'; // 'basic' или 'test'

// --- Переменные для многопроходного рендеринга ---
let isMultipass = false;
let multipassScene, multipassCamera, quad;
let bufferA_RT, bufferB_RT, bufferC_RT, bufferD_RT;
let bufferA_prev_RT; 
let bufferA_Mat, bufferB_Mat, bufferC_Mat, bufferD_Mat, imageMat;

// --- Константы тем ---
const THEMES = {
    space: { name: "Cosmic Nebula", type: 'singlepass', vertex: 'base_vertex.glsl', fragment: 'space.frag' },
    platok: { name: "Platok Fractal", type: 'singlepass', vertex: 'base_vertex.glsl', fragment: 'platok.frag' },
    exotic_nebula: { name: "Exotic Nebula", type: 'singlepass', vertex: 'base_vertex.glsl', fragment: 'exotic_nebula_v2.frag' },
    backbone: { name: "Organic Backbone", type: 'singlepass', vertex: 'base_vertex.glsl', fragment: 'backbone.frag' },
    galaxy: { name: "Galaxy", type: 'singlepass', vertex: 'base_vertex.glsl', fragment: 'galaxy.frag' },
    gargantua: {
        name: "Gargantua",
        type: 'multipass',
        passes: [
            { name: 'bufferA', shader: 'gargantua_buffer_a_v2.frag' },
            { name: 'bufferB', shader: 'gargantua_buffer_b_v2.frag' },
            { name: 'bufferC', shader: 'gargantua_buffer_c_v2.frag' },
            { name: 'bufferD', shader: 'gargantua_buffer_d_v2.frag' },
            { name: 'image', shader: 'gargantua_image_v2.frag' }
        ]
    }
};

// --- Элементы UI ---
const moodInput = document.getElementById('mood-input');
const generateBtn = document.getElementById('generate-btn');
const saveStyleBtn = document.getElementById('save-style-btn');
const deleteStyleBtn = document.getElementById('delete-style-btn');
const themeSelect = document.getElementById('theme-select');
const savedStylesSelect = document.getElementById('saved-styles-select');
const styleInfoContainer = document.getElementById('style-info-container');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const basicModeBtn = document.getElementById('basic-mode-btn');
const testModeBtn = document.getElementById('test-mode-btn');


// --- ФУНКЦИЯ ГЕНЕРАЦИИ ТЕКСТУРЫ ШУМА ---
function generateNoiseTexture() {
    const width = 256;
    const height = 256;
    const size = width * height;
    const data = new Uint8Array(4 * size);
    for (let i = 0; i < size; i++) {
        const stride = i * 4;
        const randomValue = Math.random() * 255;
        data[stride] = randomValue; data[stride + 1] = randomValue; data[stride + 2] = randomValue; data[stride + 3] = 255;
    }
    const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
    texture.needsUpdate = true;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// --- Основная логика ---
async function init() {
    noiseTexture = generateNoiseTexture();
    loadAllStylesFromStorage();
    loadDisabledThemes();
    populateThemeSelect();
    await preloadShaders();

    const singlePassGeometry = new THREE.PlaneGeometry(window.innerWidth / 100, window.innerHeight / 100, 1, 1);
    planeMesh = new THREE.Mesh(singlePassGeometry);
    scene.add(planeMesh);

    multipassScene = new THREE.Scene();
    multipassCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    multipassScene.add(quad);
    
    // Устанавливаем начальную тему и применяем стиль по умолчанию
    themeSelect.value = currentThemeName;
    await switchTheme(currentThemeName, false); // Не применяем стиль по умолчанию, т.к. animate еще не запущен
    applyStyle(getDefaultStyleForTheme(currentThemeName));


    updateToggleButton();
    addEventListeners();
    setUIMode('basic'); // Открываем в 'basic' режиме по умолчанию
    
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;
    if (isMultipass) {
        if (!bufferA_Mat || !bufferB_Mat || !bufferC_Mat || !bufferD_Mat || !imageMat) return;
        [bufferA_Mat, bufferB_Mat, bufferC_Mat, bufferD_Mat, imageMat].forEach(mat => { if(mat.uniforms.iTime) mat.uniforms.iTime.value = time; });
        quad.material = bufferA_Mat;
        bufferA_Mat.uniforms.iChannel2.value = bufferA_prev_RT.texture;
        renderer.setRenderTarget(bufferA_RT);
        renderer.render(multipassScene, multipassCamera);
        quad.material = bufferB_Mat;
        bufferB_Mat.uniforms.iChannel0.value = bufferA_RT.texture;
        renderer.setRenderTarget(bufferB_RT);
        renderer.render(multipassScene, multipassCamera);
        quad.material = bufferC_Mat;
        bufferC_Mat.uniforms.iChannel0.value = bufferB_RT.texture;
        renderer.setRenderTarget(bufferC_RT);
        renderer.render(multipassScene, multipassCamera);
        quad.material = bufferD_Mat;
        bufferD_Mat.uniforms.iChannel0.value = bufferC_RT.texture;
        renderer.setRenderTarget(bufferD_RT);
        renderer.render(multipassScene, multipassCamera);
        quad.material = imageMat;
        imageMat.uniforms.iChannel0.value = bufferA_RT.texture;
        imageMat.uniforms.iChannel3.value = bufferD_RT.texture;
        renderer.setRenderTarget(null);
        renderer.render(multipassScene, multipassCamera);
        let temp = bufferA_prev_RT;
        bufferA_prev_RT = bufferA_RT;
        bufferA_RT = temp;
    } else {
        if (planeMesh && planeMesh.material && planeMesh.material.uniforms.iTime) {
            planeMesh.material.uniforms.iTime.value = time;
        }
        renderer.render(scene, camera);
    }
}

// --- Управление UI режимами ---
function setUIMode(mode) {
    currentUIMode = mode;
    document.body.className = mode + '-mode'; // Устанавливаем класс для body
    if (mode === 'basic') {
        basicModeBtn.classList.add('active');
        testModeBtn.classList.remove('active');
    } else { // 'test'
        testModeBtn.classList.add('active');
        basicModeBtn.classList.remove('active');
        // При переключении в Test режим, убедимся что UI отображает текущую активную тему
        themeSelect.value = currentThemeName;
        updateToggleButton();
        updateSavedStylesDropdown();
        applyStyle(currentStyle);
    }
}


// --- Управление темами и стилями ---
async function switchTheme(themeName, applyDefault = true) {
    // В режиме "Test" проверяем, выключена ли тема
    if (disabledThemes[themeName] && currentUIMode === 'test') { 
        planeMesh.visible = false;
        return;
    }
    planeMesh.visible = true;

    currentThemeName = themeName;
    currentTheme = THEMES[themeName];
    if (currentTheme.type === 'multipass') {
        isMultipass = true;
        planeMesh.visible = false;
        const rtOptions = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType };
        if (!bufferA_RT) {
            bufferA_RT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);
            bufferA_prev_RT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);
            bufferB_RT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);
            bufferC_RT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);
            bufferD_RT = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, rtOptions);
        }
        const shaders = await Promise.all(currentTheme.passes.map(pass => loadShader(pass.shader)));
        const baseUniforms = (extra = {}) => ({ 
            iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            iTime: { value: 0.0 }, iMouse: { value: new THREE.Vector2(0, 0) }, ...extra
        });
        bufferA_Mat = new THREE.ShaderMaterial({ uniforms: baseUniforms({ iChannel0: { value: noiseTexture }, iChannel2: { value: null } }), fragmentShader: shaders[0] });
        bufferB_Mat = new THREE.ShaderMaterial({ uniforms: baseUniforms({ iChannel0: { value: null } }), fragmentShader: shaders[1] });
        bufferC_Mat = new THREE.ShaderMaterial({ uniforms: baseUniforms({ iChannel0: { value: null } }), fragmentShader: shaders[2] });
        bufferD_Mat = new THREE.ShaderMaterial({ uniforms: baseUniforms({ iChannel0: { value: null } }), fragmentShader: shaders[3] });
        imageMat = new THREE.ShaderMaterial({ uniforms: { ...baseUniforms(getUniformsForTheme(themeName)), iChannel0: { value: null }, iChannel3: { value: null } }, fragmentShader: shaders[4] });
    } else {
        isMultipass = false;
        planeMesh.visible = true;
        const vertexShader = await loadShader(currentTheme.vertex);
        const fragmentShader = await loadShader(currentTheme.fragment);
        const material = new THREE.ShaderMaterial({
            uniforms: getUniformsForTheme(themeName),
            vertexShader, fragmentShader, transparent: true,
        });
        if (planeMesh.material) planeMesh.material.dispose();
        planeMesh.material = material;
    }
    
    // Обновляем UI только в режиме 'test'
    if (currentUIMode === 'test') {
        updateSavedStylesDropdown();
    }

    if (applyDefault) {
        applyStyle(getDefaultStyleForTheme(themeName));
    }
}

function applyStyle(style) {
    currentStyle = style;
    let targetMaterial = isMultipass ? imageMat : planeMesh.material;
    if (!targetMaterial) return;
    for (const key in style) {
        if (targetMaterial.uniforms[key]) {
            const uniformValue = targetMaterial.uniforms[key].value;
            if (key === 'palette' && Array.isArray(style[key])) {
                targetMaterial.uniforms[key].value = style[key].map(c => new THREE.Color(c));
            } else if (uniformValue instanceof THREE.Color) {
                targetMaterial.uniforms[key].value = new THREE.Color(style[key]);
            } else {
                targetMaterial.uniforms[key].value = style[key];
            }
        }
    }
    // Обновляем инфо только в 'test' режиме
    if (currentUIMode === 'test') {
        updateStyleInfo(style);
    }
}

// --- Утилиты для стилей ---
function loadAllStylesFromStorage() { allSavedStyles = JSON.parse(localStorage.getItem('shaderStyles')) || {}; }
function saveAllStylesToStorage() { localStorage.setItem('shaderStyles', JSON.stringify(allSavedStyles)); }

function updateSavedStylesDropdown() {
    savedStylesSelect.innerHTML = ''; 
    const stylesForCurrentTheme = allSavedStyles[currentThemeName] || {};
    const styleNames = Object.keys(stylesForCurrentTheme);
    if (styleNames.length === 0) {
        savedStylesSelect.add(new Option('- No saved styles -', ''));
        savedStylesSelect.disabled = true; deleteStyleBtn.disabled = true;
    } else {
        savedStylesSelect.add(new Option('- Select a style -', ''));
        styleNames.forEach(name => savedStylesSelect.add(new Option(name, name)));
        savedStylesSelect.disabled = false; deleteStyleBtn.disabled = true; 
    }
}

function handleSaveStyle() {
    const styleName = prompt("Enter a name for this style:", "My Awesome Style");
    if (!styleName || !styleName.trim()) { alert("Save cancelled: Style name cannot be empty."); return; }
    if (!allSavedStyles[currentThemeName]) { allSavedStyles[currentThemeName] = {}; }
    if (allSavedStyles[currentThemeName][styleName]) {
        const password = prompt(`Style \\"${styleName}\\" already exists. Enter the password to overwrite:`);
        if (password !== "стиль") { alert("Incorrect password. Save cancelled."); return; }
    }
    allSavedStyles[currentThemeName][styleName] = { ...currentStyle };
    saveAllStylesToStorage();
    updateSavedStylesDropdown();
    savedStylesSelect.value = styleName; 
    deleteStyleBtn.disabled = false;
    alert(`Style \\"${styleName}\\" saved for theme \\"${currentThemeName}\\"!`);
}

function handleDeleteStyle() {
    const styleName = savedStylesSelect.value;
    if (!styleName) { alert("Please select a style to delete."); return; }
    if (confirm(`Are you sure you want to delete the style \\"${styleName}\\"?`)) {
        delete allSavedStyles[currentThemeName][styleName];
        saveAllStylesToStorage();
        updateSavedStylesDropdown();
        applyStyle(getDefaultStyleForTheme(currentThemeName)); 
        alert(`Style \\"${styleName}\\" deleted.`);
    }
}

function updateStyleInfo(style) {
    if (!styleInfoContainer) return;
    styleInfoContainer.innerHTML = '';
    for (const key in style) {
        const value = style[key];
        const paramDiv = document.createElement('div');
        let displayValue;
        if (key === 'palette' && Array.isArray(value)) {
            displayValue = value.map(color => `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${color}; border: 1px solid #fff; margin-right: 5px; vertical-align: middle;"></span>${color}`).join(', ');
        } else if (typeof value === 'string' && value.startsWith('#')) {
            displayValue = `<span style="display: inline-block; width: 12px; height: 12px; background-color: ${value}; border: 1px solid #fff; margin-right: 5px; vertical-align: middle;"></span>${value}`;
        } else if (typeof value === 'number') { displayValue = value.toFixed(4); } 
        else { continue; }
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
    if (!systemPrompt) { alert("Sorry, this theme isn't configured for generation yet."); return null; }
    const body = JSON.stringify({ model: "DeepHermes-3-Mistral-24B-Preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Generate a style for the mood: ${mood}` }] });
    try {
        const response = await fetch(url, { method: 'POST', headers, body });
        if (!response.ok) throw new Error(`API request failed with status ${response.status}`);
        const data = await response.json();
        const jsonContent = data.choices[0].message.content;
        const cleanedJson = jsonContent.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedJson);
    } catch (error) { console.error("Error fetching style:", error); alert("Failed to generate style. Please check the console for details."); return null; }
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
    const promises = Object.values(THEMES).flatMap(theme => {
        if(theme.type === 'singlepass') { return [loadShader(theme.vertex), loadShader(theme.fragment)]; }
        else { return theme.passes.map(pass => loadShader(pass.shader)); }
    });
    await Promise.all(promises);
}

function getUniformsForTheme(theme) {
    const common = { iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }, iTime: { value: 0.0 }, iMouse: { value: new THREE.Vector2(0,0) } };
    if (theme === 'space') return { ...common, intensity: { value: 0.5 }, detail: { value: 0.3 }, movement: { value: 0.05 }, palette: { value: [] } };
    if (theme === 'platok') return { ...common, palette: { value: [] }, formuparam: { value: 0.53 }, zoom: { value: 0.8 }, speed: { value: 0.01 }, brightness: { value: 0.002 }, darkmatter: { value: 0.3 }, saturation: { value: 0.85 }, distfading: {value: 0.73} };
    if (theme === 'exotic_nebula') return { ...common, iChannel0: { value: noiseTexture }, iMouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) }, palette: { value: [] }, detail_scale: { value: 0.5 }, gamma: { value: 0.6 }, distortion: { value: 12.0 }, speed_multiplier: { value: 1.0 } };
    if (theme === 'backbone') return { ...common, core_color: { value: new THREE.Color("#ff8c00") }, abstraction: { value: 0.7 }, gamma: { value: 1.05 }, brightness: { value: 1.2 }, nebula_strength: { value: 0.9 }, movement_speed: { value: 0.5 } };
    if (theme === 'galaxy') return { ...common, palette: { value: [] }, brightness: { value: 1.0 }, star_density: { value: 17.0 }, nebula_complexity: { value: 0.9 } };
    if (theme === 'gargantua') return { brightness: { value: 0.00073 }, darkmatter: { value: 0.1 }, distfading: { value: 0.73 }, saturation: { value: 0.95 }, formuparam: { value: 0.533 }, zoom: { value: 0.997 }, tile: { value: 4.585 }, speed: { value: -0.0001 } };
    return common;
}

function getSystemPromptForTheme(theme) {
    const artisticRule = "IMPORTANT: For sad, dark, or melancholic moods, do not use a monochrome palette. Instead, use a palette of desaturated, low-brightness colors, but ensure there is still visible contrast and texture. Keep detail/complexity parameters high enough to show the shape of the effect, but use a dark overall theme.";
    if (theme === 'space') return `You output ONLY valid JSON for cosmic generation. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "intensity": float, "movement": float (a small value, e.g. 0.01 to 0.2), "detail": float }`;
    if (theme === 'platok') return `You output ONLY valid JSON for a stable fractal shader. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "formuparam": float (0.4 to 0.6), "zoom": float (0.5 to 1.2), "speed": float (0.0 to 0.05), "brightness": float (0.001 to 0.003), "darkmatter": float (0.1 to 0.5), "saturation": float (0.5 to 1.0), "distfading": float(0.6, 0.9) }`;
    if (theme === 'exotic_nebula') return `You output ONLY valid JSON for an exotic nebula shader. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "detail_scale": float (0.1 to 1.0), "gamma": float (0.4 to 1.0), "distortion": float (5.0 to 25.0), "speed_multiplier": float (0.1 to 2.0) }`;
    if (theme === 'backbone') return `You output ONLY valid JSON for a complex abstract shader. ${artisticRule} The JSON must follow this structure: { "core_color": "#ff8c00", "abstraction": float (0.6 to 0.8), "gamma": float (1.0 to 1.2), "brightness": float (1.0 to 1.5), "nebula_strength": float (0.5 to 1.0), "movement_speed": float (0.1 to 1.0) }`;
    if (theme === 'galaxy') return `You output ONLY valid JSON for a kaliset fractal galaxy. ${artisticRule} The JSON must follow this structure: { "palette": ["#RRGGBB", "#RRGGBB", "#RRGGBB"], "brightness": float (0.5 to 1.5), "star_density": float (15.0 to 25.0), "nebula_complexity": float (0.1 to 1.0) }`;
    if (theme === 'gargantua') return `You output ONLY valid JSON for the Gargantua black hole shader. ${artisticRule} The JSON must follow this structure: { "brightness": float (0.0005 to 0.0015), "darkmatter": float (0.1 to 0.4), "distfading": float (0.6 to 0.8), "saturation": float (0.8 to 1.2), "formuparam": float (0.5 to 0.55), "zoom": float (0.9 to 1.1), "tile": float (4.0 to 5.0), "speed": float (-0.005 to 0.005) }`;
    return null;
}

function getDefaultStyleForTheme(theme) {
    if (theme === 'space') return { palette: ["#0d1b2a", "#1b263b", "#415a77"], intensity: 0.5, movement: 0.05, detail: 0.3 };
    if (theme === 'platok') return { palette: ["#f07167", "#0081a7", "#00afb9"], formuparam: 0.53, zoom: 0.8, speed: 0.01, brightness: 0.002, darkmatter: 0.3, saturation: 0.85, distfading: 0.73 };
    if (theme === 'exotic_nebula') return { palette: ["#4a00e0", "#8e2de2", "#0f0c29"], detail_scale: 0.5, gamma: 0.6, distortion: 12.0, speed_multiplier: 1.0 };
    if (theme === 'backbone') return { core_color: "#ff8c00", abstraction: 0.7, gamma: 1.05, brightness: 1.2, nebula_strength: 0.9, movement_speed: 0.5 };
    if (theme === 'galaxy') return { palette: ["#001f3f", "#7FDBFF", "#F012BE"], brightness: 1.0, star_density: 17.0, nebula_complexity: 0.9 };
    if (theme === 'gargantua') return { brightness: 0.00073, darkmatter: 0.1, distfading: 0.73, saturation: 0.95, formuparam: 0.533, zoom: 0.997, tile: 4.585, speed: -0.0001 };
    return {};
}

// --- Обработчики событий ---
async function performGeneration() {
    const mood = moodInput.value.trim();
    if (!mood) { alert("Please enter a mood."); return; }

    generateBtn.textContent = 'Generating...';
    generateBtn.disabled = true;

    let themeToUse = currentThemeName;
    // Логика для 'basic' режима
    if (currentUIMode === 'basic') {
        const enabledThemes = Object.keys(THEMES).filter(t => !disabledThemes[t] && t !== lastGeneratedTheme);
        if (enabledThemes.length > 0) {
            themeToUse = enabledThemes[Math.floor(Math.random() * enabledThemes.length)];
            lastGeneratedTheme = themeToUse; // Запоминаем последнюю использованную тему
            await switchTheme(themeToUse, false); // Переключаем тему "под капотом"
        } else {
             // Если осталась только одна тема, используем ее
            const allEnabled = Object.keys(THEMES).filter(t => !disabledThemes[t]);
            if(allEnabled.length === 1) {
                themeToUse = allEnabled[0];
                lastGeneratedTheme = themeToUse;
                await switchTheme(themeToUse, false);
            } else {
                 alert("No themes are enabled for basic generation. Please enable some themes in 'Test' mode.");
                 generateBtn.textContent = 'Generate New';
                 generateBtn.disabled = false;
                 return;
            }
        }
    }

    const style = await requestStyleFromNous(mood, themeToUse);
    if (style) { 
        applyStyle(style); 
        // В режиме 'test' сбрасываем выбор сохраненного стиля
        if(currentUIMode === 'test') {
            savedStylesSelect.value = ''; 
            deleteStyleBtn.disabled = true; 
        }
    }
    generateBtn.textContent = 'Generate New';
    generateBtn.disabled = false;
}

function addEventListeners() {
    generateBtn.addEventListener('click', performGeneration);

    themeSelect.addEventListener('change', (e) => {
        switchTheme(e.target.value);
        updateToggleButton();
    });
    
    savedStylesSelect.addEventListener('change', (e) => {
        const styleName = e.target.value;
        if (styleName) { applyStyle(allSavedStyles[currentThemeName][styleName]); deleteStyleBtn.disabled = false; }
        else { applyStyle(getDefaultStyleForTheme(currentThemeName)); deleteStyleBtn.disabled = true; }
    });

    saveStyleBtn.addEventListener('click', handleSaveStyle);
    deleteStyleBtn.addEventListener('click', handleDeleteStyle);
    themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Переключатели режимов
    basicModeBtn.addEventListener('click', () => setUIMode('basic'));
    testModeBtn.addEventListener('click', () => setUIMode('test'));

    document.addEventListener('mousemove', (event) => {
        const mouseVec = new THREE.Vector2(event.clientX, window.innerHeight - event.clientY);
        if (isMultipass) { [bufferA_Mat, imageMat].forEach(mat => { if(mat && mat.uniforms.iMouse) mat.uniforms.iMouse.value = mouseVec; }); } 
        else { if (planeMesh.material && planeMesh.material.uniforms.iMouse) { planeMesh.material.uniforms.iMouse.value = mouseVec; } }
    });

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        const resVec = new THREE.Vector2(window.innerWidth, window.innerHeight);
        if(isMultipass) {
             [bufferA_RT, bufferA_prev_RT, bufferB_RT, bufferC_RT, bufferD_RT].forEach(rt => rt.setSize(window.innerWidth, window.innerHeight));
             [bufferA_Mat, bufferB_Mat, bufferC_Mat, bufferD_Mat, imageMat].forEach(mat => { if(mat && mat.uniforms.iResolution) mat.uniforms.iResolution.value = resVec; });
        } else {
            if (planeMesh.material && planeMesh.material.uniforms.iResolution) { planeMesh.material.uniforms.iResolution.value = resVec; }
        }
    });
}

function populateThemeSelect() {
    themeSelect.innerHTML = '';
    for (const key in THEMES) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = THEMES[key].name;
        if (disabledThemes[key]) {
            option.classList.add('disabled');
            option.textContent += ' (OFF)';
        }
        themeSelect.appendChild(option);
    }
}

function toggleTheme() {
    const selectedTheme = themeSelect.value;
    disabledThemes[selectedTheme] = !disabledThemes[selectedTheme];
    saveDisabledThemes();
    populateThemeSelect();
    themeSelect.value = selectedTheme;
    // Обновляем визуальное состояние
    if(disabledThemes[selectedTheme]){
        planeMesh.visible = false;
    } else {
        // Если тема была выключена и мы ее включаем, переключимся на нее
        switchTheme(selectedTheme);
    }
    updateToggleButton();
}

function updateToggleButton() {
    const currentIsDisabled = disabledThemes[themeSelect.value];
    if (currentIsDisabled) {
        themeToggleBtn.textContent = 'OFF';
        themeToggleBtn.classList.remove('on');
        themeToggleBtn.classList.add('off');
    } else {
        themeToggleBtn.textContent = 'ON';
        themeToggleBtn.classList.remove('off');
        themeToggleBtn.classList.add('on');
    }
}

function saveDisabledThemes() { localStorage.setItem('disabledThemes', JSON.stringify(disabledThemes)); }
function loadDisabledThemes() { disabledThemes = JSON.parse(localStorage.getItem('disabledThemes')) || {}; }

// --- Инициализация ---
init();
