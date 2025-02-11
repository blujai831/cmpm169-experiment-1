const DEBUG = true;
const DEBUG_GL = false;

const E5 = {};

if (DEBUG) {

    /* The engine doesn't actually use any of these functions.
    * I used them to generate closed forms for transform matrices,
    * which could then be simplified using the application xmaxima,
    * before finally using the simplified closed-form expressions inline
    * in place of runtime matrix-by-matrix multiplication. */

    E5.makeMatrixMultiplicationExpression = function (a, b, ...rest) {
        if (rest.length > 0) {
            return E5.makeMatrixMultiplicationExpression(
                a,
                E5.makeMatrixMultiplicationExpression(
                    b, ...rest
                )
            );
        } else {
            if (
                a.length <= 0 || a[0].length <= 0 ||
                b.length <= 0 || b[0].length <= 0
            ) {
                return [];
            }
            const m = a[0].length;
            const n = a.length;
            const p = b.length;
            const c = [];
            for (let j = 0; j < p; j++) {
                c[j] = [];
                for (let i = 0; i < m; i++) {
                    c[j][i] = [];
                    for (let k = 0; k < n; k++) {
                        c[j][i].push(`(${a[k][i]})*(${b[j][k]})`);
                    }
                    c[j][i] = c[j][i].join(" + ");
                }
            }
            return c;
        }
    };

    E5.makeQuaternionMatrixExpression = q => [
        /* Approach taken from
         * https://www.songho.ca/opengl/gl_quaternion.html */
        [`1 - 2*(${q}_2)^2 - 2*(${q}_3)^2`,
         `2*(${q}_1)*(${q}_2) + 2*(${q}_4)*(${q}_3)`,
         `2*(${q}_1)*(${q}_3) - 2*(${q}_4)*(${q}_2)`,
         `0`],
        [`2*(${q}_1)*(${q}_2) - 2*(${q}_4)*(${q}_3)`,
         `1 - 2*(${q}_1)^2 - 2*(${q}_3)^2`,
         `2*(${q}_2)*(${q}_3) + 2*(${q}_4)*(${q}_1)`,
         `0`],
        [`2*(${q}_1)*(${q}_3) + 2*(${q}_4)*(${q}_2)`,
         `2*(${q}_2)*(${q}_3) - 2*(${q}_4)*(${q}_1)`,
         `1 - 2*(${q}_1)^2 - 2*(${q}_2)^2`,
         `0`],
        [`0`, `0`, `0`, `1`]
    ];

    E5.makeInverseQuaternionMatrixExpression = q => [
        /* Calculated algebraically from above,
         * in combination with the fact
         * that a quaternion's rotational inverse is its conjugate */
        [`1 - 2*(${q}_2)^2 - 2*(${q}_3)^2`,
         `2*(${q}_1)*(${q}_2) - 2*(${q}_4)*(${q}_3)`,
         `2*(${q}_1)*(${q}_3) + 2*(${q}_4)*(${q}_2)`,
         `0`],
        [`2*(${q}_1)*(${q}_2) + 2*(${q}_4)*(${q}_3)`,
         `1 - 2*(${q}_1)^2 - 2*(${q}_3)^2`,
         `2*(${q}_2)*(${q}_3) - 2*(${q}_4)*(${q}_1)`,
         `0`],
        [`2*(${q}_1)*(${q}_3) - 2*(${q}_4)*(${q}_2)`,
         `2*(${q}_2)*(${q}_3) + 2*(${q}_4)*(${q}_1)`,
         `1 - 2*(${q}_1)^2 - 2*(${q}_2)^2`,
         `0`],
        [`0`, `0`, `0`, `1`]
    ];

    E5.makeDilationMatrixExpression = d => [
        [`(${d}_1)`, `0`, `0`, `0`],
        [`0`, `(${d}_2)`, `0`, `0`],
        [`0`, `0`, `(${d}_3)`, `0`],
        [`0`, `0`, `0`, `1`]
    ];

    E5.makeInverseDilationMatrixExpression = d => [
        [`1/(${d}_1)`, `0`, `0`, `0`],
        [`0`, `1/(${d}_2)`, `0`, `0`],
        [`0`, `0`, `1/(${d}_3)`, `0`],
        [`0`, `0`, `0`, `1`]
    ];

    E5.makeTranslationMatrixExpression = t => [
        [`1`, `0`, `0`, `0`],
        [`0`, `1`, `0`, `0`],
        [`0`, `0`, `1`, `0`],
        [`(${t}_1)`, `(${t}_2)`, `(${t}_3)`, `1`]
    ];

    E5.makeInverseTranslationMatrixExpression = t => [
        [`1`, `0`, `0`, `0`],
        [`0`, `1`, `0`, `0`],
        [`0`, `0`, `1`, `0`],
        [`-(${t}_1)`, `-(${t}_2)`, `-(${t}_3)`, `1`]
    ];

    E5.makeTransformMatrixExpression = (t, q, d) =>
        E5.makeMatrixMultiplicationExpression(
            E5.makeTranslationMatrixExpression(t),
            E5.makeQuaternionMatrixExpression(q),
            E5.makeDilationMatrixExpression(d)
        );

    E5.makeNormalMatrixExpression = (t, q, d) => E5.transpose4x4(
        E5.makeMatrixMultiplicationExpression(
            E5.makeInverseDilationMatrixExpression(d),
            E5.makeInverseQuaternionMatrixExpression(q),
            E5.makeInverseTranslationMatrixExpression(t)
        )
    );

    E5.makePerspectiveMatrixExpression = (n, f, v, a) => [
        // const fov = Math.PI/4;
        // const aspect = E5.canvas.width/E5.canvas.height;
        // const zNear = 0.1;
        // const zFar = 100.0;
        // const f = 1/Math.tan(fov/2);
        // const nf = 1/(zNear - zFar);
        // return new Float32Array([
        //     f/aspect, 0, 0, 0,
        //     0, f, 0, 0,
        //     0, 0, (zFar + zNear)*nf, -1,
        //     0, 0, 2*zFar*zNear*nf, 0
        // ])
        [`1/(${a}*tan(${v}/2))`, `0`, `0`, `0`],
        [`0`, `1/tan(${v}/2)`, `0`, `0`],
        [`0`, `0`, `(${n} + ${f})/(${n} - ${f})`, `-1`],
        [`0`, `0`, `2*${n}*${f}/(${n} - ${f})`, `0`]
    ];

    E5.makeCameraMatrixExpression = (t, q, n, f, v, a) =>
        E5.makeMatrixMultiplicationExpression(
            E5.makePerspectiveMatrixExpression(n, f, v, a),
            E5.makeTranslationMatrixExpression(t),
            E5.makeQuaternionMatrixExpression(q)
        );

    E5.transpose4x4 = m =>
        [[m[0][0], m[1][0], m[2][0], m[3][0]],
         [m[0][1], m[1][1], m[2][1], m[3][1]],
         [m[0][2], m[1][2], m[2][2], m[3][2]],
         [m[0][3], m[1][3], m[2][3], m[3][3]]];

}

