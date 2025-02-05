import typescript from '@rollup/plugin-typescript';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/subvibe.cjs.js',
      format: 'cjs',
      exports: 'named',
      sourcemap: true,
      interop: 'auto'
    },
    {
      file: 'dist/subvibe.esm.js',
      format: 'es',
      exports: 'named',
      sourcemap: true,
      interop: 'auto'
    },
    {
      file: 'dist/subvibe.umd.js',
      format: 'umd',
      name: 'SubVibe',
      exports: 'named',
      sourcemap: true,
      interop: 'auto',
      globals: {
        debug: 'debug'
      }
    }
  ],
  plugins: [
    nodeResolve({
      preferBuiltins: true,
      browser: true
    }),
    commonjs({
      include: /node_modules/,
      transformMixedEsModules: true
    }),
    typescript({
      tsconfig: './tsconfig.json',
      declaration: true,
      declarationDir: 'dist'
    }),
    terser()
  ],
  external: ['debug']
};
