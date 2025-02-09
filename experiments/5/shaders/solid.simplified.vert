in vec4 vPosition;
in vec4 vNormal;
in vec2 vUV;
uniform mat4 uTransform;
uniform mat4 uNormalMatrix;
uniform mat4 uCamera;
out vec3 fPosition;
out vec3 fNormal;
out vec2 fUV;

void main() {
    vec4 position4 = uTransform*vPosition;
    gl_Position = uCamera*position4;
    fPosition = position4.xyz/position4.w;
    vec4 normal4 = uNormalMatrix*vNormal;
    fNormal = normalize(normal4.xyz/normal4.w);
    fUV = vUV;
}
