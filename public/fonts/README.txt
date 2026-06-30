TT Norms Pro is a licensed commercial typeface — it isn't included here.

To activate it across the app, add your licensed files at:
  /public/fonts/tt-norms-pro-regular.woff2   (weight 400)
  /public/fonts/tt-norms-pro-semibold.woff2  (weight 600)

app/globals.css already declares the @font-face rules for both files and
the body font stack is 'TT Norms Pro', 'Inter', system-ui, sans-serif — so
the app will pick the font up automatically the moment the files exist
here, no code changes needed.

Until then, the app renders in Inter (loaded from Google Fonts), which was
chosen as the fallback because its geometry is close to TT Norms Pro, so
the layout, spacing, and type scale will look correct either way.
