U_INSTANCES
U_CAMERA

in vec3 localPosition;
in vec3 localNormal;
out vec3 position;
out vec3 normal;
out int used;

void main() {
    if (instances.used[gl_InstanceID] != 0) {
        used = 1;
        vec4 position4 =
            instances.transforms[gl_InstanceID]*vec4(localPosition, 1.0);
        gl_Position = camera*position4;
        position = position4.xyz/position4.w;
        vec4 normal4 =
            instances.normalMatrices[gl_InstanceID]*vec4(localNormal, 1.0);
        normal = normalize(normal4.xyz/normal4.w);
    } else {
        used = 0;
        gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
