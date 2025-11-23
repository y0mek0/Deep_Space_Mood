// Based on https://glslsandbox.com/e#101235.0 by @h_b
// Adapted for AI generation

#ifdef GL_ES
precision mediump float;
#endif

// --- UNIFORMS --- 
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 palette[3];
uniform float detail_scale;
uniform float gamma;
uniform float distortion;
uniform float speed_multiplier;
uniform float iSeed; // <-- NEW: Random seed

// --- NOISE FUNCTIONS (by @h_b) ---

// Cellular noise implementation
vec4 noise4(vec4 n) {
	vec4 f = floor(n);
	vec4 s = n-f;
	vec4 r = f + s*s*(3.0-2.0*s);
	return mix(mix(mix(mix(
		fract(sin(f*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),
		fract(sin((f+vec4(1,0,0,0))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.x),
		fract(sin((f+vec4(0,1,0,0))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.y),
		fract(sin((f+vec4(1,1,0,0))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.x),r.y),
		mix(mix(
		fract(sin((f+vec4(0,0,1,0))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),
		fract(sin((f+vec4(1,0,1,0))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.x),
		mix(
		fract(sin((f+vec4(0,1,1,0))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),
		fract(sin((f+vec4(1,1,1,0))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.x),r.y),r.z),
		mix(mix(mix(
		fract(sin((f+vec4(0,0,0,1))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),
		fract(sin((f+vec4(1,0,0,1))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.x),
		mix(
		fract(sin((f+vec4(0,1,0,1))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),
		fract(sin((f+vec4(1,1,0,1))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.x),r.y),
		mix(mix(
		fract(sin((f+vec4(0,0,1,1))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),
		fract(sin((f+vec4(1,0,1,1))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.x),
		mix(
		fract(sin((f+vec4(0,1,1,1))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),
		fract(sin((f+vec4(1,1,1,1))*mat4(9,1,7,3, 2,8,4,5, 6,2,1,9, 3,7,5,8)+7.5)*99.0),r.x),r.y),r.z),r.w);
}

// --- CORE FUNCTIONS ---

// Rotation matrices
mat3 rotate_y(float r) { return mat3(cos(r),0,sin(r), 0,1,0, -sin(r),0,cos(r)); }
mat3 rotate_x(float r) { return mat3(1,0,0, 0,cos(r),-sin(r), 0,sin(r),cos(r)); }

// Density function - MODIFIED to use iSeed
float density(vec3 p) {
    vec3 p_seeded = p + iSeed * 0.1; // Offset position by seed
	vec4 d = noise4(p_seeded * detail_scale) * noise4(p_seeded.xz * 0.044) * noise4(p_seeded.xy * 0.26) * noise4(p_seeded.yz * 0.21);
	float fd = dot(d, vec4(1.4));
	fd = fd*fd*fd*fd*fd;
	return max(.0, fd);
}

// Starfield background
vec3 background(vec3 d, vec3 p) {
	vec4 n = noise4(d*0.45*iResolution.y+p*.05);
	float sun = pow(dot(d,normalize(vec3(1.0)))*.5+.5,64.0);;
	float den = abs(d.y); den = 1.0-den; den=den*den*den*den; den*=.1;
	return vec3(pow(n.x+n.y*.1+den,22.0))*.3+ mix(vec3(.1,.15,.2)*.25,vec3(1.2,.9,.5),sun);
}

// Smoothed background for lighting
vec3 background2(vec3 d) {
	float sun = pow(dot(d,normalize(vec3(1.0)))*.5+.5,16.0)*.7;; // Fake sun
	return mix(vec3(.1,.15,.2),vec3(1.2,.9,.5),sun);
}

void main() {
    float t = iTime * speed_multiplier;
    vec2 uv = gl_FragCoord.xy / iResolution.yy - vec2(0.9, 0.5);
	vec2 m = vec2(0.5); // Default mouse
    if (iMouse.x > 0.0) { // If mouse has moved
       m = (iMouse.xy / iResolution.yy - 0.5) * 2.0;
    }

	mat3 rotmat = rotate_y(t*0.07 + m.x) * rotate_x(t*0.031 + m.y);
	vec3 d = normalize(rotmat * vec3(uv, 1.0));
	vec3 p = rotmat * d;
	p.z -= t;

    // Raymarching
	float a = .0;
	vec3 color = vec3(0.0);

	for(float i=0.; i<1.0; i+=1.0/distortion) {
		float dens = density(p*exp(-i*2.2));
		
        // Color based on palette
		vec3 d_color = mix(palette[0], palette[1], smoothstep(0.0, 0.8, dens));
        d_color = mix(d_color, palette[2], smoothstep(0.2, 0.6, dens));

		float alpha = dens * (1.0/distortion) * 5.0;
		d_color *= alpha;
		
		color += d_color * (1.0-a);
		a += alpha * (1.0-a);
		if (a > 0.99) break; 
	}
	
    // Final Composition
	color += background2(d)*.15;
	color = mix(min(vec3(1.0), background(d, p)), color, a);
	
	color += noise4(uv).xyz*0.08; // film grain
	color -= length(uv)*.12; // vignette
	color = max(vec3(.0), color);
	color = mix(color,vec3(length(color)),length(color)*1.7-.4); // contrast
    
	color  = pow(color, vec3(gamma)); // gamma correction
	
	gl_FragColor = vec4(color,1.0);
}
