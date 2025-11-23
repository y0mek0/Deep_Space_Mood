
// Original by moritz4004, sonicether, Kali
// Adapted for single-pass AI generation

#ifdef GL_ES
precision mediump float;
#endif

// --- UNIFORMS (Controllable by AI) ---
uniform vec2 iResolution;
uniform float iTime;
uniform float iSeed;

uniform float formuparam;   // 0.5 to 0.6
uniform float zoom;         // 0.8 to 1.2
uniform float speed;        // -0.005 to 0.005
uniform float brightness;   // 0.0005 to 0.0015
uniform float darkmatter;   // 0.1 to 0.4
uniform float distfading;   // 0.6 to 0.8
uniform float saturation;   // 0.8 to 1.2
uniform vec3 palette[3];    // Color Palette

// --- SHADER CODE ---
#define iterations 28
#define volsteps 24
#define stepsize 0.1
#define tile   4.5850

void main() {
    // get coords and direction
    vec2 uv = gl_FragCoord.xy / iResolution.xy - 0.5;
    uv.y *= iResolution.y / iResolution.x;
    vec3 dir = vec3(uv * zoom, 1.0);
    
    // Use seed to offset time, creating a random start
    float time = iTime * speed + iSeed;

    // mouse rotation (static for now, could be added later)
    float a1 = 0.9250;
    float a2 = 0.915;
    mat2 rot1 = mat2(cos(a1), sin(a1), -sin(a1), cos(a1));
    mat2 rot2 = mat2(cos(a2), sin(a2), -sin(a2), cos(a2));
    dir.xz *= rot1;
    dir.xy *= rot2;
    
    vec3 from = vec3(1.0, 0.5, 0.5);
    from += vec3(time * 2.0, time, -2.0);
    from.xz *= rot1;
    from.xy *= rot2;
    
    // volumetric rendering
    float s = 0.1, fade = 1.0;
    vec3 v = vec3(0.0);
    for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.0))); // tiling fold
        float pa = 0.0, a = 0.0;
        for (int i = 0; i < iterations; i++) { 
            p = abs(p) / dot(p, p) - formuparam; // the magic formula
            a += abs(length(p) - pa); // absolute sum of average change
            pa = length(p);
        }
        float dm = max(0.0, darkmatter - a * a * 0.0001); //dark matter
        a *= a * a; // add contrast
        if (r > 6) fade *= 1.0 - dm; // dark matter, don't render near
        
        // Coloring based on distance and palette
        vec3 color_step = mix(palette[0], palette[1], smoothstep(0.0, 0.5, float(r)/float(volsteps)));
        color_step = mix(color_step, palette[2], smoothstep(0.5, 1.0, float(r)/float(volsteps)));

        v += color_step * a * brightness * fade;
        fade *= distfading; // distance fading
        s += stepsize;               
    }
    
    // Final color adjustment
    vec3 final_color = mix(vec3(length(v)), v, saturation);
    
    // Vignette
    float d = length(uv);
    final_color *= (1.0 - d * 0.5);

    gl_FragColor = vec4(final_color, 1.0);
}
