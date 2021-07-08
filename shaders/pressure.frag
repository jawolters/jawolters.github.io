#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 x;
in vec2 cL;
in vec2 cR;
in vec2 cT;
in vec2 cB;

uniform sampler2D u;
uniform sampler2D div;

out vec4 p;

void main(){
    float L = texture(u, cL).x;
    float R = texture(u, cR).x;
    float T = texture(u, cT).x;
    float B = texture(u, cB).x;
    float C = texture(u, x).x;
    float div = texture(div, x).x;    
    p.x = (L + R + B + T - div) * 0.25;
}