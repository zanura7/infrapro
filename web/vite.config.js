import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

/**
 * react-aria@3.48.0 declares sub-path exports with an `import` condition pointing
 * to .mjs files that don't exist in the published package. @react-aria/focus and
 * @react-aria/interactions have import.mjs files that re-export from these broken
 * sub-paths (e.g. "react-aria/FocusScope").
 *
 * This plugin rewrites those imports to the .js files that DO exist in the package.
 */
function fixReactAriaImports() {
    return {
        name: 'fix-react-aria-imports',
        enforce: 'pre',
        resolveId(source, importer) {
            // Only intercept react-aria/* sub-path imports (not "react-aria" root)
            if (source.startsWith('react-aria/') && importer) {
                const subPath = source.slice('react-aria/'.length);
                const jsFile = path.resolve(
                    __dirname,
                    'node_modules/react-aria/dist/exports',
                    subPath + '.js'
                );
                if (fs.existsSync(jsFile)) {
                    return jsFile;
                }
                // Handle private/* paths
                const privatePath = path.resolve(
                    __dirname,
                    'node_modules/react-aria/dist',
                    subPath + '.js'
                );
                if (fs.existsSync(privatePath)) {
                    return privatePath;
                }
            }
            return null;
        },
    };
}

export default defineConfig({
    plugins: [
        fixReactAriaImports(),
        laravel({
            input: 'resources/js/app.tsx',
            refresh: true,
        }),
        react(),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/js'),
        },
    },
});
