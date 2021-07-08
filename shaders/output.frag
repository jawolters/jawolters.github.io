#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 x;
in vec2 cL;
in vec2 cR;
in vec2 cT;
in vec2 cB;

uniform sampler2D plot;

out vec4 res;

void main(){
    float dye = texture(plot, x).z;
    res = vec4(dye);
}