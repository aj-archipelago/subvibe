import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/subvibe.cjs.js',
      format: 'cjs'
    },
    {
      file: 'dist/subvibe.esm.js',
      format: 'es'
    },
    {
      file: 'dist/subvibe.umd.js',
      format: 'umd',
      name: 'SubVibe',
      globals: { debug: 'debug' }
    }
  ],
  plugins: [
    typescript(),
    nodeResolve(),
    commonjs(),
    terser()
  ],
  external: ['debug']
};