/* All uses of WebGL2 API calls in this script will have been adapted from
 * https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial */
E5.canvas = document.querySelector("#e5-canvas");
E5.gl = E5.canvas.getContext("webgl2");
if (!E5.gl) throw new Error("Browser does not support WebGL2");
if (DEBUG_GL) {
    E5.gl = new Proxy(E5.gl, {
        get(target, prop, receiver) {
            if (typeof(target[prop]) == "function") {
                return function (...args) {
                    console.log(prop, ...args);
                    const result = target[prop](...args);
                    const err = target.getError();
                    if (err == 0) {
                        return result;
                    } else {
                        throw new Error(`GL error ${err}`);
                    }
                }
            } else {
                return target[prop];
            }
        }
    });
}

E5.fetch = async function (url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
    return response;
};

E5.fetch.text = async function (url) {
    if (E5.fetch.text.cache[url]) return E5.fetch.text.cache[url];
    const result = await (await E5.fetch(url)).text();
    E5.fetch.text.cache[url] = result;
    return result;
};
E5.fetch.text.cache = {};

E5.fetch.json = async function (url) {
    if (E5.fetch.json.cache[url]) return E5.fetch.json.cache[url];
    const result = await (await E5.fetch(url)).json();
    E5.fetch.json.cache[url] = result;
    return result;
};
E5.fetch.text.cache = {};

E5.fetch.image = async function (url) {
    if (E5.fetch.image.cache[url]) return E5.fetch.image.cache[url];
    const image = new Image();
    image.src = url;
    await new Promise((resolve, reject) => {
        image.addEventListener("load", resolve);
        image.addEventListener("error", reject);
    });
    E5.fetch.image.cache[url] = image;
    return image;
};
E5.fetch.image.cache = {};

E5.fetch.audio = async function (url) {
    if (E5.fetch.audio.cache[url]) return E5.fetch.audio.cache[url];
    const audio = new Audio();
    audio.src = url;
    await new Promise((resolve, reject) => {
        audio.addEventListener("load", resolve);
        audio.addEventListener("error", reject);
    });
    E5.fetch.audio.cache[url] = audio;
    return audio;
};
E5.fetch.audio.cache = {};

