#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 x;

uniform sampler2D u;
uniform vec2 pos;
uniform vec2 force;
uniform float aspectRatio;
uniform float radius;

out vec4 f;

void main () {
    vec2 p = x - pos;
    p.x *= aspectRatio;
    float r = radius * aspectRatio;
    f.xy = texture(u, x).xy + exp(-dot(p, p) / r) * force;
    f.z = texture(u, x).z;
}