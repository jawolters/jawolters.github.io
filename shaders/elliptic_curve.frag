#version 300 es

// source: https://www.shadertoy.com/view/4dcXzf

precision highp float;
precision highp sampler2D;

in vec2 x;

uniform sampler2D c;
uniform float t;

out vec4 color;

const float PI = 3.14159;

void main()
{
	vec2 uv = x.xy;
    uv = (uv * 2. - 1.) * 5.;

    float tmp = uv.x;
    uv.x = -uv.y;
    uv.y = tmp;
    
    float a = -0.5 - 8.5 * cos(t), b = 0.5 + 8.5 * cos(t * 0.71415);
    
	color = vec4(uv,0.5+0.5*sin(t),1.0);
    float delta = -uv.y * uv.y + uv.x * uv.x * uv.x + a * uv.x + b;
    float ad = abs(delta);

    const float hueChange = 1.;
    float r1 = sin(ad * hueChange + t) * 0.5 + 0.5;
    float g1 = sin(ad * hueChange + t + PI * 2. / 3.) * 0.5 + 0.5;
    float b1 = sin(ad * hueChange + t + PI * 4. / 3.) * 0.5 + 0.5;

    color = vec4(r1, g1, b1, 1.0) * pow(0.8, ad*5.);    
}