E5.Vector3 = class {
    constructor(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }
    static clone(v) {
        return new E5.Vector3(v.x, v.y, v.z);
    }
    clone() {
        return E5.Vector3.clone(this);
    }
    static length(v) {
        return Math.sqrt(v.dot(v));
    }
    get length() {
        return E5.Vector3.length(this);
    }
    static normalize(v) {
        const m = v.length;
        return new E5.Vector3(v.x/m, v.y/m, v.z/m);
    }
    get normalized() {
        return E5.Vector3.normalize(this);
    }
    static negative(v) {
        return new E5.Vector3(-v.x, -v.y, -v.z);
    }
    get negative() {
        return E5.Vector3.negative(this);
    }
    static reciprocal(v) {
        return new E5.Vector3(1/v.x, 1/v.y, 1/v.z);
    }
    get reciprocal() {
        return E5.Vector3.reciprocal(this);
    }
    static add(v, u, ...rest) {
        if (rest.length > 0) {
            return E5.Vector3.add(E5.Vector3.add(v, u), ...rest);
        } else {
            return new E5.Vector3(v.x + u.x, v.y + u.y, v.z + u.z);
        }
    }
    add(...args) {
        return E5.Vector3.add(this, ...args);
    }
    static sub(v, u, ...rest) {
        if (rest.length > 0) {
            return E5.Vector3.sub(E5.Vector3.sub(v, u), ...rest);
        } else {
            return v.add(u.negative);
        }
    }
    sub(...args) {
        return E5.Vector3.sub(this, ...args);
    }
    static mul(n, ...rest) {
        if (rest.length <= 0) {
            return n;
        } else if (rest.length == 1) {
            const v = rest[0];
            return new E5.Vector3(n*v.x, n*v.y, n*v.z);
        } else {
            return E5.Vector3.mul(n, E5.Vector3.mul(...rest));
        }
    }
    mul(...args) {
        return E5.Vector3.mul(...args, this);
    }
    static dot(v, u) {
        return v.x*u.x + v.y*u.y + v.z*u.z;
    }
    dot(other) {
        return E5.Vector3.dot(this, other);
    }
    static cross(v, u) {
        return new E5.Vector3(
            v.y*u.z - v.z*u.y,
            v.z*u.x - v.x*u.z,
            v.x*u.y - v.y*u.x
        );
    }
    cross(other) {
        return E5.Vector3.cross(this, other);
    }
    static project(v, u) {
        u = u.normalized;
        return u.mul(v.dot(u));
    }
    project(other) {
        return E5.Vector3.project(this, other);
    }
    static reject(v, u) {
        return v.sub(v.project(u));
    }
    reject(other) {
        return E5.Vector3.reject(this, other);
    }
    static rotate(v, q) {
        /* Approach borrowed from Sir Nate and Laurent Couvidou,
         * found at https://gamedev.stackexchange.com/questions/28395
         *      /rotating-vector3-by-a-quaternion */
        const u = new E5.Vector3(q.x, q.y, q.z);
        const dot = u.dot(v);
        const cross = u.cross(v);
        return u.mul(2*dot).add(v.mul(q.w*q.w - dot), cross.mul(2*q.w));
    }
    rotate(q) {
        return E5.Vector3.rotate(this, q);
    }
    static scale(v, u) {
        return new E5.Vector3(v.x*u.x, v.y*u.y, v.z*u.z);
    }
    scale(other) {
        return E5.Vector3.scale(this, other);
    }
    static angle(v, u) {
        return Math.acos(v.dot(u)/(v.length*u.length));
    }
    angle(other) {
        return E5.Vector3.angle(this, other);
    }
    static get up() {
        return new E5.Vector3(0, 1, 0);
    }
    static get down() {
        return new E5.Vector3(0, -1, 0);
    }
    static get left() {
        return new E5.Vector3(-1, 0, 0);
    }
    static get right() {
        return new E5.Vector3(1, 0, 0);
    }
    static get forward() {
        return new E5.Vector3(0, 0, -1);
    }
    static get backward() {
        return new E5.Vector3(0, 0, 1);
    }
    static get zero() {
        return new E5.Vector3(0, 0, 0);
    }
    static get one() {
        return new E5.Vector3(1, 1, 1);
    }
};

E5.Quaternion = class {
    constructor(x, y, z, w) {
        x ||= 0;
        y ||= 0;
        z ||= 0;
        w ||= 1;
        const m = Math.sqrt(x*x + y*y + z*z + w*w);
        this.x = x/m;
        this.y = y/m;
        this.z = z/m;
        this.w = w/m;
    }
    static clone(q) {
        return new E5.Quaternion(q.x, q.y, q.z, q.w);
    }
    clone() {
        return E5.Quaternion.clone(this);
    }
    static mul(q, p, ...rest) {
        if (rest.length > 0) {
            return E5.Quaternion.mul(E5.Quaternion.mul(q, p), ...rest);
        } else {
            return new E5.Quaternion(
                q.w*p.x + q.x*p.w + q.y*p.z - q.z*p.y,
                q.w*p.y - q.x*p.z + q.y*p.w + q.z*p.x,
                q.w*p.z + q.x*p.y - q.y*p.x + q.z*p.w,
                q.w*p.w - q.x*p.x - q.y*p.y - q.z*p.z
            );
        }
    }
    mul(...args) {
        return E5.Quaternion.mul(this, ...args);
    }
    static inverse(q) {
        return new E5.Quaternion(-q.x, -q.y, -q.z, q.w);
    }
    get inverse() {
        return E5.Quaternion.inverse(this);
    }
    static fromAngleAxis(angle, axis) {
        return new E5.Quaternion(
            Math.sin(angle/2)*Math.cos(axis.angle(E5.Vector3.right)),
            Math.sin(angle/2)*Math.cos(axis.angle(E5.Vector3.up)),
            Math.sin(angle/2)*Math.cos(axis.angle(E5.Vector3.forward)),
            Math.cos(angle/2)
        );
    }
    static toAngleAxis(q) {
        const denom = Math.sqrt(1 - q.w*q.w);
        if (denom == 0) {
            return {
                angle: 0,
                axis: E5.Vector3.zero
            };
        } else {
            return {
                angle: 2*Math.acos(q.w),
                axis: new E5.Vector3(
                    q.x/denom,
                    q.y/denom,
                    q.z/denom
                )
            };
        }
    }
    toAngleAxis() {
        return E5.Quaternion.toAngleAxis(this);
    }
    get angleAxis() {
        return this.toAngleAxis();
    }
    static get identity() {
        return new E5.Quaternion();
    }
};

