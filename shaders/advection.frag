#version 300 es

precision highp float;
precision highp sampler2D;

in vec2 x;
in vec2 cL;
in vec2 cR;
in vec2 cT;
in vec2 cB;

uniform sampler2D u;
uniform vec2 dx;
uniform float dt;
uniform float ux;
uniform float aspectRatio;
uniform bool karman;

out vec4 uNew;

void main(){    
    vec2 xNew = x - dt * texture(u, x).xy * dx;
    uNew.xyz = texture(u, xNew).xyz; 

    // BC
    if(cL.x < 0.0 || cR.x > 1.0) uNew.xy = vec2(ux, 0.0);
    if(cT.y > 1.0 || cB.y < 0.0) uNew.xy = vec2(ux, 0.0);

    if(karman){
        // Karman vortex street cylinder
        vec2 cyl = vec2(0.25 * aspectRatio, 0.5);
        vec2 xC  = vec2(x.x * aspectRatio, x.y);    

        if(length(xC - cyl) < 0.04) uNew.xyz = vec3(0.0);
    }
    else{
        if(x.x>=0.3 && x.x<=0.7 && x.y>=0.35 && x.y<=0.65) uNew.xyz = vec3(0.0);
    }

    // add dye as streamlines
    if(x.x <= dx.x){
        if(cos((x.y - 0.5) * 90.) > 0.5) uNew.z = 1.0;            
    }

    // dissipate dye
    uNew.z /= 1.0005;
}
