/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: "class",
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                card: "var(--card)",
                "card-border": "var(--card-border)",
                primary: "var(--primary)",
                "primary-foreground": "var(--primary-foreground)",
                secondary: "var(--secondary)",
                muted: "var(--muted)",
                accent: "var(--accent)",
            },
            fontFamily: {
                sans: ['var(--font-jakarta)', 'sans-serif'],
                display: ['var(--font-outfit)', 'sans-serif'],
            },
            // Échelle de rayons « panel » nommée. Mêmes valeurs que les anciens
            // rayons arbitraires rounded-[Xrem] : remplace les magic numbers par
            // une échelle documentée, sans changer le rendu.
            borderRadius: {
                'panel-xs': '1.5rem',
                'panel-sm': '2rem',
                'panel': '2.5rem',
                'panel-lg': '3rem',
                'panel-xl': '3.5rem',
                'panel-2xl': '4rem',
            },
        },
    },
    plugins: [],
}
