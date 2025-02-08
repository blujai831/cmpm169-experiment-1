const DEBUG = true;

const Experiment5 = {};
const e5 = Experiment5;

if (DEBUG) {

    /* The engine doesn't actually use this function.
    * I used it to generate closed forms for transform matrices,
    * which could then be simplified using the application xmaxima,
    * before finally using the simplified closed-form expressions inline
    * in place of runtime matrix-by-matrix multiplication. */
    e5.makeMatrixMultiplicationExpression = function (a, b, ...rest) {
        if (rest.length > 0) {
            return e5.makeMatrixMultiplicationExpression(
                a,
                e5.makeMatrixMultiplicationExpression(
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

    e5.makeQuaternionMatrixExpression = q => [
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

    e5.makeInverseQuaternionMatrixExpression = q => [
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

    e5.makeDilationMatrixExpression = d => [
        [`(${d}_1)`, `0`, `0`, `0`],
        [`0`, `(${d}_2)`, `0`, `0`],
        [`0`, `0`, `(${d}_3)`, `0`],
        [`0`, `0`, `0`, `1`]
    ];

    e5.makeInverseDilationMatrixExpression = d => [
        [`1/(${d}_1)`, `0`, `0`, `0`],
        [`0`, `1/(${d}_2)`, `0`, `0`],
        [`0`, `0`, `1/(${d}_3)`, `0`],
        [`0`, `0`, `0`, `1`]
    ];

    e5.makeTranslationMatrixExpression = t => [
        [`1`, `0`, `0`, `0`],
        [`0`, `1`, `0`, `0`],
        [`0`, `0`, `1`, `0`],
        [`(${t}_1)`, `(${t}_2)`, `(${t}_3)`, `1`]
    ];

    e5.makeInverseTranslationMatrixExpression = t => [
        [`1`, `0`, `0`, `0`],
        [`0`, `1`, `0`, `0`],
        [`0`, `0`, `1`, `0`],
        [`-(${t}_1)`, `-(${t}_2)`, `-(${t}_3)`, `1`]
    ];

    e5.makeTransformMatrixExpression = (t, q, d) =>
        e5.makeMatrixMultiplicationExpression(
            e5.makeTranslationMatrixExpression(t),
            e5.makeQuaternionMatrixExpression(q),
            e5.makeDilationMatrixExpression(d)
        );

    e5.makeNormalMatrixExpression = (t, q, d) => e5.transpose4x4(
        e5.makeMatrixMultiplicationExpression(
            e5.makeInverseDilationMatrixExpression(d),
            e5.makeInverseQuaternionMatrixExpression(q),
            e5.makeInverseTranslationMatrixExpression(t)
        )
    );

    e5.makeCameraMatrixExpression = (t, q) =>
        e5.makeMatrixMultiplicationExpression(
            e5.makeTranslationMatrixExpression(t),
            e5.makeQuaternionMatrixExpression(q)
        );

    e5.transpose4x4 = m =>
        [[m[0][0], m[1][0], m[2][0], m[3][0]],
         [m[0][1], m[1][1], m[2][1], m[3][1]],
         [m[0][2], m[1][2], m[2][2], m[3][2]],
         [m[0][3], m[1][3], m[2][3], m[3][3]]];

}

e5.Vector3 = class {
    constructor(x, y, z) {
        this.x = x || 0;
        this.y = y || 0;
        this.z = z || 0;
    }
    static clone(v) {
        return new e5.Vector3(v.x, v.y, v.z);
    }
    clone() {
        return e5.Vector3.clone(this);
    }
    static length(v) {
        return Math.sqrt(v.dot(v));
    }
    get length() {
        return e5.Vector3.length(this);
    }
    static normalize(v) {
        const m = v.length;
        return new e5.Vector3(v.x/m, v.y/m, v.z/m);
    }
    get normalized() {
        return e5.Vector3.normalize(this);
    }
    static negative(v) {
        return new e5.Vector3(-v.x, -v.y, -v.z);
    }
    get negative() {
        return e5.Vector3.negative(this);
    }
    static reciprocal(v) {
        return new e5.Vector3(1/v.x, 1/v.y, 1/v.z);
    }
    get reciprocal() {
        return e5.Vector3.reciprocal(this);
    }
    static add(v, u, ...rest) {
        if (rest.length > 0) {
            return e5.Vector3.add(e5.Vector3.add(v, u), ...rest);
        } else {
            return new e5.Vector3(v.x + u.x, v.y + u.y, v.z + u.z);
        }
    }
    add(...args) {
        return e5.Vector3.add(this, ...args);
    }
    static sub(v, u, ...rest) {
        if (rest.length > 0) {
            return e5.Vector3.sub(e5.Vector3.sub(v, u), ...rest);
        } else {
            return v.add(u.negative);
        }
    }
    sub(...args) {
        return e5.Vector3.sub(this, ...args);
    }
    static mul(n, ...rest) {
        if (rest.length <= 0) {
            return n;
        } else if (rest.length == 1) {
            const v = rest[0];
            return new e5.Vector3(n*v.x, n*v.y, n*v.z);
        } else {
            return e5.Vector3.mul(n, e5.Vector3.mul(...rest));
        }
    }
    mul(...args) {
        return e5.Vector3.mul(...args, this);
    }
    static dot(v, u) {
        return v.x*u.x + v.y*u.y + v.z*u.z;
    }
    dot(other) {
        return e5.Vector3.dot(this, other);
    }
    static cross(v, u) {
        return new e5.Vector3(
            v.y*u.z - v.z*u.y,
            v.z*u.x - v.x*u.z,
            v.x*u.y - v.y*u.x
        );
    }
    cross(other) {
        return e5.Vector3.cross(this, other);
    }
    static project(v, u) {
        u = u.normalized;
        return u.mul(v.dot(u));
    }
    project(other) {
        return e5.Vector3.project(this, other);
    }
    static reject(v, u) {
        return v.sub(v.project(u));
    }
    reject(other) {
        return e5.Vector3.reject(this, other);
    }
    static rotate(v, q) {
        /* Approach borrowed from Sir Nate and Laurent Couvidou,
         * found at https://gamedev.stackexchange.com/questions/28395
         *      /rotating-vector3-by-a-quaternion */
        const u = new e5.Vector3(q.x, q.y, q.z);
        const dot = u.dot(v);
        const cross = u.cross(v);
        return u.mul(2*dot).add(v.mul(q.w*q.w - dot), cross.mul(2*q.w));
    }
    rotate(q) {
        return e5.Vector3.rotate(this, q);
    }
    static scale(v, u) {
        return new e5.Vector3(v.x*u.x, v.y*u.y, v.z*u.z);
    }
    scale(other) {
        return e5.Vector3.scale(this, other);
    }
};

e5.Quaternion = class {
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
            return e5.Quaternion.mul(e5.Quaternion.mul(q, p), ...rest);
        } else {
            return new e5.Quaternion(
                q.w*p.x + q.x*p.w + q.y*p.z - q.z*p.y,
                q.w*p.y - q.x*p.z + q.y*p.w + q.z*p.x,
                q.w*p.z + q.x*p.y - q.y*p.x + q.z*p.w,
                q.w*p.w - q.x*p.x - q.y*p.y - q.z*p.z
            );
        }
    }
    mul(...args) {
        return e5.Quaternion.mul(this, ...args);
    }
    static inverse(q) {
        return new e5.Quaternion(-q.x, -q.y, -q.z, q.w);
    }
    get inverse() {
        return e5.Quaternion.inverse(this);
    }
};

e5.Transform = class {
    constructor() {
        this.position = new e5.Vector3();
        this.rotation = new e5.Quaternion();
        this.scale = new e5.Vector3(1, 1, 1);
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
};

if (DEBUG) {
    globalThis.Experiment5 = e5;
} else {
    e5.start();
}
