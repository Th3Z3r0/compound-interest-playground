# Pip’s Compound Interest Playground

A self-contained interactive web animation that explains compound interest to kids. Change the starting savings, yearly rate, and time, then watch rewards drop into Pip’s jar. In the default story, **$100 becomes $110 after one year and $121 after two years**: the original $100 earns another $10, and the first $10 of interest earns $1.

## What you can change

- Starting savings: $10–$10,000.
- Annual interest rate: 0–30%, including decimals.
- Savings duration: 1–30 whole years.
- Playback pace: slow, normal, or fast.
- Play/pause, replay, previous/next year, and a year slider.
- Still pictures for reduced motion, plus an expandable year-by-year table.

Changing the financial settings updates the projected result immediately and resets the story to year zero. The animation stops at the selected final year. Gold tokens represent starting savings, green tokens interest, and purple tokens interest on previous interest; **tokens are illustrative and have no fixed dollar value**. Exact amounts appear in the captions and breakdown. Small amounts can round to $0.00; calculations retain precision until display.

## Build the container image

Install Docker Engine or Docker Desktop. Run these commands from the project directory:

```sh
docker build -t compound-interest-playground:local .
```

The build runs the calculation, playback-state, and HTTP integration tests before producing the runtime image. It needs network access to pull `node:24-alpine`; no package downloads are required.

## Run the container

```sh
docker run --rm --name compound-interest-playground \
  --read-only --cap-drop ALL --security-opt no-new-privileges \
  -p 127.0.0.1:8080:8080 \
  compound-interest-playground:local
```

Open **http://localhost:8080** in your browser. Stop with Ctrl+C. Binding to `127.0.0.1` makes the app available on your machine only. To serve other devices, deliberately change the port mapping to `-p 8080:8080` and configure your host firewall and HTTPS reverse proxy as appropriate.

Alternatively, use Docker Compose:

```sh
docker compose up --build -d
docker compose ps
docker compose down
```

The app listens on port 8080 in the container. You can map a different host port, such as `-p 127.0.0.1:3000:8080`. `PORT` changes the internal listening port if needed. The image runs as the non-root `node` user and exposes a `/healthz` endpoint with a built-in Docker health check. It writes no application data and requires no volumes, accounts, API keys, or external services.

## Run and test without Docker

Requires Node.js 22 or newer. There are no npm dependencies and no install step.

```sh
npm test
npm start
```

Open http://localhost:8080. To use another port:

```sh
PORT=3000 npm start
```

## Source layout

```text
public/index.html   Accessible page and SVG jar illustration
public/style.css    Responsive layout and coin animations
public/app.mjs      Browser controls, playback, and story captions
public/model.mjs    Validated financial calculations and playback state
server.mjs          Small static HTTP server using Node built-ins
test/               Calculation, playback, and HTTP integration tests
Dockerfile          Test stage plus non-root runtime image
compose.yaml        Local container configuration
```

All fonts, illustrations, scripts, and styles are local; the browser makes no external requests. The source is independent of Replit and requires no Replit account or embedding.

## How the example works

The annual balance is `startingSavings × (1 + annualRate / 100) ^ year`. Each year’s interest splits into `startingSavings × annualRate / 100` from the original deposit, plus `previouslyEarnedInterest × annualRate / 100` from earlier rewards. Calculations use JavaScript numbers without annual currency rounding; currency is rounded to cents for display. This is an educational illustration, not a bank ledger.

The example assumes a fixed interest rate, annual compounding, no further deposits or withdrawals, and no fees or taxes. Real rates and account rules vary. At 0%, the balance stays unchanged.

## Manual browser check

1. With the defaults, step to year 1 ($110) and year 2 ($121). Check that year 2 shows $10 earned on starting savings and $1 on previous interest.
2. Set the rate to 0% and scrub to the last year. The balance must equal the starting savings.
3. Change the duration or rate while playing. The story must pause and return to year zero while the projection updates.
4. Try replay, pause, next/previous, the year slider, and each playback speed. Autoplay must stop at the selected final year.
5. Try the maximum settings, a narrow phone viewport, keyboard navigation, and the still-pictures option.

## Upload to your GitHub account

If this folder is not already linked to a remote repository, create a private repository using the GitHub CLI (with an account authorized to create repositories):

```sh
gh repo create compound-interest-playground --private --source=. --remote=origin --push
```

If you created the empty repository on GitHub first, add its HTTPS URL as `origin` and push the `main` branch. Do not commit credentials or environment files.
