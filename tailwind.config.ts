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
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
			'vn-primary': '#1E40AF',     // Deep Professional Blue
			'vn-secondary': '#EA580C',   // Warm Corporate Orange  
			'vn-accent': '#059669',      // Success Green
			'vn-dark': '#374151',        // Professional Dark
			'vn-light': '#F8FAFC',       // Clean Light
			'vn-gold': '#D97706',        // Vietnamese Gold
			'vn-red': '#DC2626',         // Vietnamese Red
			'vn-navy': '#1E3A8A',        // Navy Blue
			'vn-emerald': '#10B981',     // Emerald Green
			web3: {
				primary: '#1E40AF',
				secondary: '#EA580C',
				tertiary: '#059669',
				dark: '#374151',
				light: '#F8FAFC',
			}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			fontFamily: {
				sans: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
				heading: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
				primary: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
				secondary: ['Be Vietnam Pro', 'system-ui', 'sans-serif'],
				'circular-web': ['circular-web', 'sans-serif'],
				general: ['general', 'sans-serif'],
				'robert-medium': ['robert-medium', 'sans-serif'],
				'robert-regular': ['robert-regular', 'sans-serif'],
				zentry: ['zentry', 'sans-serif'],
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(100%)' }
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
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-20px)' },
				},
				'pulse-glow': {
					'0%, 100%': { boxShadow: '0 0 20px rgba(30, 64, 175, 0.3)' },
					'50%': { boxShadow: '0 0 40px rgba(30, 64, 175, 0.6)' },
				},
				'gradient-shift': {
					'0%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
					'100%': { backgroundPosition: '0% 50%' },
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
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'gradient-shift': 'gradient-shift 3s ease infinite',
				'slide-up': 'slide-up 0.6s ease-out',
				'scale-in': 'scale-in 0.5s ease-out',
			},
			backgroundImage: {
				'vn-gradient': 'linear-gradient(135deg, #1E40AF 0%, #EA580C 100%)',
				'vn-gradient-animated': 'linear-gradient(-45deg, #1E40AF, #EA580C, #059669, #D97706)',
				'vn-professional': 'linear-gradient(135deg, #1E40AF 0%, #374151 100%)',
				'vn-success': 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
				'web3-gradient': 'linear-gradient(135deg, #1E40AF 0%, #EA580C 100%)',
				'web3-gradient-animated': 'linear-gradient(-45deg, #1E40AF, #EA580C, #059669, #D97706)',
			},
			boxShadow: {
				'vn': '0 4px 14px 0 rgba(30, 64, 175, 0.25)',
				'vn-lg': '0 10px 25px 0 rgba(30, 64, 175, 0.15)',
				'vn-orange': '0 4px 14px 0 rgba(234, 88, 12, 0.25)',
				'web3': '0 4px 14px 0 rgba(30, 64, 175, 0.25)',
				'web3-lg': '0 10px 25px 0 rgba(30, 64, 175, 0.15)',
				'glow': '0 0 20px rgba(30, 64, 175, 0.3)',
				'glow-lg': '0 0 40px rgba(30, 64, 175, 0.4)',
				'corporate': '0 8px 32px 0 rgba(0, 0, 0, 0.08)',
			}
		}
	},
	plugins: [tailwindcssAnimate],
} satisfies Config;