E5.Transform = class {
    constructor() {
        this._position = new E5.Vector3();
        this._rotation = new E5.Quaternion();
        this._scale = new E5.Vector3(1, 1, 1);
        this.matrix = new Float32Array(16);
        this.normalMatrix = new Float32Array(16);
        this.updateMatrices();
    }
    get position() {return Object.freeze(this._position.clone());}
    get rotation() {return Object.freeze(this._rotation.clone());}
    get size() {return Object.freeze(this._scale.clone());}
    set position(t) {
        this._position = E5.Vector3.clone(t);
        this.updateMatrices();
    }
    set rotation(q) {
        this._rotation = E5.Quaternion.clone(q);
        this.updateMatrices();
    }
    set size(d) {
        this._scale = E5.Vector3.clone(d);
        this.updateMatrices();
    }
    updateMatrices() {
        const t = this.position;
        const q = this.rotation;
        const d = this.size;
        // Simplified with xmaxima from makeTransformMatrixExpression
        this.matrix[0] = d.x*(1 - 2*q.y*q.y - 2*q.z*q.z);
        this.matrix[1] = d.x*(2*q.x*q.y + 2*q.z*q.w);
        this.matrix[2] = d.x*(2*q.x*q.z - 2*q.y*q.w);
        this.matrix[3] = 0;
        this.matrix[4] = d.y*(2*q.x*q.y - 2*q.z*q.w);
        this.matrix[5] = d.y*(1 - 2*q.x*q.x - 2*q.z*q.z);
        this.matrix[6] = d.y*(2*q.x*q.w + 2*q.y*q.z);
        this.matrix[7] = 0;
        this.matrix[8] = d.z*(2*q.x*q.z + 2*q.y*q.w);
        this.matrix[9] = d.z*(2*q.y*q.z - 2*q.x*q.w);
        this.matrix[10] = d.z*(1 - 2*q.x*q.x - 2*q.y*q.y);
        this.matrix[11] = 0;
        this.matrix[12] = t.x;
        this.matrix[13] = t.y;
        this.matrix[14] = t.z;
        this.matrix[15] = 1;
        // Simplified with xmaxima from makeNormalMatrixExpression
        this.normalMatrix[0] = (1 - 2*q.y*q.y - 2*q.z*q.z)/d.x;
        this.normalMatrix[1] = (2*q.x*q.y + 2*q.z*q.w)/d.x;
        this.normalMatrix[2] = (2*q.x*q.z - 2*q.y*q.w)/d.x;
        this.normalMatrix[3] =
            ((2*q.y*q.y + 2*q.z*q.z - 1)*t.x -
             (2*q.x*q.y + 2*q.z*q.w)*t.y +
             (2*q.y*q.w - 2*q.x*q.z)*t.z)/d.x;
        this.normalMatrix[4] = (2*q.x*q.y - 2*q.z*q.w)/d.y;
        this.normalMatrix[5] = (1 - 2*q.x*q.x - 2*q.z*q.z)/d.y;
        this.normalMatrix[6] = (2*q.x*q.w + 2*q.y*q.z)/d.y;
        this.normalMatrix[7] =
            ((2*q.z*q.w - 2*q.x*q.y)*t.x -
             (1 - 2*q.x*q.x - 2*q.z*q.z)*t.y -
             (2*q.x*q.w + 2*q.y*q.z)*t.z)/d.y;
        this.normalMatrix[8] = (2*q.x*q.z + 2*q.y*q.w)/d.z;
        this.normalMatrix[9] = (2*q.y*q.z - 2*q.x*q.w)/d.z;
        this.normalMatrix[10] = (1 - 2*q.x*q.x - 2*q.y*q.y)/d.z;
        this.normalMatrix[11] =
            ((2*q.x*q.w - 2*q.y*q.z)*t.y -
             (1 - 2*q.x*q.x - 2*q.y*q.y)*t.z -
             (2*q.x*q.z + 2*q.y*q.w)*t.x)/d.z;
        this.normalMatrix[12] = 0;
        this.normalMatrix[13] = 0;
        this.normalMatrix[14] = 0;
        this.normalMatrix[15] = 1;
    }
    localToWorld(vec) {
        return vec.
            scale(this.size).
            rotate(this.rotation).
            add(this.position);
    }
    worldToLocal(vec) {
        return vec.
            sub(this.position).
            rotate(this.rotation.inverse).
            scale(this.size.reciprocal);
    }
    static get identity() {
        return new E5.Transform();
    }
    translate(v) {
        this.position = this.position.add(v);
    }
    rotate(q) {
        this.rotation = q.mul(this.rotation);
    }
    scale(v) {
        this.size = this.size.scale(v);
    }
};

