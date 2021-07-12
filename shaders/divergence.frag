#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 x;
in vec2 cL;
in vec2 cR;
in vec2 cT;
in vec2 cB;

uniform sampler2D u;

out vec4 div;

void main(){
    float L = texture(u, cL).x;
    float R = texture(u, cR).x;
    float T = texture(u, cT).y;
    float B = texture(u, cB).y;
    
    div.x = 0.5 * (R - L + T - B);
}