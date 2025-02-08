#version 300 es

const float PI = 3.1415926535897932384626433832795028841971693994;
const int MAX_INSTANCES = 32;
const int MAX_POINT_LIGHTS = 8;

struct Instance {
    int used;
    vec3 position;
    vec4 rotation;
    vec3 scale;
};
struct PointLight {
    int used;
    vec3 position;
    vec4 color;
};
struct GlobalLight {
    vec3 direction;
    vec4 color;
};
struct Camera {
    vec3 position;
    vec4 rotation;
};
struct Material {
    sampler2D albedo;
    sampler2D metallicity;
    sampler2D roughness;
    sampler2D emission;
};
#define U_INSTANCES \
uniform Instances { \
    Instance data[MAX_INSTANCES]; \
} instances;
#define U_POINT_LIGHTS \
uniform PointLights { \
    PointLight data[MAX_POINT_LIGHTS]; \
} pointLights;
#define U_GLOBAL_LIGHT \
uniform GlobalLight globalLight;
#define U_CAMERA \
uniform Camera camera;
#define U_MATERIAL \
uniform Material material;

mat4 makeRotationMatrix(vec4 q) {
    // Approach taken from
    // https://www.songho.ca/opengl/gl_quaternion.html
    q = normalize(q);
    return mat4(
        vec4(
            1.0 - 2.0*q.y*q.y - 2.0*q.z*q.z,
            2.0*q.x*q.y + 2.0*q.w*q.z,
            2.0*q.x*q.z - 2.0*q.w*q.y,
            0.0
        ),
        vec4(
            2.0*q.x*q.y - 2.0*q.w*q.z,
            1.0 - 2.0*q.x*q.x - 2.0*q.z*q.z,
            2.0*q.y*q.z + 2.0*q.w*q.x,
            0.0
        ),
        vec4(
            2.0*q.x*q.z + 2.0*q.w*q.y,
            2.0*q.y*q.z - 2.0*q.w*q.x,
            1.0 - 2.0*q.x*q.x - 2.0*q.y*q.y,
            0.0
        ),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
}

mat4 makeInverseRotationMatrix(vec4 q) {
    return makeRotationMatrix(vec4(-q.xyz, q.w));
}

mat4 makeDilationMatrix(vec3 s) {
    // Approach taken from
    // https://www.brainvoyager.com/bv/doc/UsersGuide/CoordsAndTransforms
    //      /SpatialTransformationMatrices.html
    return mat4(
        vec4(s.x, 0.0, 0.0, 0.0),
        vec4(0.0, s.y, 0.0, 0.0),
        vec4(0.0, 0.0, s.z, 0.0),
        vec4(0.0, 0.0, 0.0, 1.0)
    );
}

mat4 makeInverseDilationMatrix(vec3 s) {
    return makeDilationMatrix(1.0/s);
}

mat4 makeTranslationMatrix(vec3 p) {
    // Approach taken from
    // https://www.brainvoyager.com/bv/doc/UsersGuide/CoordsAndTransforms
    //      /SpatialTransformationMatrices.html
    return mat4(
        vec4(1.0, 0.0, 0.0, 0.0),
        vec4(0.0, 1.0, 0.0, 0.0),
        vec4(0.0, 0.0, 1.0, 0.0),
        vec4(p, 1.0)
    );
}

mat4 makeInverseTranslationMatrix(vec3 p) {
    return makeTranslationMatrix(-p);
}
