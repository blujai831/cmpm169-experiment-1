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
        return new E5.Vector3(0, 0, 1);
    }
    static get backward() {
        return new E5.Vector3(0, 0, -1);
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
    get rotation() {return Object.freeze(this._quaternion.clone());}
    get scale() {return Object.freeze(this._scale.clone());}
    set position(t) {
        this._position = E5.Vector3.clone(t);
        this.updateMatrices();
    }
    set rotation(q) {
        this._rotation = E5.Quaternion.clone(q);
        this.updateMatrices();
    }
    set scale(d) {
        this._scale = E5.Vector3.clone(d);
        this.updateMatrices();
    }
    updateMatrices() {
        const t = this.position;
        const q = this.rotation;
        const d = this.scale;
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
            scale(this.scale).
            rotate(this.rotation).
            add(this.position);
    }
    worldToLocal(vec) {
        return vec.
            sub(this.position).
            rotate(this.rotation.inverse).
            scale(this.scale.reciprocal);
    }
    static get identity() {
        return new E5.Transform();
    }
};

E5.WebGL2Demos = {};

E5.WebGL2Demo = function () {
    const initColorBuffer = function (gl) {
        const colors = new Float32Array([
            1, 1, 1, 1,
            1, 0, 0, 1,
            0, 1, 0, 1,
            0, 0, 1, 1
        ]);
        const colorBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        return colorBuffer;
    };
    const vsSource = `#version 300 es
        precision highp float;
        in vec4 position;
        in vec4 color;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        out vec4 interpColor;
        void main() {
            gl_Position = projectionMatrix*modelViewMatrix*position;
            interpColor = color;
        }
    `;
    const fsSource = `#version 300 es
        precision highp float;
        in vec4 interpColor;
        out vec4 finalColor;
        void main() {
            finalColor = interpColor;
        }
    `;
    const loadShader = function (gl, type, source) {
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
    const initShaderProgram = function (gl, vsSource, fsSource) {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
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
            1, 1,
            -1, 1,
            1, -1,
            -1, -1
        ]), gl.STATIC_DRAW);
        const colorBuffer = initColorBuffer(gl);
        return {
            position: positionBuffer,
            color: colorBuffer
        };
    };
    const getProgramInfo = function (gl, shaderProgram) {
        const offsetForAttributePosition =
            gl.getAttribLocation(shaderProgram, "position");
        const offsetForAttributeColor =
            gl.getAttribLocation(shaderProgram, "color");
        const offsetForUniformProjectionMatrix =
            gl.getUniformLocation(shaderProgram, "projectionMatrix");
        const offsetForUniformModelViewMatrix =
            gl.getUniformLocation(shaderProgram, "modelViewMatrix");
        return {
            offsetForAttributePosition,
            offsetForAttributeColor,
            offsetForUniformProjectionMatrix,
            offsetForUniformModelViewMatrix
        };
    };
    const drawScene = function (gl, program, programInfo, buffers) {
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
        setColorAttribute(gl, buffers, programInfo);
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
        console.log(perspective);
        console.log(programInfo);
        gl.uniformMatrix4fv(
            programInfo.offsetForUniformProjectionMatrix,
            false,
            perspective
        );
        gl.uniformMatrix4fv(
            programInfo.offsetForUniformModelViewMatrix,
            false,
            new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, -6, 1
            ])
        );
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    };
    const setPositionAttribute = function (gl, buffers, programInfo) {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.offsetForAttributePosition,
            numComponents, type, normalize, stride, offset
        );
        gl.enableVertexAttribArray(programInfo.offsetForAttributePosition);
    };
    const setColorAttribute = function (gl, buffers, programInfo) {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.offsetForAttributeColor,
            numComponents, type, normalize, stride, offset
        );
        gl.enableVertexAttribArray(programInfo.offsetForAttributeColor);
    };
    const main = function () {
        const canvas = document.querySelector("canvas");
        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("no gl");
        const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
        drawScene(
            gl, shaderProgram,
            getProgramInfo(gl, shaderProgram),
            initBuffers(gl)
        );
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
