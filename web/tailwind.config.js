import defaultTheme from 'tailwindcss/defaultTheme';
import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
        './storage/framework/views/*.php',
        './resources/views/**/*.blade.php',
        './resources/js/**/*.tsx',
        './resources/js/**/*.ts',
    ],

    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', ...defaultTheme.fontFamily.sans],
                serif: ['"Playfair Display"', 'Georgia', 'serif'],
                display: ['"Playfair Display"', 'Georgia', 'serif'],
            },
            colors: {
                ink: {
                    50:  '#FAFAF7',
                    100: '#F5F4ED',
                    200: '#E8E7DE',
                    300: '#D4D2C5',
                    900: '#0B1220',
                    950: '#070C16',
                },
                brand: {
                    50:  '#ECFEFF',
                    100: '#CFFAFE',
                    400: '#22D3EE',
                    500: '#06B6D4',
                    600: '#0891B2',
                    700: '#0E7490',
                },
                flame: {
                    50:  '#FFF7ED',
                    100: '#FFEDD5',
                    400: '#FB923C',
                    500: '#F97316',
                    600: '#EA580C',
                },
            },
            boxShadow: {
                soft: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -8px rgba(15,23,42,.08)',
            },
        },
    },

    plugins: [forms],
};
