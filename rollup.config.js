import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';

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
      name: 'SubVibe'
    }
  ],
  plugins: [
    typescript(),
    nodeResolve(),
    terser()
  ]
};
