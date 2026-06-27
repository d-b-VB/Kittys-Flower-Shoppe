# Kitty’s Flower Shoppe

A stateless, mobile-first browser logic puzzle built as static files for GitHub Pages.

## Play locally

```bash
python -m http.server 8000
```

Then open <http://127.0.0.1:8000/>.

## GitHub Pages setup

To publish at `https://d-b-vb.github.io/Kittys-Flower-Shoppe/`:

1. Merge this site to the repository's default publishing branch, normally `main`.
2. In GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
4. Set **Branch** to `main` and the folder to `/ (root)`, then save.
5. Wait for the Pages workflow to finish, then visit the project URL.

The site is plain HTML, CSS, JavaScript, and JSON, so no package install or build step is required.
