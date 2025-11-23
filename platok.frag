
// platok.frag - Переработанная версия

uniform vec2 iResolution;
uniform float iTime; // Только для движения
uniform float iSeed; // Для стабильной структуры

// --- Параметры для AI ---
uniform vec3 palette[3];
uniform float formuparam;
uniform float zoom;
uniform float speed;
uniform float brightness;
uniform float darkmatter;
uniform float saturation;
uniform float distfading;

const int iterations = 17;
const int volsteps = 20;
const float stepsize = 0.1;
const float tile = 0.850;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy - 0.5;
    uv.y *= iResolution.y / iResolution.x;
    
    // Движение зависит от времени и скорости
    vec3 dir = vec3(uv * zoom, 1.);
    dir.z += iTime * speed * 0.1;

    vec3 from = vec3(1., .5, 0.5);
    from += vec3(iTime * speed * -0.1, iTime * speed * -0.05, 0.);

    // --- Логика фрактала (из старой версии) ---
    float s = 0.1, fade = 1.;
    vec3 v = vec3(0.);

    // Вращение зависит от "зерна", а не от времени, для стабильности
    mat2 rotation = mat2(cos(iSeed), sin(iSeed), -sin(iSeed), cos(iSeed));

    for (int r = 0; r < volsteps; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(tile) - mod(p, vec3(tile * 2.)));
        
        float pa = 0., a = 0.;
        
        for (int i = 0; i < iterations; i++) {
            p = abs(p) / dot(p, p) - formuparam; // Ключевая формула фрактала
            p.xy *= rotation; // Стабильное вращение
            a += abs(length(p) - pa);
            pa = length(p);
        }
        
        float dm = max(0., darkmatter - a * a * 0.001);
        a *= a * a;
        
        if (r > 6) fade *= 1. - dm;
        
        v += fade;
        v += vec3(s, s * s, s * s * s * s) * a * brightness * fade;
        
        fade *= distfading;
        s += stepsize;
    }
    
    // --- Наложение цвета ---
    // Смешиваем оригинальное значение с насыщенной версией
    vec3 color_val = mix(vec3(length(v)), v, saturation);
    
    // Используем полученные значения для смешивания цветов из палитры
    vec3 final_color = mix(palette[0], palette[1], clamp(color_val.x * 0.1, 0.0, 1.0));
    final_color = mix(final_color, palette[2], clamp(color_val.y * 0.1, 0.0, 1.0));
    final_color = mix(final_color, palette[0], clamp(color_val.z * 0.1, 0.0, 1.0));
    
    gl_FragColor = vec4(final_color, 1.0);
}
