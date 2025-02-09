const float PI = 3.1415926535897932384626433832795028841971693994;
in vec3 fPosition;
in vec3 fNormal;
in vec2 fUV;
uniform sampler2D uAlbedo;
uniform sampler2D uMetallicity;
uniform sampler2D uRoughness;
uniform sampler2D uEmission;
uniform vec3 uLightDirection;
uniform vec4 uLightColor;
out vec4 oColor;

void main() {
    vec4 albedo = texture(uAlbedo, fUV);
    vec4 metallicity = texture(uMetallicity, fUV);
    vec4 roughness = texture(uRoughness, fUV);
    vec4 emission = texture(uEmission, fUV);
    float lightAlignment =
        (1.0 - dot(fNormal, normalize(uLightDirection)))/2.0;
    vec3 light = mix(
        vec3(0.0), uLightColor.rgb,
        uLightColor.a*lightAlignment
    );
    vec3 metalLight =
        clamp((1.0 - cos(light*PI))/2.0, vec3(0.0), vec3(1.0));
    vec3 nonMetalLight =
        clamp(acos(vec3(1.0) - 2.0*light)/PI, vec3(0.0), vec3(1.0));
    light = mix(nonMetalLight, metalLight, metallicity.rgb*metallicity.a);
    vec3 product = albedo.rgb * light;
    vec3 sum = clamp(albedo.rgb + light, vec3(0.0), vec3(1.0));
    oColor = vec4(mix(
        mix(
            product,
            mix(sum, albedo.rgb, roughness.rgb*roughness.a),
            light
        ),
        emission.rgb,
        emission.a
    ), albedo.a);
}
