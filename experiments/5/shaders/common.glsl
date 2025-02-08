#version 300 es

const float PI = 3.1415926535897932384626433832795028841971693994;
const int MAX_INSTANCES = 32;
const int MAX_POINT_LIGHTS = 8;

#define U_INSTANCES \
uniform Instances { \
    int used[MAX_INSTANCES]; \
    mat4 transforms[MAX_INSTANCES]; \
    mat4 normalMatrices[MAX_INSTANCES]; \
} instances;
#define U_POINT_LIGHTS \
uniform PointLights { \
    int used[MAX_POINT_LIGHTS]; \
    vec3 positions[MAX_POINT_LIGHTS]; \
    vec4 colors[MAX_POINT_LIGHTS]; \
} pointLights;
#define U_GLOBAL_LIGHT \
uniform GlobalLight { \
    vec3 direction; \
    vec4 color; \
} globalLight;
#define U_CAMERA \
uniform mat4 camera;
#define U_MATERIAL \
uniform Material { \
    sampler2D albedo; \
    sampler2D metallicity; \
    sampler2D roughness; \
    sampler2D emission; \
} material;
