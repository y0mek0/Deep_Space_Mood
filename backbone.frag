
// "Backbone" - Адаптированная версия с автоматическим движением и постоянным сидом

uniform vec2 iResolution;
uniform float iTime;
uniform float iSeed; // Постоянный сид для генерации

// --- Параметры для AI ---
uniform vec3 core_color;      // Цвет ядра
uniform float abstraction;    // Уровень абстракции формы
uniform float gamma;          // Гамма
uniform float brightness;     // Яркость
uniform float nebula_strength;// Сила туманности
uniform float movement_speed; // Скорость полета

vec2 uvd;

float hash(vec2 p)
{
	vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 x) {
	vec2 i = floor(x);
	vec2 f = fract(x);
	float a = hash(i);
	float b = hash(i + vec2(1.0, 0.0));
	float c = hash(i + vec2(0.0, 1.0));
	float d = hash(i + vec2(1.0, 1.0));
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm (in vec2 p) {
    float value = 0.0;
    float freq = 1.0;
    float amp = .5;
    for (int i = 0; i < 14; i++) {
        value += amp * (noise((p - vec2(1.0)) * freq));
        freq *= 1.9;
        amp *= 0.6;
    }
    return value;
}

mat2 rot(float a)
{
    float s=sin(a), c=cos(a);
    return mat2(c,s,-s,c);
}

float rnd(float p)
{
    p = fract(p * .1031);
    p *= p + 33.33;
    return fract(2.*p*p);
}


vec3 render(vec3 dir)
{
    // Убрали зависимость от iTime для генерации структуры
    float fxrand = iSeed;

	float s=0.3,fade=1., pa=0., sd=0.2;
	vec3 v=vec3(0.);
    dir.y+=4.*rnd(fxrand + 0.333);
    dir.x+=rnd(fxrand + 0.444);

	for (float r=0.; r<15.; r++) {
		vec3 p=s*dir;
        mat2 rt=rot(r);
        p.xz*=rt;
        p.xy*=rt;
        p.yz*=rt;
		p = abs(1.-mod(p*(rnd(fxrand)*2.+1.),2.));
		float pa,a=pa=0.;
		for (int i=0; i<13; i++) {
			p=abs(p)/dot(p,p) - abstraction - step(.5, rnd(fxrand + 0.877))*.1;
			float l=length(p)*.5;
			a+=abs(l-pa);
			pa=length(p);
		}
        fade*=.96;
		sd+=.5;
		float cv=abs(2.-mod(sd,4.));
		v+=normalize(vec3(cv*2.,cv*cv,cv*cv*cv))*pow(a*.02,2.)*fade;
		v.rb*=rot(rnd(fxrand + 0.222)*3.);
        v=abs(v);
		pa=a;
		s+=.05;
	}

	float sta=v.x;
	vec3 roj = core_color;

    float hash8_val = rnd(fxrand + 0.777);
    float hash12_val = rnd(fxrand + 1.411777);

	uvd.x*=sign(hash12_val-.5);
	uvd*=rot(radians(360.*hash8_val));
	uvd.y*=1.+(uvd.x+.5)*1.;
	v=pow(v,1.-.5*vec3(smoothstep(.5,0.,abs(uvd.y))));
    // Убрали зависимость появления от iTime
	v+=.04/(.1+abs(uvd.y*uvd.y))*roj;
	float core=smoothstep(.3,0.,length(uvd))*1.2;
	v+=core*roj;
	v=mix(vec3(length(v)*.7),v,.45);
	float neb=fbm(dir.xy*15.)-.5;
	uvd.y+=neb*.3;
	neb=pow(smoothstep(.8,.0,abs(uvd.y)),2.)*nebula_strength;
	v=mix(v*vec3(1.,.9,1.2),vec3(0.),max(neb,.7-neb)+core*.06-sta*.1);
    
	return pow(v,vec3(gamma))*brightness;
}

void main() {
    vec2 uv = gl_FragCoord.xy/iResolution.xy - 0.5;
    uv.x *= iResolution.x/iResolution.y;

    // --- Автоматическое движение ---
    uv.y += iTime * movement_speed * 0.1;
    uv.x += sin(iTime * movement_speed * 0.02) * 0.1;

    uvd = uv; 

    vec3 dir = normalize(vec3(uv, 1.0));
    vec3 col = render(dir);
    gl_FragColor = vec4(col, 1.0);
}