E5.Camera = class {
    constructor() {
        this._position = new E5.Vector3();
        this._rotation = new E5.Quaternion();
        this._fov = Math.PI/4;
        this._aspect = E5.canvas.width/E5.canvas.height;
        this._near = 0.1;
        this._far = 100;
        this.matrix = new Float32Array(16);
        this.updateMatrix();
    }
    get position() {return Object.freeze(this._position.clone());}
    get rotation() {return Object.freeze(this._rotation.clone());}
    get fov() {return this._fov;}
    get aspect() {return this._aspect;}
    get near() {return this._near;}
    get far() {return this._far;}
    set position(t) {
        this._position = E5.Vector3.clone(t);
        this.updateMatrix();
    }
    set rotation(q) {
        this._rotation = E5.Quaternion.clone(q);
        this.updateMatrix();
    }
    set fov(fov) {
        this._fov = fov;
        this.updateMatrix();
    }
    set aspect(aspect) {
        this._aspect = aspect;
        this.updateMatrix();
    }
    set near(near) {
        this._near = near;
        this.updateMatrix();
    }
    set far(far) {
        this._far = far;
        this.updateMatrix();
    }
    updateMatrix() {
        const t = this.position.negative;
        const q = this.rotation.inverse;
        const v = this.fov;
        const a = this.aspect;
        const n = this.near;
        const f = this.far;
        // Simplified with xmaxima from makeCameraMatrixExpression
        this.matrix[0] = (1 - 2*q.y*q.y - 2*q.z*q.z)/(a*Math.tan(v/2));
        this.matrix[1] = (2*q.x*q.y + 2*q.z*q.w)/Math.tan(v/2);
        this.matrix[2] = (n + f)*(2*q.x*q.z - 2*q.y*q.w)/(n - f);
        this.matrix[3] = 2*q.y*q.w - 2*q.x*q.z;
        this.matrix[4] = (2*q.x*q.y - 2*q.z*q.w)/(a*Math.tan(v/2));
        this.matrix[5] = (1 - 2*q.x*q.x - 2*q.z*q.z)/Math.tan(v/2);
        this.matrix[6] = (n + f)*(2*q.x*q.w + 2*q.y*q.z)/(n - f);
        this.matrix[7] = -2*q.x*q.w - 2*q.y*q.z;
        this.matrix[8] = (2*q.x*q.z + 2*q.y*q.w)/(a*Math.tan(v/2));
        this.matrix[9] = (2*q.x*q.w - 2*q.y*q.z)/Math.tan(v/2);
        this.matrix[10] = (n + f)*(1 - 2*q.x*q.x - 2*q.y*q.y)/(n - f);
        this.matrix[11] = 2*q.x*q.x + 2*q.y*q.y - 1;
        this.matrix[12] = t.x/(a*Math.tan(v/2));
        this.matrix[13] = t.y/Math.tan(v/2);
        this.matrix[14] = (2*n*f + (n + f)*t.z)/(n - f);
        this.matrix[15] = -t.z;
    }
    translate(v) {
        this.position = this.position.add(v);
    }
    rotate(q) {
        this.rotation = q.mul(this.rotation);
    }
};

E5.constructAsync = async (klass, asyncConstructor) => {
    // We are about to commit some sins.
    const self = Object.setPrototypeOf({}, klass.prototype);
    await asyncConstructor.call(self);
    return self;
};

E5.Texture = class {
    constructor(url) {
        if (E5.Texture.cache[url]) return E5.Texture.cache[url];
        return E5.constructAsync(E5.Texture, async function () {
            this.image = await E5.fetch.image(url);
            const level = 0;
            const internalFormat = E5.gl.RGBA;
            const srcFormat = E5.gl.RGBA;
            const srcType = E5.gl.UNSIGNED_BYTE;
            this.glObject = E5.gl.createTexture();
            E5.gl.bindTexture(E5.gl.TEXTURE_2D, this.glObject);
            E5.gl.pixelStorei(E5.gl.UNPACK_FLIP_Y_WEBGL, true);
            E5.gl.texImage2D(
                E5.gl.TEXTURE_2D,
                level,
                internalFormat,
                srcFormat,
                srcType,
                this.image
            );
            E5.gl.generateMipmap(E5.gl.TEXTURE_2D);
            E5.Texture.cache[url] = this;
        });
    }
    bindToIndex(i) {
        E5.gl.activeTexture(E5.gl[`TEXTURE${i}`]);
        E5.gl.bindTexture(E5.gl.TEXTURE_2D, this.glObject);
    }
    useForUniform(program, uniform, i) {
        this.bindToIndex(i);
        E5.gl.uniform1i(program.uniforms[uniform], i);
    }
};
E5.Texture.cache = {};

E5.ShaderBuffer = class {
    constructor(bufferType, dataType, mode, data) {
        if (bufferType == "elements") {
            bufferType = "element_array";
            data = mode;
            mode = dataType;
            dataType = "element";
        }
        bufferType = `${bufferType.toUpperCase()}_BUFFER`;
        this.bufferType = E5.gl[bufferType];
        this.glslType = dataType;
        this.drawMode = E5.gl[`${mode.toUpperCase()}_DRAW`];
        switch (dataType) {
            case "int":
                this.pitch = 1;
                this.glType = E5.gl.INT;
                this.jsArrayType = Int32Array;
                break;
            case "uint":
                this.pitch = 1;
                this.glType = E5.gl.UNSIGNED_INT;
                this.jsArrayType = Uint32Array;
                break;
            case "float":
                this.pitch = 1;
                this.glType = E5.gl.FLOAT;
                this.jsArrayType = Float32Array;
                break;
            case "ivec2":
                this.pitch = 2;
                this.glType = E5.gl.INT;
                this.jsArrayType = Int32Array;
                break;
            case "ivec3":
                this.pitch = 3;
                this.glType = E5.gl.INT;
                this.jsArrayType = Int32Array;
                break;
            case "ivec4":
                this.pitch = 4;
                this.glType = E5.gl.INT;
                this.jsArrayType = Int32Array;
                break;
            case "uvec2":
                this.pitch = 2;
                this.glType = E5.gl.UNSIGNED_INT;
                this.jsArrayType = Uint32Array;
                break;
            case "uvec3":
                this.pitch = 3;
                this.glType = E5.gl.UNSIGNED_INT;
                this.jsArrayType = Uint32Array;
                break;
            case "uvec4":
                this.pitch = 4;
                this.glType = E5.gl.UNSIGNED_INT;
                this.jsArrayType = Uint32Array;
                break;
            case "vec2":
                this.pitch = 2;
                this.glType = E5.gl.FLOAT;
                this.jsArrayType = Float32Array;
                break;
            case "vec3":
                this.pitch = 3;
                this.glType = E5.gl.FLOAT;
                this.jsArrayType = Float32Array;
                break;
            case "vec4":
                this.pitch = 4;
                this.glType = E5.gl.FLOAT;
                this.jsArrayType = Float32Array;
                break;
            case "element":
                this.jsArrayType = Uint16Array;
                break;
            default:
                throw new Error(
                    `Unsupported GLSL type for ShaderBuffer: ${dataType}`
                );
        }
        this.glObject = E5.gl.createBuffer();
        this.bind();
        E5.gl.bufferData(
            this.bufferType,
            new (this.jsArrayType)(data),
            this.drawMode
        );
        this.size = data.length;
    }
    update(offset, data) {
        this.bind();
        E5.gl.bufferSubData(
            this.bufferType,
            offset,
            new (this.jsArrayType)(data)
        );
    }
    bind() {
        E5.gl.bindBuffer(this.bufferType, this.glObject);
    }
    useForAttrib(
        program, attrib,
        normalize = false,
        stride = 0,
        offset = 0
    ) {
        this.bind();
        E5.gl.vertexAttribPointer(
            program.attribs[attrib],
            this.pitch, this.glType,
            normalize, stride, offset
        );
        E5.gl.enableVertexAttribArray(program.attribs[attrib]);
    }
};

