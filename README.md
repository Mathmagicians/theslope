# theslope

## 👩🏽‍💻How to develop
- npm + node  installeret 
- git installeret

###  🏗️Start applikationen lokalt 
Clone the repo friom github:

```git clone```

Run on development server (localhost:3000)

```npm run dev```

- Frontend is available on `localhost:3000`.
- Api is available on `localhost:3000/api`.
- Tailwind styles are on `localhost:3000/_tailwind`.
- Lint inspector: run `npx @eslint/config-inspector.` and browse on` ` http://localhost:7777 `
- Nuxt DevTools is enabled by default in Nuxt v3.8.0. You can press Shift + Alt / ⇧ Shift + ⌥ Option + D in your app to open it up.

### 🚀 Deploy to cloudflare
```npm run deploy```

## 🤖 How to test
🚧 on the way
-  Heynabo test space: - [ ] https://demo.spaces.heynabo.com/, bruger mail `agata@mathmagicians.dk`, kode spørg @themathmagician

## Tech stuff

### T⌨ech Stack
- Tailwind CSS - frontend css framework
- Nuxt.js 3  + typescript - frontend framework
- Nuxt.js 3  + typescript - server backend
- Cloudflare - serverless deployment  / cloud provider
- CICD - Github actions
- Andre cloud resourcer - Terraform

### 3️⃣ 3rd party services
#### Heynabo
- Heynabo API - se  [dokumentation](https://heynabo.atlassian.net/wiki/external/N2QzNGVkM2ZiMzg1NDkwZDk2NTBiYWYyMzA0ZWJjNmQ)
- There is a Makefile to test the heynabo api. you must have an .env file with username and password. Fx the following will return a list of neighbors:
```make heynabo-get-nhbrs```

## Design ideas
 - understory.io - pantone colors, with contrasting type colors 
 - round corner box with a paired box neighbour dd
 - semi transparent menu stays at the top (but with offset) in mobile mode / and a hamburger menu / slides out - in
 - weird lenses for background and images on top

## Colors - pantone color of the year 2025 / deliciousness palette
<style>
    m { color: #a47864 }
    pink { color:  #fa7b95 }
    orange { color: #ec6a37 }
    winery { color: #7e212a }
    party { color: #c4516c }
    peach { color: #ffb482 }
    bonbon { color: #f1a9cf }
    caramel { color: #ca815a}
</style>

- <m>mocha mouse</m> #a47864
- <pink>pink lemonade</pink> #fa7b95
- <orange>mandarin orange</orange> #b7d7b0
- <winery>winery</winery> #b7e212a
- <party>party punch</party> #c4516c
- <peach>peach cobbler</peach> #ffb482
- <bonbon>bonbon</bonbon> #f1a9cf
- <caramel>caramel</caramel> #ca815a
