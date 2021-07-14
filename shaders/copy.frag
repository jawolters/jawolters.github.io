#version 300 es

precision mediump float;
precision mediump sampler2D;

in vec2 x;

uniform sampler2D toCopy;

out vec4 copy;

void main () {
    copy = texture(toCopy, x);
}