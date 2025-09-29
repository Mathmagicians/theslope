# UI design and usability considerations

## UI Framework
- Tailwind 4
- Nuxt UI 3

We try to a large extent to use the built-in components from Nuxt UI 3, and extend them with our own styles in [app/assets/main.css](../app/assets/main.css).
The only extension this far is custom colors.

## Colors - pantone color of the year 2025 / deliciousness palette
The following colors have been added to the tailwind configuration in [app/assets/main.css](../app/assets/main.css), 
where some of the default colors have been redefined.
<style>
    mocha { color: #a47864 }
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

## Design ideas
- understory.io - pantone colors, with contrasting type colors
- round corner box with a paired box neighbour dd
- semi transparent menu stays at the top (but with offset) in mobile mode / and a hamburger menu / slides out - in
- weird lenses for background and images on top