E5.ShaderProgram = class {
    constructor(options) {
        return E5.constructAsync(E5.ShaderProgram, async function () {
            this.glObject = E5.ShaderProgram.Progs[
                options.vertURL + " " + options.fragURL
            ];
            if (!this.glObject) {
                let vert = E5.ShaderProgram.Verts[options.vertURL];
                let frag = E5.ShaderProgram.Frags[options.fragURL];
                if (!vert || !frag) {
                    let commonSrc =
                        "#version 300 es\nprecision highp float;\n\n";
                    if (options.commonURLs) {
                        for (const url of options.commonURLs) {
                            commonSrc += await E5.fetch.text(url) + "\n";
                        }
                    }
                    const vertSrc = commonSrc +
                        await E5.fetch.text(options.vertURL);
                    const fragSrc = commonSrc +
                        await E5.fetch.text(options.fragURL);
                    vert = E5.gl.createShader(E5.gl.VERTEX_SHADER);
                    E5.gl.shaderSource(vert, vertSrc);
                    E5.gl.compileShader(vert);
                    if (!E5.gl.getShaderParameter(
                        vert, E5.gl.COMPILE_STATUS
                    )) {
                        const error = new Error(E5.gl.getShaderInfoLog(vert));
                        E5.gl.deleteShader(vert);
                        throw error;
                    }
                    frag = E5.gl.createShader(E5.gl.FRAGMENT_SHADER);
                    E5.gl.shaderSource(frag, fragSrc);
                    E5.gl.compileShader(frag);
                    if (!E5.gl.getShaderParameter(
                        frag, E5.gl.COMPILE_STATUS
                    )) {
                        const error = new Error(E5.gl.getShaderInfoLog(frag));
                        E5.gl.deleteShader(vert);
                        E5.gl.deleteShader(frag);
                        throw error;
                    }
                    E5.ShaderProgram.Verts[options.vertURL] = vert;
                    E5.ShaderProgram.Frags[options.fragURL] = frag;
                }
                this.glObject = E5.gl.createProgram();
                E5.gl.attachShader(this.glObject, vert);
                E5.gl.attachShader(this.glObject, frag);
                E5.gl.linkProgram(this.glObject);
                if (!E5.gl.getProgramParameter(
                    this.glObject, E5.gl.LINK_STATUS
                )) {
                    throw new Error(E5.gl.getProgramInfoLog(this.glObject));
                }
                E5.ShaderProgram.Progs[
                    options.vertURL + " " + options.fragURL
                ] = this.glObject;
            }
            this.attribs = {};
            for (const attrib of options.attribs) {
                this.attribs[attrib] =
                    E5.gl.getAttribLocation(this.glObject, attrib);
            }
            this.uniforms = {};
            for (const uniform of options.uniforms) {
                this.uniforms[uniform] =
                    E5.gl.getUniformLocation(this.glObject, uniform);
            }
            this.variableValues = {};
        });
    }
    use() {
        E5.gl.useProgram(this.glObject);
        for (const key of Object.keys(this.variableValues)) {
            const value = this.variableValues[key];
            if (value.type == "elements") {
                const buf = value.values[0];
                this.use.elements.call(this, buf);
                this.vertexCount = buf.size;
            } else {
                this.use[value.type].call(this, key, ...value.values);
            }
        }
    }
    useAttrib(attrib, buf, ...args) {
        buf.useForAttrib(this, attrib, ...args);
    }
    useElements(buf) {
        buf.bind();
    }
    useTexture(uniform, tex, ...args) {
        tex.useForUniform(this, uniform, ...args);
    }
    useInt(uniform, i) {
        E5.gl.uniform1i(this.uniforms[uniform], i);
    }
    useFloat(uniform, f) {
        E5.gl.uniform1f(this.uniforms[uniform], f);
    }
    useIVec2(uniform, x, y) {
        E5.gl.uniform2i(this.uniforms[uniform], x, y);
    }
    useIVec3(uniform, x, y, z) {
        E5.gl.uniform3i(this.uniforms[uniform], x, y, z);
    }
    useIVec4(uniform, x, y, z, w) {
        E5.gl.uniform4i(this.uniforms[uniform], x, y, z, w);
    }
    useVec2(uniform, x, y) {
        E5.gl.uniform2f(this.uniforms[uniform], x, y);
    }
    useVec3(uniform, x, y, z) {
        E5.gl.uniform3f(this.uniforms[uniform], x, y, z);
    }
    useVec4(uniform, x, y, z, w) {
        E5.gl.uniform4f(this.uniforms[uniform], x, y, z, w);
    }
    useMat2(uniform, fs) {
        E5.gl.uniformMatrix2fv(
            this.uniforms[uniform],
            false,
            fs
        );
    }
    useMat3(uniform, fs) {
        E5.gl.uniformMatrix3fv(
            this.uniforms[uniform],
            false,
            fs
        );
    }
    useMat4(uniform, fs) {
        E5.gl.uniformMatrix4fv(
            this.uniforms[uniform],
            false,
            fs
        );
    }
    set(name, type, ...args) {
        if (name == "elements") {
            const firstArg = type;
            type = name;
            args = [firstArg, ...args];
        }
        this.variableValues[name] = {
            type: type,
            values: args
        };
    }
    draw() {
        this.use();
        E5.gl.drawElements(
            E5.gl.TRIANGLES, this.vertexCount, E5.gl.UNSIGNED_SHORT, 0
        );
    }
};
E5.ShaderProgram.Progs = {};
E5.ShaderProgram.Verts = {};
E5.ShaderProgram.Frags = {};
E5.ShaderProgram.prototype.use.attrib = E5.ShaderProgram.prototype.useAttrib;
E5.ShaderProgram.prototype.use.elements =
    E5.ShaderProgram.prototype.useElements;
