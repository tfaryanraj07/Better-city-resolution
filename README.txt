SCS Pro Frontend

Files included:
- index.html (Login)
- register.html (Register)
- home.html (User dashboard)
- complaints.html (Submit issue + map)
- admin.html (Admin dashboard)
- style.css (shared styling)
- app.js (single JS entry handling auth, complaints, map, admin)

How to run locally:
1. Extract the ZIP into a folder.
2. Serve with Live Server (VS Code) or run: python -m http.server 8000
3. Open http://localhost:8000/index.html

Seeded accounts:
- admin / admin (admin)
- raj / 1234512345 (user)

Notes:
- Map uses Leaflet and Nominatim (reverse geocoding). Nominatim has usage policies; for demo it's fine.
- All data stored in localStorage (browser). For production, wire to your backend API.





### Updated `home.html` (add mobile fields + keep existing panels)

```html
