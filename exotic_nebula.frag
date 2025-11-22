
// Адаптированная версия шейдера "Exotic Nebula" by musk
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;

// --- Новые параметры для управления через AI ---
uniform vec3 palette[3];        // Палитра из 3-х цветов
uniform float detail_scale;     // Масштаб и детализация туманности
uniform float gamma;            // Гамма-коррекция (яркость/контраст)
uniform float distortion;       // Сила пространственных искажений
uniform float speed_multiplier; // Скорость полета камеры

// --- Встроенная функция шума (замена iChannel0) ---
float random (in vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    vec2 u = f*f*(3.0-2.0*f);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

vec4 noise4(vec2 p) {
    return vec4(noise(p), noise(p + 15.7), noise(p.yx - 3.4), noise(p.yx + 23.1));
}

vec4 noise4(vec3 p) {
    return vec4(noise(p.xy), noise(p.yz), noise(p.xz), noise(p.yx));
}
// --- Конец секции шума ---

// Функции вращения
mat3 rotate_y(float a){float sa = sin(a); float ca = cos(a); return mat3(ca,.0,sa, .0,1.,.0, -sa,.0,ca);}
mat3 rotate_x(float a){float sa = sin(a); float ca = cos(a); return mat3(1.,.0,.0, .0,ca,sa, .0,-sa,ca);}

// Функция плотности
float density(vec3 p) {
	vec4 d = noise4(p * detail_scale) * noise4(p.xz * 0.044) * noise4(p.xy * 0.26) * noise4(p.yz * 0.21);
	float fd = dot(d, vec4(1.4));
	fd = fd*fd*fd*fd*fd;
	return max(.0, fd);
}

// Фон со звездами
vec3 background(vec3 d, vec3 p) {
	vec4 n = noise4(d*0.45*iResolution.y+p*.05);
	float sun = pow(dot(d,normalize(vec3(1.0)))*.5+.5,64.0);;
	float den = abs(d.y); den = 1.0-den; den=den*den*den*den; den*=.1;
	return vec3(pow(n.x+n.y*.1+den,22.0))*.3+ mix(vec3(.1,.15,.2)*.25,vec3(1.2,.9,.5),sun);
}

// Сглаженный фон для освещения
vec3 background2(vec3 d) {
	float sun = pow(dot(d,normalize(vec3(1.0)))*.5+.5,16.0)*.7;;
	return mix(vec3(.1,.15,.2),vec3(1.2,.9,.5),sun);
}

void main() {
    float t = iTime * speed_multiplier;
    vec2 uv = gl_FragCoord.xy / iResolution.yy - vec2(0.9, 0.5);
	vec2 m = (iMouse.xy / iResolution.yy - 0.5) * 2.0;

	mat3 rotmat = rotate_y(t*0.07 + m.x) * rotate_x(t*0.031 + m.y);

	vec3 p = vec3(.0,.0,-30.0) * rotmat;
	p += vec3(sin(t), cos(t), sin(t*0.25)*29.0 + t*7.0 - 22.0);

	vec3 d = normalize(vec3(uv*(sin(t*0.17)*0.2+0.8), 1.0-length(uv)*0.2)) * rotmat;
	p += d * noise(gl_FragCoord.xy) * 0.9;
	
	float a = .0; 
	vec3 color = vec3(.0);
	
	for (int i=0; i<60; i++) {
		p += d * 0.9;

		vec3 n = noise4(p.xz*0.25+vec2(t*0.1)).xyz * distortion * noise4(p.zy*0.1+vec2(t*0.1)).xyz;

		float de = density(p+n);
		a = min(1.0, a + de);

        // --- ИЗМЕНЕНИЕ: Используем палитру для цвета ---
        vec4 noise_val = noise4(p.yz * 0.03);
        vec3 c = mix(palette[0], palette[1], smoothstep(0.0, 1.0, noise_val.x));
        c = mix(c, palette[2], smoothstep(0.0, 1.0, noise_val.y));
        // --- КОНЕЦ ИЗМЕНЕНИЯ ---
		
		float occ = min((de-density(p+vec3(0.7+n))),1.0);
		occ = min(occ,(de-density(p+vec3(3.7)+n)));
		occ = min(occ,(de-density(p+vec3(5.7)+n)));
		
		color += max(.0,occ)*(1.0-a)*c;
		if (a>1.0) break;
	}

	color += background2(d)*.15;
	color = mix(min(vec3(1.0), background(d, p)), color, a);
	
	color += noise4(uv).xyz*0.08;
	color -= length(uv)*.12;
	color = max(vec3(.0), color);
	color  = mix(color,vec3(length(color)),length(color)*1.7-.4);
    
	color  = pow(color, vec3(gamma));
	
	gl_FragColor = vec4(color,1.0);
}
