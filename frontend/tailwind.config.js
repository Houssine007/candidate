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
        },
    },
    plugins: [],
}
