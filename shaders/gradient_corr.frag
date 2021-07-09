#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 x;
in vec2 cL;
in vec2 cR;
in vec2 cT;
in vec2 cB;

uniform sampler2D u;
uniform sampler2D p;

out vec4 grad;

void main () {
    float L = texture(p, cL).x;
    float R = texture(p, cR).x;
    float T = texture(p, cT).x;
    float B = texture(p, cB).x;
    
    grad.xy = texture(u, x).xy - vec2(R - L, T - B);
    grad.z  = texture(u, x).z;
}