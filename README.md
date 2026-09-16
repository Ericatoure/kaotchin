# KAOTCHIN

Application mobile de soutien psychologique anonyme pour étudiants.


## A propos

KAOTCHIN est une application mobile de bien-être étudiant qui offre :

- Un espace de parole anonyme et bienveillant, assisté par IA
- Des outils d'organisation pour les études (Pomodoro, méthodes d'apprentissage)
- Des mini-jeux éducatifs pour se détendre
- Un suivi du cycle menstruel pour mieux comprendre son corps
- Des exercices de respiration et de gestion du stress

Le tout dans une interface 100% gratuite, anonyme et pensée pour les étudiants africains.


## Structure du projet

```
kaotchin/
│
├── mobile/                  # Application React Native / Expo
│   ├── assets/               # Images et icônes
│   │   ├── adaptive-icon.png
│   │   ├── favicon.png
│   │   ├── icon.png
│   │   ├── logo.png
│   │   └── splash-icon.png
│   ├── App.js                 # Application complète (UI + logique)
│   ├── app.json                # Configuration Expo
│   ├── eas.json                # Configuration EAS Build
│   ├── index.js                 # Point d'entrée
│   ├── package.json
│   └── package-lock.json
│
├── server/                   # API Node.js / Express
│   ├── downloads/              # Pages web servies
│   │   ├── index.html            # Page de téléchargement
│   │   ├── qr-print-kaotchin.html # Page QR imprimable
│   │   └── qr-print-kaotchin-whatsapp.png
│   ├── server.js                # API et routes web
│   ├── package.json
│   └── README.md
│
├── .gitignore
└── README.md
```


## Technologies utilisées

### Mobile
- React Native — Framework mobile cross-platform
- Expo — Développement et build facilité
- EAS Build — Compilation cloud des APK

### Serveur
- Node.js et Express — API backend
- API Groq (LLM) — Génération des réponses IA du chat
- Base de données MySQL — Stockage des conversations
- QR Server API — Génération des QR codes

### Méthode de développement

Ce projet a été développé avec une assistance IA pour la génération de code,
la refactorisation et le débogage. L'architecture, les décisions techniques,
les tests et les corrections ont été pilotés et validés manuellement à chaque
étape. Cette approche a permis un prototypage rapide tout en gardant une
compréhension complète du code produit.


## Fonctionnalités principales

### Chat bienveillant
- Conversation anonyme avec une IA empathique
- Le pseudo de l'utilisateur est toujours utilisé dans les réponses
- Réponses personnalisées et non-jugeantes

### Méthode Pomodoro
- Chrono 25 min travail + 5 min pause
- Compteur de cycles
- Boutons Démarrer / Pause / Reset

### Calcul - Période menstruelle
- Estimation des prochaines règles
- Détection de la période féconde
- Avertissement médical inclus

### Respiration guidée
- Technique 4-4-6-2
- 4 cycles complets
- Couleurs apaisantes

### Mini-jeux (3 jeux)
1. Devine le nombre — 1 à 100, avec indices
2. Calcul rapide — Multiplications mentales
3. Memory — Retrouve les paires (grille 4x3)

### Méthodes d'étude (6 méthodes)
1. Mind Map
2. Répétition Espacée (J+1, J+3, J+7, J+21)
3. Méthode Feynman
4. Écriture Active
5. SQ3R
6. Bonus Astuces

### Conseils bien-être
5 conseils pour la santé mentale des étudiants

### En cas d'urgence
- SAMU : 185
- Pompiers : 180
- Assistance psychologique : 143


## Pages web (servies par le serveur)

| URL | Description |
|-----|-------------|
| http://localhost:3000/ | Page de téléchargement de l'APK (avec QR code scannable et 9 features) |
| http://localhost:3000/qr | Page d'impression QR code haute qualité pour affichage à l'université |
| http://localhost:3000/downloads/kaotchin.apk | Téléchargement direct de l'APK |


## Installation et lancement

### 1. Cloner le projet

```bash
git clone https://github.com/Ericatoure/kaotchin.git
cd kaotchin
```

### 2. Lancer le serveur

```bash
cd server
npm install
npm start
```

Le serveur démarre sur http://localhost:3000

### 3. Lancer l'application mobile

```bash
cd mobile
npm install
npx expo start
```

Puis :
- Scanne le QR code avec l'app Expo Go sur ton téléphone
- Ou appuie sur `a` (Android) / `i` (iOS) dans le terminal


## Configuration

Créer un fichier `.env` dans `server/` avec :

```env
PORT=3000
DB_HOST=localhost
DB_USER=votre_user
DB_PASSWORD=votre_mot_de_passe
DB_NAME=kaotchin
GROQ_API_KEY=votre_cle_groq
```

Le fichier `.env` ne doit JAMAIS être commité sur GitHub.


## Statistiques du projet

| Aspect | Valeur |
|--------|--------|
| Jeux éducatifs | 3 |
| Méthodes d'étude | 6 |
| Pages web | 2 |
| Outils bien-être | 5 (Chat, Pomodoro, Cycle, Respiration, Conseils) |
| Lignes de code (mobile) | environ 3500 |
| Support responsive | Mobile / Tablet / Desktop |
| Langue | Français |


## Etat du projet

- Responsive design (mobile / tablet / desktop)
- 3 jeux éducatifs fonctionnels
- 6 méthodes d'études détaillées
- Chat IA avec pseudo utilisateur
- Calcul du cycle menstruel
- Page de téléchargement web
- QR code imprimable pour l'université
- Documentation complète


## Auteur

**Ericatoure**
GitHub : [@Ericatoure](https://github.com/Ericatoure)


## Licence

Projet étudiant — Tous droits réservés.




**KAOTCHIN — L'oreille qui écoute**
