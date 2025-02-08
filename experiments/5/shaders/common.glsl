#version 300 es

const float PI = 3.1415926535897932384626433832795028841971693994;
const int MAX_INSTANCES = 32;
const int MAX_POINT_LIGHTS = 8;

struct Instance {
    int used;
    mat4 transform;
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
uniform mat4 camera;
#define U_MATERIAL \
uniform Material material;
