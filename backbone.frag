
// "Backbone" - Версия 6: Финальная, с исправлением временной рассинхронизации

uniform vec2 iResolution;
uniform float iTime;
uniform float iSeed; 

// --- Параметры для AI ---
uniform vec3 core_color;      
uniform float abstraction;    
uniform float gamma;          
uniform float brightness;     
uniform float nebula_strength;
uniform float movement_speed; 

// Глобальные UV для экранных эффектов (центр, туманность)
vec2 uvd;

// --- Функции шума и фрактала (без изменений) ---
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float noise(vec2 x) { vec2 i = floor(x); vec2 f = fract(x); float a = hash(i); float b = hash(i + vec2(1.0, 0.0)); float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0)); vec2 u = f * f * (3.0 - 2.0 * f); return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y; }
float fbm(in vec2 p) { float v = 0.0; float f = 1.0; float a = .5; for (int i = 0; i < 14; i++) { v += a * (noise((p - vec2(1.0)) * f)); f *= 1.9; a *= 0.6; } return v; }
mat2 rot(float a) { float s=sin(a), c=cos(a); return mat2(c,s,-s,c); }
float rnd(float p) { p = fract(p * .1031); p *= p + 33.33; return fract(2.*p*p); }

// --- Основная функция рендеринга ---
vec3 render(vec3 dir)
{
    float fxrand = iSeed;
    float s=0.3,fade=1.;
	float intensity = 0.0;
    
    dir.y += 4. * rnd(fxrand + 0.333);
    dir.x += rnd(fxrand + 0.444);
    dir = normalize(dir);

	for (float r=0.; r < 50.; r++) {
		vec3 p = s*dir;
        mat2 rt = rot(r);
        p.xz *= rt; p.xy *= rt; p.yz *= rt;
		p = abs(1.-mod(p*(rnd(fxrand)*2.+1.),2.));
		float pa=0.,a=0.;
		for (int i=0; i<13; i++) {
			p=abs(p)/dot(p,p) - abstraction - step(.5, rnd(fxrand + 0.877))*.1;
			float l=length(p)*.5;
			a+=abs(l-pa);
			pa=length(p);
		}
        fade *= .97; 
        intensity += 0.15 * tanh(a * 0.02) * fade;
		s+=.03;
	}

    // --- Пост-обработка и окрашивание ---
    float hash8_val = rnd(fxrand + 0.777);
    uvd *= rot(radians(360. * hash8_val));

    float core = smoothstep(.3, 0., length(uvd)) * 1.2;
    intensity += core;

    float neb = fbm(uvd*15. + dir.xy*5.); // Используем uvd для стабильности туманности
    neb = pow(smoothstep(.8,.0,abs(uvd.y)),2.)*nebula_strength;
    intensity *= (1.0 - neb);

    vec3 final_color = intensity * core_color;
    
	return pow(final_color, vec3(gamma)) * brightness;
}

// --- Главная функция (С ИСПРАВЛЕННЫМ ПОРЯДКОМ ОПЕРАЦИЙ) ---
void main() {
    // 1. Получаем "чистые" координаты экрана
    vec2 uv = gl_FragCoord.xy/iResolution.xy - 0.5;

    // 2. ФИКС: Сохраняем чистые координаты для экранных эффектов ДО всех трансформаций
    uvd = uv;

    // 3. Применяем движение для камеры
    vec2 motion = vec2(sin(iTime * movement_speed * 0.02) * 0.1, iTime * movement_speed * 0.1);
    uv += motion;

    // 4. Применяем коррекцию пропорций экрана
    uv.x *= iResolution.x/iResolution.y;

    // 5. Создаем вектор направления и рендерим
    vec3 dir = normalize(vec3(uv, 1.0));
    vec3 col = render(dir);
    gl_FragColor = vec4(col, 1.0);
}
