U_POINT_LIGHTS
U_GLOBAL_LIGHT
U_MATERIAL

in vec3 position;
in vec2 uv;
in vec3 normal;
flat in int used;
out vec4 color;

/* This shader is my own work. I developed it specifically
 * for this assignment. I call it the NIPBR: naive intuitionistic PBR.
 * (PBR means physically based rendering.)
 * I call it that because I developed it
 * without knowledge of or reference to the real-world behavior of light
 * or the usual implementation of a PBR,
 * and based everything just on how I personally think it should work.
 * I also sometimes just call it the ASS.
 * I've just now decided the backronym is "Another Shitty Shader,"
 * but at first it didn't stand for anything,
 * I just called it that because it looks like ASS. */

void main() {
    if (used != 0) {
        /* Here we lookup our texels.
         * Notice how we're using vec4 for everything --
         * for metallicity and roughness, not just albedo and emission.
         * My shader allows this not for realism, of course,
         * but because I see no good reason to bother preventing it
         * and it could be interesting.
         * Anyone who doesn't want that particular kind of "interesting"
         * (i.e. me most of the time probably)
         * can just use grayscale metallicity and roughness textures
         * like a normal person. */
        vec4 albedo = texture(material.albedo, uv);
        vec4 metallicity = texture(material.metallicity, uv);
        vec4 roughness = texture(material.roughness, uv);
        vec4 emission = texture(material.emission, uv);
        // Check how different the normal is from the direction of light
        float lightAlignment =
            (1.0 - dot(normal, normalize(globalLight.direction)))/2.0;
        // The more different they are, the more light is reflected
        vec3 light = mix(
            vec3(0.0), globalLight.color.rgb,
            globalLight.color.a*lightAlignment
        );
        // Apply each visible point light
        for (int i = 0; i < MAX_POINT_LIGHTS; i++) {
            if (pointLights.data[i].used != 0) {
                /* Check how different the normal is
                 * from the direction from the face to the point light */
                vec3 displacement = pointLights.data[i].position - position;
                lightAlignment =
                    (1.0 + dot(normal, normalize(displacement)))/2.0;
                /* The more similar they are, the more light is reflected,
                 * but also, the farther away the point light is,
                 * the less light is reflected */
                light = mix(
                    light, pointLights.data[i].color.rgb,
                    pointLights.data[i].color.a *
                        lightAlignment/(length(displacement) + 1.0)
                );
            }
        }
        /* This part is kind of bullshit (in that I made it up
         * based on my own personal opinions). By eyeballing various metals,
         * I decided things look *more* metallic when the brightness reflected
         * is *pushed away* from gray 50%, and *less* metallic
         * when the brightness reflected is *pulled toward* gray 50%.
         * Trig was the best way I could think of to build formulas
         * that have the characteristic of modifying how far the input is
         * from the domain midpoint. */
        vec3 metalLight =
            clamp((1.0 - cos(light*PI))/2.0, vec3(0.0), vec3(1.0));
        vec3 nonMetalLight =
            clamp(acos(vec3(1.0) - 2.0*light)/PI, vec3(0.0), vec3(1.0));
        light = mix(nonMetalLight, metalLight, metallicity.rgb*metallicity.a);
        /* This part is also kind of bullshit (in that I made it all up).
         * I was thinking of how things look in various lighting conditions.
         * In total darkness, a surface is black.
         * If the surface is illuminated as brightly as possible, it's white.
         * When the surface is lit normally, it reflects a color
         * blended in some way between the color it "is"
         * and the color of the light illuminating it.
         * So I want a function that interpolates between three points:
         * a dark-as-possible floor, some manner of blending
         * the surface's albedo color with the color of light,
         * and a light-as-possible ceiling --
         * and I want the interpolation weight to have to do
         * with the intensity of the light.
         * I know from past study that the product of two colors
         * is a color "between" them except in the sense of brightness,
         * in which sense it is at least as dark as the darker of the two,
         * and the sum of two colors is a color "between" them
         * except in the sense of brightness, in which sense
         * it is at least as light as the lighter of the two.
         * The product of any color with black is black,
         * and the sum of any color with white is white.
         * It's also intuitively obvious that if we interpolate
         * between this product and this sum,
         * rather than simply between black and white,
         * then, since we are interpolating between two ways
         * of blending the albedo color with the color of light,
         * our midpoint will also be some way
         * of blending the albedo color with the color of light,
         * rather than necessarily just gray.
         * It will still just be gray
         * if albedo times light equals black
         * and albedo plus light equals white,
         * but the only way that would ever happen
         * is if we had nearly-white albedo
         * and nearly-black light at medium intensity.
         * Yes, my approach theoretically allows for black / dark light
         * / generally "light" that actually darkens objects
         * which it illuminates. Yes, it's silly. Moving on:
         * The point is that you could still get it to be grayscale,
         * but you'd have to be doing it on purpose. */
        vec3 product = albedo.rgb * light;
        vec3 sum = clamp(albedo.rgb + light, vec3(0.0), vec3(1.0));
        color = vec4(mix(
            mix(
                product,
                /* If Blender has taught me anything about "roughness,"
                 * it's pretty much when a material doesn't have uwu sparkles.
                 * In terms of our off-the-wall color math we're using,
                 * my intuition tells me this should be equivalent
                 * to lowering our brightness ceiling
                 * from the color of an uwu sparkle (the sum)
                 * down toward the basal color of the object itself
                 * (the albedo). */
                mix(sum, albedo.rgb, roughness.rgb*roughness.a),
                light
            ),
            /* Blender has also taught me
             * that if you crank a material's emission up all the way,
             * the whole thing just looks like your emission color, flat,
             * rather than being shaded at all.
             * So, in terms of our color math,
             * that means we want to implement emission
             * by interpolating toward the emission color
             * close to the end of the process,
             * so it can override almost everything else we do. */
            emission.rgb,
            emission.a
        ), albedo.a); // And then of course the very last thing is alpha.
    } else {
        discard;
    }
}