E5.ShaderProgram.prototype.use.texture = E5.ShaderProgram.prototype.useTexture;
E5.ShaderProgram.prototype.use.int = E5.ShaderProgram.prototype.useInt;
E5.ShaderProgram.prototype.use.float = E5.ShaderProgram.prototype.useFloat;
E5.ShaderProgram.prototype.use.ivec2 = E5.ShaderProgram.prototype.useIVec2;
E5.ShaderProgram.prototype.use.ivec3 = E5.ShaderProgram.prototype.useIVec3;
E5.ShaderProgram.prototype.use.ivec4 = E5.ShaderProgram.prototype.useIVec4;
E5.ShaderProgram.prototype.use.vec2 = E5.ShaderProgram.prototype.useVec2;
E5.ShaderProgram.prototype.use.vec3 = E5.ShaderProgram.prototype.useVec3;
E5.ShaderProgram.prototype.use.vec4 = E5.ShaderProgram.prototype.useVec4;
E5.ShaderProgram.prototype.use.mat2 = E5.ShaderProgram.prototype.useMat2;
E5.ShaderProgram.prototype.use.mat3 = E5.ShaderProgram.prototype.useMat3;
E5.ShaderProgram.prototype.use.mat4 = E5.ShaderProgram.prototype.useMat4;

E5.clearCanvas = function () {
    E5.gl.clearColor(0, 0, 0, 1);
    E5.gl.clearDepth(1);
    E5.gl.enable(E5.gl.DEPTH_TEST);
    E5.gl.depthFunc(E5.gl.LEQUAL);
    E5.gl.clear(E5.gl.COLOR_BUFFER_BIT | E5.gl.DEPTH_BUFFER_BIT);
};

E5.Coroutine = class {
    // This is my own stackful coroutine implementation.
    // (Admittedly, async makes it easy.)
    constructor(callback) {
        this._resume = callback.bind(this);
    }
    async resume(...args) {
        const resumeCallback = this._resume;
        this._resume = null;
        const yieldPromise = new Promise(r => this._yield = r);
        const resumePromise = resumeCallback(...args);
            // intentionally not awaited
        if (!this._overallPromise) {
            this._overallPromise = resumePromise;
            (async () => {
                try {
                    await this._overallPromise;
                    this._done = true;
                } catch (error) {
                    this._error = error;
                }
            })(); // intentionally not awaited
        }
        return await Promise.race([this._overallPromise, yieldPromise]);
    }
    async yield(...args) {
        const yieldCallback = this._yield;
        this._yield = null;
        const resumePromise = new Promise(r => this._resume = r);
        yieldCallback(...args);
        return await resumePromise;
    }
    get status() {
        if (this._error) {
            return "error";
        } else if (this._done) {
            return "done";
        } else if (this._resume) {
            return "stopped";
        } else if (this._yield) {
            return "running";
        } else {
            return "internal error";
        }
    }
    get result() {
        return this._overallPromise;
    }
};

E5.Scheduler = class {
    constructor() {
        this.jobs = [];
        this.anyJobEverAdded = false;
        (async () => {
            while (this.jobs.length > 0 || !this.anyJobEverAdded) {
                for (let i = this.jobs.length - 1; i >= 0; i--) {
                    const job = this.jobs[i];
                    switch (job.status) {
                        case "stopped": {
                            const now = performance.now();
                            const deltaTime = now - job.timestamp;
                            job.timestamp = now;
                            job.resume(deltaTime);
                                // intentionally not awaited
                        } break;
                        case "done": case "error": {
                            this.jobs.splice(i, 1);
                        } break;
                    }
                }
                await new Promise(requestAnimationFrame);
            }
        })(); // intentionally not awaited
    }
    async schedule(callback) {
        const job = new E5.Coroutine(callback);
        job.timestamp = performance.now();
        this.jobs.push(job);
        this.anyJobEverAdded = true;
        return await job.result;
    }
};

