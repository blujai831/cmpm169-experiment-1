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
        this.position = new E5.Vector3();
        this.rotation = new E5.Quaternion();
        this.scale = new E5.Vector3(1, 1, 1);
    }
    get matrix() {
        // Simplified with xmaxima from makeTransformMatrixExpression
        const t = this.position;
        const q = this.rotation;
        const d = this.scale;
        return [
            [d.x*(1 - 2*q.y*q.y - 2*q.z*q.z),
             d.x*(2*q.x*q.y + 2*q.z*q.w),
             d.x*(2*q.x*q.z - 2*q.y*q.w),
             0],
            [d.y*(2*q.x*q.y - 2*q.z*q.w),
             d.y*(1 - 2*q.x*q.x - 2*q.z*q.z),
             d.y*(2*q.x*q.w + 2*q.y*q.z),
             0],
            [d.z*(2*q.x*q.z + 2*q.y*q.w),
             d.z*(2*q.y*q.z - 2*q.x*q.w),
             d.z*(1 - 2*q.x*q.x - 2*q.y*q.y),
             0],
            [t.x, t.y, t.z, 1]
        ];
    }
    get normalMatrix() {
        // Simplified with xmaxima from makeNormalMatrixExpression
        const t = this.position;
        const q = this.rotation;
        const d = this.scale;
        return [
            [(1 - 2*q.y*q.y - 2*q.z*q.z)/d.x,
             (2*q.x*q.y + 2*q.z*q.w)/d.x,
             (2*q.x*q.z - 2*q.y*q.w)/d.x,
             ((2*q.y*q.y + 2*q.z*q.z - 1)*t.x -
              (2*q.x*q.y + 2*q.z*q.w)*t.y +
              (2*q.y*q.w - 2*q.x*q.z)*t.z)/d.x],
            [(2*q.x*q.y - 2*q.z*q.w)/d.y,
             (1 - 2*q.x*q.x - 2*q.z*q.z)/d.y,
             (2*q.x*q.w + 2*q.y*q.z)/d.y,
             ((2*q.z*q.w - 2*q.x*q.y)*t.x -
              (1 - 2*q.x*q.x - 2*q.z*q.z)*t.y -
              (2*q.x*q.w + 2*q.y*q.z)*t.z)/d.y],
            [(2*q.x*q.z + 2*q.y*q.w)/d.z,
             (2*q.y*q.z - 2*q.x*q.w)/d.z,
             (1 - 2*q.x*q.x - 2*q.y*q.y)/d.z,
             ((2*q.x*q.w - 2*q.y*q.z)*t.y -
              (1 - 2*q.x*q.x - 2*q.y*q.y)*t.z -
              (2*q.x*q.z + 2*q.y*q.w)*t.x)/d.z],
            [0, 0, 0, 1]
        ];
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

E5.WebGL2Demos["Getting started with WebGL"] = function () {
    const main = function () {
        const canvas = document.querySelector("canvas");
        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("no gl");
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    };
    main();
};

E5.WebGL2Demos["Adding 2D content to a WebGL context"] = function () {
    const vsSource = `#version 300 es
        precision highp float;
        in vec4 position;
        uniform mat4 modelViewMatrix;
        uniform mat4 projectionMatrix;
        out vec4 finalPosition;
        void main() {
            gl_Position = finalPosition = projectionMatrix*modelViewMatrix*position;
        }
    `;
    const fsSource = `#version 300 es
        precision highp float;
        const float PI = 3.1415926535897932384626433832795028841971693994;
        in vec4 finalPosition;
        out vec4 color;
        void main() {
            // Let's do something a little differently from the tutorial
            color = sin(PI*(finalPosition + vec4(1.0)))/2.0 + vec4(0.5);
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
    const initPositionBuffer = function (gl) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            1, 1,
            -1, 1,
            1, -1,
            -1, -1
        ]), gl.STATIC_DRAW);
        return positionBuffer;
    };
    const getProgramInfo = function (gl, shaderProgram) {
        const offsetForAttributePosition =
            gl.getAttribLocation(shaderProgram, "position");
        const offsetForUniformProjectionMatrix =
            gl.getUniformLocation(shaderProgram, "projectionMatrix");
        const offsetForUniformModelViewMatrix =
            gl.getUniformLocation(shaderProgram, "modelViewMatrix");
        const offsetForFragDataColor =
            gl.getFragDataLocation(shaderProgram, "color");
        /*console.log(
            offsetForAttributePosition,
            offsetForUniformProjectionMatrix,
            offsetForUniformModelViewMatrix,
            offsetForFragDataColor,
            gl.getAttribLocation(shaderProgram, "thisShouldntWork"),
            gl.getUniformLocation(shaderProgram, "thisShouldntWork"),
            gl.getFragDataLocation(shaderProgram, "thisShouldntWork")
        );*/
        return {
            offsetForAttributePosition,
            offsetForUniformProjectionMatrix,
            offsetForUniformModelViewMatrix,
            offsetForFragDataColor
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
        /*
        const projectionMatrix = mat4.create(); // Huh!?!!?
        // Well this just fucks everything up!
        // I thought I'd have to pass in matrices manually!
        // Now to find out how much code I'm going to have to throw away.
        mat4.perspective(projectionMatrix, fov, aspect, zNear, zFar);
        const modelViewMatrix = mat4.create();
        mat4.translate( // Oh fuck you.
            modelViewMatrix,
            modelViewMatrix,
            [-1, 0, 6]
        );
        */
        /* Apparently the above code requires an outside library
         * and MDN didn't think to tell anyone.
         * (Oh, actually there's a footnote about it.)
         * That's fine. As it happens, I have code to work with matrices,
         * and actually I feel vindicated that I'm not going to have
         * to get rid of it after all. I'll just adjust it
         * to use Float32Array, since I'm looking at mat4's implementation
         * and that is apparently what GL will expect.
         * Later, though. For now, I'll just do the work inline here. */
        setPositionAttribute(gl, buffers, programInfo);
        gl.useProgram(program);
        // Projection matrix formula taken from mat4 implementation.
        const f = 1/Math.tan(fov/2);
        const nf = 1/(zNear - zFar);
        let perspective =
            new Float32Array([
                f/aspect, 0, 0, 0,
                0, f, 0, 0,
                0, 0, (zFar + zNear)*nf, -1,
                0, 0, (2*zFar*zNear)*nf, 0
            ]);
        /*perspective = new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        ])*/
        console.log(perspective);
        /* I've verified my perspective matrix is correct.
         * It matches the one that would be produced by mat4.
         * So why isn't it working? */
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
                // It was because I was using 6 instead of -6.
                // It was that simple.
                // Unbelievable. What a waste of an hour.
            ])
        );
        const offset = 0;
        const vertexCount = 4;
        gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);
    };
    const setPositionAttribute = function (gl, positionBuffer, programInfo) {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(
            programInfo.offsetForAttributePosition,
            numComponents, type, normalize, stride, offset
        );
        gl.enableVertexAttribArray(programInfo.offsetForAttributePosition);
    };
    const main = function () {
        const canvas = document.querySelector("canvas");
        const gl = canvas.getContext("webgl2");
        if (!gl) throw new Error("no gl");
        const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
        drawScene(
            gl, shaderProgram,
            getProgramInfo(gl, shaderProgram),
            initPositionBuffer(gl)
        );
    };
    main();
};

E5.start = function () {
    E5.WebGL2Demos["Adding 2D content to a WebGL context"]();
};

if (DEBUG) {
    globalThis.E5 = E5;
}
E5.start();
