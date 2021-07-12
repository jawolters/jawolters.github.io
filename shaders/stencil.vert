#version 300 es

in vec2 aPosition;

out vec2 x;
out vec2 cL;
out vec2 cR;
out vec2 cT;
out vec2 cB;

uniform vec2 dx;

void main () {    
    x = aPosition * 0.5 + 0.5;

    cL = x - vec2(dx.x, 0.0);
    cR = x + vec2(dx.x, 0.0);
    cT = x + vec2(0.0, dx.y);
    cB = x - vec2(0.0, dx.y);
    
    gl_Position = vec4(aPosition, 0.0, 1.0);
}