E5.Input = new class { // singleton
    constructor() {
        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDeltaX = 0;
        this.mouseDeltaY = 0;
        E5.canvas.addEventListener("mousemove", ev => {
            this.mouseDeltaX = ev.offsetX - this.mouseX;
            this.mouseDeltaY = ev.offsetY - this.deltaY;
            this.mouseX = ev.offsetX;
            this.mouseY = ev.offsetY;
        });
    }
    /* Much more needs to be done for this class long-term,
     * but this is good enough for now. */
};

E5.start = async function () {
    const shaderProgram = await new E5.ShaderProgram({
        vertURL: "shaders/solid.simplified.vert",
        fragURL: "shaders/nipbr.simplified.frag",
        attribs: ["vPosition", "vNormal", "vUV"],
        uniforms: [
            "uTransform", "uNormalMatrix", "uCamera",
            "uAlbedo", "uMetallicity", "uRoughness", "uEmission",
            "uLightDirection", "uLightColor"
        ]
    });
    shaderProgram.set("vUV", "attrib",
        new E5.ShaderBuffer("array", "vec2", "static", [
            // Front
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Back
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Top
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Bottom
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Right
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
            // Left
            0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,
        ])
    );
    shaderProgram.set("vNormal", "attrib",
        new E5.ShaderBuffer("array", "vec3", "static", [
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, // front
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, // back
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, // top
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, // bottom
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, // right
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, // left
        ])
    );
    shaderProgram.set("vPosition", "attrib",
        new E5.ShaderBuffer("array", "vec3", "static", [
            // Front face
            -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0, 1.0,
            // Back face
            -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0, -1.0,
            // Top face
            -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, -1.0,
            // Bottom face
            -1.0, -1.0, -1.0, 1.0, -1.0, -1.0, 1.0, -1.0, 1.0, -1.0, -1.0, 1.0,
            // Right face
            1.0, -1.0, -1.0, 1.0, 1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, 1.0,
            // Left face
            -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0,
        ])
    );
    shaderProgram.set("elements",
        new E5.ShaderBuffer("elements", "static", [
            0, 1, 2, 0, 2, 3, // front
            4, 5, 6, 4, 6, 7, // back
            8, 9, 10, 8, 10, 11, // top
            12, 13, 14, 12, 14, 15, // bottom
            16, 17, 18, 16, 18, 19, // right
            20, 21, 22, 20, 22, 23, // left
        ])
    );
    shaderProgram.set("uAlbedo", "texture",
        await new E5.Texture("images/metal-pipe-sfx.png"),
        0
    );
    shaderProgram.set("uMetallicity", "texture",
        await new E5.Texture("images/metal-pipe-sfx-metallicity-map.png"),
        1
    );
    shaderProgram.set("uRoughness", "texture",
        await new E5.Texture("images/metal-pipe-sfx-roughness-map.png"),
        2
    );
    shaderProgram.set("uEmission", "texture",
        await new E5.Texture("images/metal-pipe-sfx-emission-map.png"),
        3
    );
    shaderProgram.set("uLightDirection", "vec3", 1, -1, -0.5);
    shaderProgram.set("uLightColor", "vec4", 1, 0.75, 0.875, 1);
    const camera = new E5.Camera();
    const transform1 = new E5.Transform();
    const transform2 = new E5.Transform();
    const transform3 = new E5.Transform();
    shaderProgram.set("uCamera", "mat4", camera.matrix);
    camera.rotate(E5.Quaternion.fromAngleAxis(Math.PI/8, E5.Vector3.right));
    camera.translate(E5.Vector3.up.mul(3));
    transform1.translate(E5.Vector3.forward.mul(10));
    transform2.translate(E5.Vector3.forward.mul(20));
    transform3.translate(E5.Vector3.forward.mul(30));
    const scheduler = new E5.Scheduler();
    scheduler.schedule(async function (deltaTime) {
        for (;; deltaTime = await this.yield()) {
            camera.rotate(E5.Quaternion.fromAngleAxis(
                deltaTime/1000, E5.Vector3.forward
            ));
            E5.clearCanvas();
            for (const transform of [transform1, transform2, transform3]) {
                transform.position = new E5.Vector3(
                    transform.position.z/2 -
                        E5.Input.mouseX*transform.position.z/E5.canvas.width,
                    transform.position.z/2 -
                        (E5.canvas.height - E5.Input.mouseY) *
                        transform.position.z/E5.canvas.height,
                    transform.position.z
                );
                transform.rotate(
                    E5.Quaternion.fromAngleAxis(
                        deltaTime/1000, (new E5.Vector3(
                            -transform.position.y,
                            transform.position.x,
                            0
                        )).normalized
                    )
                );
                shaderProgram.set("uTransform", "mat4", transform.matrix);
                shaderProgram.set("uNormalMatrix", "mat4", transform.normalMatrix);
                shaderProgram.draw();
            }
        }
    });
    const nipbrSourceElem = document.querySelector("#nipbr-source");
    nipbrSourceElem.style = `
        text-align: left;
        width: fit-content;
        margin: auto;
    `;
    nipbrSourceElem.innerText =
        await E5.fetch.text("shaders/nipbr.simplified.frag");
};

if (DEBUG) {
    globalThis.E5 = E5;
}
E5.start();
