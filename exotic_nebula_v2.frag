/*
Original code by musk
License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
Adapted for automatic camera movement. Corrected visual regression.
*/

// --- Uniforms (required by the environment) ---
uniform vec2 iResolution;
uniform float iTime;
uniform sampler2D iChannel0; // Noise texture

// --- Noise Functions ---
// Reverted to texture() to restore visual details. 
// This will produce non-critical warnings (X3595) in the console, which is expected for this shader.
vec4 noise(float p){return texture(iChannel0,vec2(p*float(1.0/256.0),.0));}
vec4 noise(vec2 p){return texture(iChannel0,p*vec2(1.0/256.0));}
vec4 noise(vec3 p){float m = mod(p.z,1.0);float s = p.z-m; float sprev = s-1.0;if (mod(s,2.0)==1.0) { s--; sprev++; m = 1.0-m; };return mix(texture(iChannel0,p.xy*vec2(1.0/256.0) + noise(sprev).yz*21.421),texture(iChannel0,p.xy*vec2(1.0/256.0) + noise(s).yz*14.751),m);}
vec4 noise(vec4 p){float m = mod(p.w,1.0);float s = p.w-m; float sprev = s-1.0;if (mod(s,2.0)==1.0) { s--; sprev++; m = 1.0-m; };return mix(noise(p.xyz+noise(sprev).wyx*3531.123420),	noise(p.xyz+noise(s).wyx*4521.5314),	m);}

// --- Rotation Matrices ---
mat3 rotate_x(float a){float sa = sin(a); float ca = cos(a); return mat3(1.,.0,.0,    .0,ca,sa,   .0,-sa,ca);}
mat3 rotate_y(float a){float sa = sin(a); float ca = cos(a); return mat3(ca,.0,sa,    .0,1.,.0,   -sa,.0,ca);}

const float toffs = -154.0;
float t;

// --- Density Function ---
float density(vec3 p)
{
	vec4 d = noise(p*.5)*noise(p.xz*.044)*noise(p.xy*.26)*noise(p.yz*.21);
	float fd = dot(d,vec4(1.4));
	fd = fd*fd*fd*fd*fd;
	
	return max(.0,fd);
}

// --- Background Functions ---
vec3 background(vec3 d, vec3 p)
{
	vec4 n = noise(d*0.45*iResolution.y+p*.05);
	float sun = pow(dot(d,normalize(vec3(1.0)))*.5+.5,64.0);;
	float den = abs(d.y); den = 1.0-den; den=den*den*den*den; den*=.1;
	return vec3(pow(n.x+n.y*.1+den,22.0))*.3+ mix(vec3(.1,.15,.2)*.25,vec3(1.2,.9,.5),sun);
}

vec3 background2(vec3 d)
{
	float sun = pow(dot(d,normalize(vec3(1.0)))*.5+.5,16.0)*.7;;
	return mix(vec3(.1,.15,.2),vec3(1.2,.9,.5),sun);
}

// --- Main Shader ---
void main()
{
    t = iTime + noise(gl_FragCoord.xy).y/(24.0-24.0/(iTime+1.0)) + toffs;
    
    vec2 uv = gl_FragCoord.xy / iResolution.yy -vec2(.9,.5);

    // --- Automatic camera movement (replaces mouse input) ---
	vec2 m;
    // Creates a slow, looping figure-eight-like motion for the camera
    m.x = sin((t-toffs) * 0.08) * 2.0; 
    m.y = cos((t-toffs) * 0.05) * 1.5;
    
	// Rotation matrix for the camera, now with automatic movement
	mat3 rotmat = rotate_y((t-toffs)*.07+m.x)*rotate_x((t-toffs)*.031+m.y);
	
    // Ray position
	vec3 p = vec3(.0,.0,-30.0); p*=rotmat;
	p += vec3(sin(t),cos(t),sin(t*.25)*29.0+t*7.0-22.0-4.0/((t-toffs)*.01+0.01));
	
    // Ray direction
	vec3 d = normalize(vec3(uv*(sin(t*.17)*.2+0.8),1.0-length(uv)*.2));
	d*=rotmat;
	p+=d*noise(gl_FragCoord.xy).x*.9;
	
	// Accumulators
	float a = .0;
	vec3 color = vec3(.0);
	
	// Raymarching
	for (int i=0; i<60; i++)
	{
		p+=d*.9; // Move forward
		vec3 n = noise(p.xz*.25+vec2(t*.1)).xyz*12.0*noise(p.zy*.1+vec2(t*.1)).xyz; // Distort space

		float de = density(p+n);
		a += de; 
		a = min(1.0,a); 

		vec4 c2 = noise(p.yz*.03).xyzw;
		vec3 c = c2.xyz*1.7;
		
		// Lame illumination
		float occ = min((de-density(p+vec3(0.7+n))),1.0);
		occ = min(occ,(de-density(p+vec3(3.7)+n)));
		occ = min(occ,(de-density(p+vec3(5.7)+n)));
		
		color += max(.0,occ)*(1.0-a)*c;
		if (a>1.0) break; // Early exit if opaque
	}

	// Post-processing and blending
	color += background2(d)*.15;
	color = mix(min(vec3(1.0),background(d,p)),color,a);
	
	color +=noise(uv).xyz*.08; // Film grain
	color -= length(uv)*.12; // Vignette
	color = max(vec3(.0),color);
	color  = mix(color,vec3(length(color)),length(color)*1.7-.4); // Contrast
	color  = pow(color,vec3(.6)); // Gamma
	
	color *= 1.0+1.0/(t-toffs+.01);
	
	gl_FragColor = vec4(color,1.0);
}
