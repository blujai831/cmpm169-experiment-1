U_INSTANCES
U_CAMERA

in vec3 localPosition;
in vec3 localNormal;
out vec3 position;
out vec3 normal;
out int used;

void main() {
    if (instances.data[gl_InstanceID].used != 0) {
        used = 1;
        mat4 modelMatrix =
            makeTranslationMatrix(instances.data[gl_InstanceID].position) *
            makeRotationMatrix(instances.data[gl_InstanceID].rotation) *
            makeDilationMatrix(instances.data[gl_InstanceID].scale);
        mat4 normalMatrix =
            makeInverseDilationMatrix(instances.data[gl_InstanceID].scale) *
            makeInverseRotationMatrix(instances.data[gl_InstanceID].rotation);
        mat4 cameraMatrix =
            makeTranslationMatrix(camera.position) *
            makeRotationMatrix(camera.rotation);
        vec4 position4 = modelMatrix*vec4(localPosition, 1.0);
        gl_Position = cameraMatrix*position4;
        position = position4.xyz/position4.w;
        vec4 normal4 = normalMatrix*vec4(localNormal, 1.0);
        normal = normalize(normal4.xyz/normal4.w);
    } else {
        used = 0;
        gl_Position = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
