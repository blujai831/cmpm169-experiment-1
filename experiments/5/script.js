const DEBUG = true;

const E5 = {};

if (DEBUG) {

    /* The engine doesn't actually use this function.
    * I used it to generate closed forms for transform matrices,
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

    E5.makeCameraMatrixExpression = (t, q) =>
        E5.makeMatrixMultiplicationExpression(
            E5.makeTranslationMatrixExpression(t),
            E5.makeQuaternionMatrixExpression(q)
        );

    E5.transpose4x4 = m =>
        [[m[0][0], m[1][0], m[2][0], m[3][0]],
         [m[0][1], m[1][1], m[2][1], m[3][1]],
         [m[0][2], m[1][2], m[2][2], m[3][2]],
         [m[0][3], m[1][3], m[2][3], m[3][3]]];

}

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
        this.rotation = this.rotation.mul(q);
    }
    scale(v) {
        this.size = this.size.scale(v);
    }
};

E5.WebGL2Demo = function () {
    // Code adapted from
    // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial
    const loadText = async function (url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`response ${response.status}`);
        return await response.text();
    };
    const loadTexture = async function (gl, url) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const level = 0;
        const internalFormat = gl.RGBA;
        const width = 1;
        const height = 1;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        const pixel = new Uint8Array([0, 0, 255, 255]);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            width, height,
            border,
            srcFormat, srcType,
            pixel
        );
        const image = new Image();
        image.src = url;
        await new Promise(r => image.onload = r);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            level,
            internalFormat,
            srcFormat, srcType,
            image
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        return texture;
    };
    const initTextureBuffer = function (gl) {
        const textureCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
        const textureCoordinates = [
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
        ];
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(textureCoordinates),
            gl.STATIC_DRAW,
        );
        return textureCoordBuffer;
    };
    const initIndexBuffer = function (gl) {
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        const indices = [
            0, 1, 2, 0, 2, 3, // front
            4, 5, 6, 4, 6, 7, // back
            8, 9, 10, 8, 10, 11, // top
            12, 13, 14, 12, 14, 15, // bottom
            16, 17, 18, 16, 18, 19, // right
            20, 21, 22, 20, 22, 23, // left
        ];
        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint16Array(indices),
            gl.STATIC_DRAW
        );
        return indexBuffer;
    };
    const initNormalBuffer = function (gl) {
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        const normals = [
            0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, // front
            0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, // back
            0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, // top
            0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, // bottom
            1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, // right
            -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, // left
        ];
        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(normals),
            gl.STATIC_DRAW
        );
        return normalBuffer;
    };
    /*const vsSource = `#version 300 es
        precision highp float;
        in vec4 position;
        in vec2 textureCoord;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        out vec2 interpTextureCoord;
        void main() {
            gl_Position = projectionMatrix*modelViewMatrix*position;
            interpTextureCoord = textureCoord;
        }
    `;
    const fsSource = `#version 300 es
        precision highp float;
        in vec2 interpTextureCoord;
        uniform sampler2D albedo;
        out vec4 finalColor;
        void main() {
            finalColor = texture(albedo, interpTextureCoord);
        }
    `;*/
    const loadShader = async function (gl, type, ...urls) {
        let source = "#version 300 es\nprecision highp float;\n\n";
        for (const url of urls) {
            source += await loadText(url) + "\n";
        }
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const error = new Error(gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            throw error;
        }
        return shader;
    };
    const initShaderProgram = async function (gl) {
        const vertexShader = await loadShader(
            gl, gl.VERTEX_SHADER, "shaders/solid.simplified.vert"
        );
        const fragmentShader = await loadShader(
            gl, gl.FRAGMENT_SHADER, "shaders/nipbr.simplified.frag"
        );
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(shaderProgram));
        }
        return shaderProgram;
    };
    const initBuffers = function (gl) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
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
        ]), gl.STATIC_DRAW);
        const textureCoordBuffer = initTextureBuffer(gl);
        const indexBuffer = initIndexBuffer(gl);
        const normalBuffer = initNormalBuffer(gl);
        return {
            position: positionBuffer,
            textureCoord: textureCoordBuffer,
            index: indexBuffer,
            normal: normalBuffer
        };
    };
    const getProgramInfo = function (gl, shaderProgram) {
        return {
            vPosition: gl.getAttribLocation(shaderProgram, "vPosition"),
            vNormal: gl.getAttribLocation(shaderProgram, "vNormal"),
            vUV: gl.getAttribLocation(shaderProgram, "vUV"),
            uTransform: gl.getUniformLocation(shaderProgram, "uTransform"),
            uNormalMatrix: gl.getUniformLocation(shaderProgram, "uNormalMatrix"),
            uCamera: gl.getUniformLocation(shaderProgram, "uCamera"),
            uAlbedo: gl.getUniformLocation(shaderProgram, "uAlbedo"),
            uMetallicity: gl.getUniformLocation(shaderProgram, "uMetallicity"),
            uRoughness: gl.getUniformLocation(shaderProgram, "uRoughness"),
            uEmission: gl.getUniformLocation(shaderProgram, "uEmission"),
            uLightDirection: gl.getUniformLocation(shaderProgram, "uLightDirection"),
            uLightColor: gl.getUniformLocation(shaderProgram, "uLightColor")
        };
    };
    const drawScene = function (
        gl, program, programInfo, buffers, transform,
        albedoTexture,
        metallicityTexture,
        roughnessTexture,
        emissionTexture
    ) {
        gl.clearColor(0, 0, 0, 1);
        gl.clearDepth(1);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        const fov = Math.PI/4;
        const aspect = gl.canvas.clientWidth/gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 100.0;
        setPositionAttribute(gl, buffers, programInfo);
        setTextureAttribute(gl, buffers, programInfo);
        setNormalAttribute(gl, buffers, programInfo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
        gl.useProgram(program);
        const f = 1/Math.tan(fov/2);
        const nf = 1/(zNear - zFar);
        const perspective =
            new Float32Array([
                f/aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (zFar + zNear)*nf, -1,
                0, 0, (2*zFar*zNear)*nf, 0
            ]);
        gl.uniformMatrix4fv(
            programInfo.uCamera,
            false,
            perspective
        );
        gl.uniformMatrix4fv(
            programInfo.uTransform,
            false,
            transform.matrix
        );
        gl.uniformMatrix4fv(
            programInfo.uNormalMatrix,
            false,
            transform.normalMatrix
        );
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, albedoTexture);
        gl.uniform1i(programInfo.uAlbedo, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, metallicityTexture);
        gl.uniform1i(programInfo.uMetallicity, 1);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, roughnessTexture);
        gl.uniform1i(programInfo.uRoughness, 2);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, emissionTexture);
        gl.uniform1i(programInfo.uEmission, 3);
        gl.uniform3f(programInfo.uLightDirection, 1, -1, -0.5);
        gl.uniform4f(programInfo.uLightColor, 1, 0.75, 0.875, 1);
        const offset = 0;
        const vertexCount = 36;
        const type = gl.UNSIGNED_SHORT;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    };
    const setPositionAttribute = function (gl, buffers, programInfo) {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.vPosition,
            numComponents, type, normalize, stride, offset
        );
        gl.enableVertexAttribArray(programInfo.vPosition);
    };
    const setNormalAttribute = function (gl, buffers, programInfo) {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
        gl.vertexAttribPointer(
            programInfo.vNormal,
            numComponents, type, normalize, stride, offset
        );
        gl.enableVertexAttribArray(programInfo.vNormal);
    };
    const setTextureAttribute = function (gl, buffers, programInfo) {
        const num = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
        gl.vertexAttribPointer(
            programInfo.vUV,
            num, type, normalize, stride, offset
        );
        gl.enableVertexAttribArray(programInfo.vUV);
    };
    const setupInputCallbacks = function (mouse, oldMouse) {
        document.querySelector("canvas").addEventListener("mousemove", e => {
            oldMouse.x = mouse.x;
            oldMouse.y = mouse.y;
            mouse.x = e.offsetX;
            mouse.y = e.offsetY;
        });
    };
    const main = async function () {
        const canvas = document.querySelector("canvas");
        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("no gl");
        const shaderProgram = await initShaderProgram(gl);
        const programInfo = getProgramInfo(gl, shaderProgram);
        const buffers = initBuffers(gl);
        const albedoTexture =
            await loadTexture(gl, "images/metal-pipe-sfx.png");
        const metallicityTexture =
            await loadTexture(gl, "images/metal-pipe-sfx-metallicity-map.png");
        const roughnessTexture =
            await loadTexture(gl, "images/metal-pipe-sfx-roughness-map.png");
        const emissionTexture =
            await loadTexture(gl, "images/metal-pipe-sfx-emission-map.png");
        let transform = new E5.Transform();
        transform.translate(E5.Vector3.forward.mul(10));
        let deltaTime = 0;
        const mouse = {x: 0, y: 0};
        const oldMouse = {x: -1, y: -1};
        const mouseDelta = () => ({x: mouse.x - oldMouse.x, y: mouse.y - oldMouse.y});
        const mouseSpeed = () => {
            const d = mouseDelta();
            return Math.sqrt(d.x*d.x + d.y*d.y);
        };
        setupInputCallbacks(mouse, oldMouse);
        let then = performance.now();
        (async () => {
            for (;;) {
                transform.rotate(
                    E5.Quaternion.fromAngleAxis(
                        mouseSpeed()*deltaTime/1000,
                        new E5.Vector3(mouseDelta().x, mouseDelta().y, 0)
                    )
                );
                drawScene(
                    gl, shaderProgram,
                    programInfo,
                    buffers,
                    transform,
                    albedoTexture,
                    metallicityTexture,
                    roughnessTexture,
                    emissionTexture
                );
                await new Promise(requestAnimationFrame);
                const now = performance.now();
                deltaTime = now - then;
                then = now;
            }
        })();
    };
    main();
};

E5.start = function () {
    E5.WebGL2Demo();
};

if (DEBUG) {
    globalThis.E5 = E5;
}
E5.start();
