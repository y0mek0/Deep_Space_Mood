uniform vec3 iResolution;
uniform sampler2D iChannel0;

//Horizontal gaussian blur leveraging hardware filtering for fewer texture lookups.

vec3 ColorFetch(vec2 coord)
{
 	return textureLod(iChannel0, coord, 0.0).rgb;   
}

// Pre-calculated weights and offsets for the gaussian blur
const float weights[5] = float[](0.19638062, 0.29675293, 0.09442139, 0.01037598, 0.00025940);
const float offsets[5] = float[](0.0, 1.41176471, 3.29411765, 5.17647059, 7.05882353);


void main()
{    
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    
    vec3 color = vec3(0.0);
    float weightSum = 0.0;
    
    // Apply the blur to the entire image
    color += ColorFetch(uv) * weights[0];
    weightSum += weights[0];

    for(int i = 1; i < 5; i++)
    {
        vec2 offsetVec = vec2(offsets[i]) / iResolution.xy;
        color += ColorFetch(uv + offsetVec * vec2(0.5, 0.0)) * weights[i];
        color += ColorFetch(uv - offsetVec * vec2(0.5, 0.0)) * weights[i];
        weightSum += weights[i] * 2.0;
    }

    color /= weightSum;

    gl_FragColor = vec4(color,1.0);
}
