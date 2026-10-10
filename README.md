# Manav's Cookie Shop Tycoon

Double-click **index.html** to play in any modern browser. No install, server, or internet connection is required.

Start with $100 and run a cookie shop for 30 days. Choose one daily cookie variety, your batch size, cookie price, and advertising budget, then open the shop to see your results. Chocolate Chip costs $0.50 to bake with a suggested $2 selling price; Butter Shortbread costs $0.35 with a suggested $1.50 price and attracts a larger crowd; Double Chocolate costs $0.80 with a suggested $3 price and attracts a smaller premium crowd. Switching varieties resets the suggested price, which you can freely adjust. All cookies baked that day use your chosen recipe; baking and advertising must fit your available cash. Unsold cookies are donated at closing. Prices can range from $0.25 to $20.00. Advertising increases demand with diminishing returns, while higher prices reduce it. Daily foot traffic varies. The season ends after day 30 or when you cannot afford a $0.35 shortbread cookie.

Customer satisfaction starts at 75 out of 100 and stays between 0 and 100. Prices below the selected variety’s suggested price add 5 points; matching it has no price effect. Higher prices subtract up to 10 points, proportional to the markup (rounded up). Meeting positive demand adds 3 points; shortages subtract up to 20 points in proportion to unmet demand (rounded up). With zero demand, inventory has no effect. Satisfaction records customer feedback and does not change demand. Each daily result and journal entry explains both effects and the actual score change, including the final day.

Older saves reconstruct satisfaction from their recorded prices and demand. Existing saved days without a variety are treated as Chocolate Chip. Daily results and the journal record the variety sold.

Progress saves automatically in this browser when local storage is available. Browser settings may prevent saving for local files. Use Start over to begin a new season.

Run the game logic checks with `node test-game.js` (Node.js is only needed for development checks).
