// --- UNIFORMS --- 
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 palette[3];
uniform float brightness;
uniform float star_density; // controls the size/prominence of stars
uniform float nebula_complexity; // controls the detail of the nebula

const int MAX_ITER_CONST = 18; // Keep fixed for performance

float field(vec3 p, float s)
{
	float accum = s / 4.0;
	float prev = 0.0;
	float tw = 0.0;
    int iter = int(clamp(float(MAX_ITER_CONST) * nebula_complexity, 5.0, 18.0));

	for (int i = 0; i < MAX_ITER_CONST; ++i) 
  	{
		if (i >= iter) { break; } // GLSL loop workaround
		float mag = dot(p, p);
		p = abs(p) / mag + vec3(-0.5, -0.4, -1.487); // The Kaliset constant
		float w = exp(-float(i) / 5.0);
		accum += w * exp(-9.025 * pow(abs(mag - prev), 2.2));
		tw += w;
		prev = mag;
	}
	return max(0.0, 5.2 * accum / tw - 0.65);
}

vec3 nrand3(vec2 co)
{
	vec3 a = fract(cos(co.x*8.3e-3 + co.y) * vec3(1.3e5, 4.7e5, 2.9e5));
	vec3 b = fract(sin(co.x*0.3e-3 + co.y) * vec3(8.1e5, 1.0e5, 0.1e5));
	vec3 c = mix(a, b, 0.5);
	return c;
}

vec4 starLayer(vec2 p, float time)
{
	vec2 seed = 1.9 * p.xy;
	seed = floor(seed * max(iResolution.x, 600.0) / 1.5);
	vec3 rnd = nrand3(seed);
	vec4 col = vec4(pow(rnd.y, star_density)); // Use uniform for star size/prominence
	float mul = 10.0 * rnd.x;
	col.xyz *= sin(time * mul + mul) * 0.25 + 1.0;
	return col;
}

void main()
{
    float time = iTime / (iResolution.x / 1000.0);
	
	vec2 uv = 2.0 * gl_FragCoord.xy / iResolution.xy - 1.0;
  	vec2 uvs = uv * iResolution.xy / max(iResolution.x, iResolution.y);
	vec3 p = vec3(uvs / 2.5, 0.0) + vec3(0.8, -1.3, 0.0);
	p += 0.45 * vec3(sin(time / 32.0), sin(time / 24.0), sin(time / 64.0));
	
    if (iMouse.x > 0.0) { // Mouse interaction
	    p.x += mix(-0.02, 0.02, (iMouse.x / iResolution.x));
	    p.y += mix(-0.02, 0.02, (iMouse.y / iResolution.y));
    }

	float t = field(p, 0.15);
	float v = (1.0 - exp((abs(uv.x) - 1.0) * 6.0)) * (1.0 - exp((abs(uv.y) - 1.0) * 6.0));
	
	vec3 p2 = vec3(uvs / (4.0 + sin(time * 0.11) * 0.2 + 0.2 + sin(time * 0.15) * 0.3 + 0.4), 4.0) + vec3(2.0, -1.3, -1.0);
	p2 += 0.16 * vec3(sin(time / 32.0), sin(time / 24.0), sin(time / 64.0));
	
    if (iMouse.x > 0.0) { // Mouse interaction
	    p2.x += mix(-0.01, 0.01, (iMouse.x / iResolution.x));
	    p2.y += mix(-0.01, 0.01, (iMouse.y / iResolution.y));
    }

	float t2 = field(p2, 0.9);
    
    // --- COLORING (Now uses palette) ---
	vec3 c1 = mix(palette[0], palette[1], smoothstep(0.0, 0.8, t));
    vec3 c2 = mix(c1, palette[2], smoothstep(0.0, 0.6, t2));
    
    vec3 final_nebula = mix(c1, c2, v);

	// --- STARS (Now uses palette) ---
	vec4 starColour = vec4(0.0);
	starColour += starLayer(p.xy, time);
	starColour += starLayer(p2.xy, time);
    starColour.xyz = palette[2] * starColour.r; // Use brightest color from palette for stars

	// --- FINAL COMPOSITION ---
	vec3 colour = final_nebula + starColour.xyz;
	gl_FragColor = vec4(brightness * colour.xyz, 1.0);
}
