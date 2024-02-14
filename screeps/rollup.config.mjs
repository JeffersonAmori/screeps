"use strict";

import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import clear from 'rollup-plugin-clear';
import screeps from 'rollup-plugin-screeps';
import typescript from 'rollup-plugin-typescript2';
import screepsConfig from './screeps.json' assert {type: "json"};

let cfg;
const dest = process.env.DEST;
if (!dest) {
    console.log("No destination specified - code will be compiled but not uploaded");
} else if ((cfg = screepsConfig[dest]) == null) {
    throw new Error("Invalid upload destination");
}

export default {
    input: 'src/main.ts',
    output: {
        file: 'dist/main.js',
        format: 'cjs',
        sourcemap: true
    },

    plugins: [
        clear({ targets: ["dist"] }),
        resolve({
            rootDir: "src",
            customResolveOptions: {
                moduleDirectory: 'node_modules'
            }
        }),
        commonjs(),
        typescript({ tsconfig: "./tsconfig.json" }),
        screeps({ config: cfg, dryRun: cfg == null })
    ]
};
