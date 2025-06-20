import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				'blue-theme': {
					'50': 'rgba(59, 130, 246, 0.05)',
					'100': 'rgba(59, 130, 246, 0.1)',
					'200': 'rgba(59, 130, 246, 0.2)',
					'300': 'rgba(59, 130, 246, 0.3)',
					'400': 'rgba(59, 130, 246, 0.4)',
					'500': 'rgba(59, 130, 246, 0.5)',
					'600': 'rgba(59, 130, 246, 0.6)',
					'700': 'rgba(59, 130, 246, 0.7)',
					'800': 'rgba(59, 130, 246, 0.8)',
					'900': 'rgba(59, 130, 246, 0.9)',
					'950': 'rgba(59, 130, 246, 0.95)',
				},
				'btn-blue': {
					bg: 'rgba(59, 130, 246, 0.2)',
					text: 'rgb(96, 165, 250)',
					hover: 'rgba(59, 130, 246, 0.3)',
					border: 'rgba(96, 165, 250, 0.3)',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['Be Vietnam Pro', 'Inter', 'system-ui', 'sans-serif'],
				heading: ['Be Vietnam Pro', 'Inter', 'system-ui', 'sans-serif'],
				primary: ['Be Vietnam Pro', 'Inter', 'system-ui', 'sans-serif'],
				secondary: ['Be Vietnam Pro', 'Inter', 'system-ui', 'sans-serif'],
				'circular-web': ['circular-web', 'sans-serif'],
				general: ['general', 'sans-serif'],
				'robert-medium': ['robert-medium', 'sans-serif'],
				'robert-regular': ['robert-regular', 'sans-serif'],
				zentry: ['zentry', 'sans-serif'],
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(10px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)' },
					'50%': { boxShadow: '0 0 40px rgba(59, 130, 246, 0.6)' },
				},
				'slide-up': {
					from: {
						opacity: '0',
						transform: 'translateY(30px)',
					},
					to: {
						opacity: '1',
						transform: 'translateY(0)',
					},
				},
				'scale-in': {
					from: {
						opacity: '0',
						transform: 'scale(0.9)',
					},
					to: {
						opacity: '1',
						transform: 'scale(1)',
					},
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'slide-up': 'slide-up 0.6s ease-out',
				'scale-in': 'scale-in 0.5s ease-out',
			},
			backgroundImage: {
				'blue-gradient': 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(96, 165, 250, 0.3) 100%)',
			},
			boxShadow: {
				'blue-glow': '0 0 20px rgba(59, 130, 246, 0.3)',
				'blue-glow-lg': '0 0 40px rgba(59, 130, 246, 0.4)',
			}
		}
	},
	plugins: [
		tailwindcssAnimate,
		function({ addUtilities }: any) {
			const newUtilities = {
				'.btn-blue-theme': {
					'background-color': 'rgba(59, 130, 246, 0.2)',
					'color': 'rgb(96, 165, 250)',
					'border': '1px solid rgba(96, 165, 250, 0.3)',
					'transition': 'all 0.2s ease-in-out',
					'&:hover': {
						'background-color': 'rgba(59, 130, 246, 0.3)',
						'border-color': 'rgba(96, 165, 250, 0.5)',
					},
					'&:focus': {
						'outline': 'none',
						'ring': '2px',
						'ring-color': 'rgba(96, 165, 250, 0.3)',
					},
				},
				'.btn-blue-theme-outline': {
					'background-color': 'transparent',
					'color': 'rgb(96, 165, 250)',
					'border': '1px solid rgba(96, 165, 250, 0.3)',
					'transition': 'all 0.2s ease-in-out',
					'&:hover': {
						'background-color': 'rgba(59, 130, 246, 0.1)',
						'border-color': 'rgba(96, 165, 250, 0.5)',
					},
				},
			}
			addUtilities(newUtilities)
		}
	],
} satisfies Config;
