import type {Config} from 'tailwindcss'

export default {
    content: [],
    theme: {
        extend: {

            animation: {
                marquee: 'marquee 25s linear infinite',
                marqueer: 'marqueer 35s linear infinite',
            },
            keyframes: {
                marquee: {
                    '0%': { transform: 'translateX(0%)' },
                    '100%': { transform: 'translateX(-100%)' },
                },
                marqueer: {
                    '0%, 100%': { transform: 'translateX(0%)' },
                    '50%': { transform: 'translateX(100%)' },
                }
            },

            colors: {
                'mocha-mousse': {
                    '50': '#f8f5f2',
                    '100': '#eae2db',
                    '200': '#d4c3b3',
                    '300': '#bda38c',
                    '400': '#ae8a71',
                    '500': '#a47864',
                    '600': '#8d5f52',
                    '700': '#774c46',
                    '800': '#633f3d',
                    '900': '#523635',
                    '950': '#2d1b1b',
                },
                'pink-lemonade': {
                    '50': '#fef2f4',
                    '100': '#fde6ea',
                    '200': '#fad1d9',
                    '300': '#f6abba',
                    '400': '#ee6d8a',
                    '500': '#e54e74',
                    '600': '#d12d5e',
                    '700': '#b0204f',
                    '800': '#941d48',
                    '900': '#7e1d43',
                    '950': '#460b21',
                },
                'orange-mandarin': {
                    '50': '#fef5ee',
                    '100': '#fce8d8',
                    '200': '#f9ceaf',
                    '300': '#f4ab7d',
                    '400': '#ef7e48',
                    '500': '#ec6a37',
                    '600': '#dc441a',
                    '700': '#b63218',
                    '800': '#91291b',
                    '900': '#752419',
                    '950': '#3f0f0b',
                },
                'blue-curacao': {
                    '50': '#effcfc',
                    '100': '#d6f5f7',
                    '200': '#b2ebef',
                    '300': '#7ddbe3',
                    '400': '#33becc',
                    '500': '#25a6b5',
                    '600': '#228698',
                    '700': '#226d7d',
                    '800': '#235a67',
                    '900': '#224b57',
                    '950': '#11313b',
                },
                'blue-hippie': {
                    '50': '#f1fafa',
                    '100': '#dbeff2',
                    '200': '#bcdfe5',
                    '300': '#8dc8d3',
                    '400': '#52a5b6',
                    '500': '#3c8c9e',
                    '600': '#357385',
                    '700': '#305f6e',
                    '800': '#2e4f5c',
                    '900': '#2a444f',
                    '950': '#182b34',
                },
                'red-winery': {
                    '50': '#fbf6f5',
                    '100': '#f8edeb',
                    '200': '#f1dcda',
                    '300': '#e5c1bc',
                    '400': '#d69c96',
                    '500': '#c4746f',
                    '600': '#ad5351',
                    '700': '#904040',
                    '800': '#833c3f',
                    '900': '#693236',
                    '950': '#391819',
                },
                'lavender-bonbon': {
                    '50': '#fcf3f8',
                    '100': '#fae9f3',
                    '200': '#f7d3e6',
                    '300': '#f1a9cf',
                    '400': '#e97db3',
                    '500': '#de5697',
                    '600': '#cb3777',
                    '700': '#b0265d',
                    '800': '#91234d',
                    '900': '#7a2144',
                    '950': '#4a0d24',
                }
            }
        }
    },
    plugins: [],
} satisfies Config
