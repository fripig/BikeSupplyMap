# 雙北 YouBike 補給地圖

點選臺北市、新北市的 YouBike 2.0 站點，列出附近的便利商店、超市、量販店、雜貨店與自動販賣機，並可一鍵開啟 Google 地圖步行導航。

網站：<https://fripig.github.io/BikeSupplyMap/>

## 功能

- 底圖使用 Esri 淡灰底圖，只留道路、河流與地名，讓自行車道成為主角。
- 開啟時就畫出 21 條河濱自行車道（藍色）與可騎自行車過河的橋梁路線（紫色，19 條來自 OSM 路線，另加補充清單裡的重陽橋），以及把河濱路線接成環小台北的連接道路（棕色，南港經研究院路到木柵），點橋梁路線或連接道路會顯示名稱。
- 河濱、橋梁路線與連接道路 200 m 內的自動販賣機（約 70 台）開啟時就以青綠色圓點標出，關掉店家類型的「自動販賣機」會一起隱藏；點圓點會顯示名稱（沒有名稱時顯示「自動販賣機」）與販售種類（飲料、飲水、咖啡、食物）。
- 站點分成兩個開關：「河濱站點」（預設開啟）顯示河濱自行車道旁的 YouBike 2.0 站點（群組標記），開啟時自動框住這些站點；「市區站點」（預設關閉）顯示其他營運中的站點，以灰色標記顯示。圖示太多時可以關掉「河濱站點」只看路線與設施；切換時已選的站點與店家清單會保留。
- 點選站點後，列出 300 m／500 m／1 km 直線距離內的店家，由近到遠排序。
- 可依店家類型（便利商店、超市、量販店、雜貨店、自動販賣機）篩選。
- 每家店都有「步行導航」連結，開啟 Google 地圖從站點走到店家的路線。
- 選到的站點名稱下面，以及廁所、淋浴、躲雨點、自動販賣機的圖示說明裡，都有「在 Google 地圖開啟」連結，在新分頁用 Google 地圖顯示該位置（不導航），方便查看照片或自行規劃路線。
- 「都市自行車道」圖層（預設開啟）以綠色顯示市區的自行車道：實線是獨立自行車道，虛線是馬路上畫線的自行車道。放大到街道層級（zoom 16 以上）時，另外標出車道沿線 30 m 內的紅綠燈（紅點）與穿越道（白點）。關掉開關只會隱藏都市車道，河濱、橋梁路線與連接道路仍保留。
- 「躲雨點」開關（預設關閉）打開時，標出河濱路線旁可以躲雨的地方：「橋」是路線從高架道路或鐵路橋下穿過的橋下（約 157 處），點下去顯示「中正橋 · 橋下」這類橋名；「亭」是路線 100 m 內的涼亭與遮雨棚（約 175 處），點下去顯示名稱，沒有名稱時顯示「涼亭」。資料在第一次打開開關時才下載。
- 「廁所」與「淋浴」各有一個開關（預設關閉），兩者共用一份資料，第一次打開其中一個時才下載。「廁」標出河濱路線 100 m 內的公廁（約 335 間），點下去顯示名稱（沒有名稱時顯示「公廁」），以及 OpenStreetMap 有標的無障礙、部分無障礙、尿布台、性別友善、免費或收費；沒標的屬性不顯示。「浴」標出河濱路線 1 km 內的運動中心（約 12 間，顯示「◯◯運動中心 · 淋浴間（可能收費）」）與 300 m 內的淋浴間（約 2 處）。

距離是直線距離，實際步行距離會比較長。

河濱站點的判定：建置時從 OpenStreetMap 抓雙北的河濱自行車道路線（`route=bicycle` relation，名稱含「河、溪、水岸、左岸、右岸」，另加關渡、社子島環島、二重環狀自行車道），站點距任一路線 200 m 以內就算河濱站點。規則在 `scripts/lib/riverside.js`。

都市自行車道的範圍：OpenStreetMap 的獨立自行車道（`highway=cycleway`）與馬路上的自行車道（`cycleway`、`cycleway:both`、`cycleway:left`、`cycleway:right` 為 `lane` 或 `track`），扣掉屬於河濱路線的路段；人行道上的人車共道不列入。有號誌的穿越道算作紅綠燈。資料反映 OpenStreetMap 的標記，沒有標記的車道不會出現。規則在 `scripts/lib/cycling-layer.js`。

橋梁路線：OpenStreetMap 上名稱含「橋」的 `route=bicycle` relation（已算河濱路線的除外），例如華江橋、福和橋、彩虹橋自行車道。

補充橋梁清單：有些橋騎士常走，但 OpenStreetMap 沒有對應的 `route=bicycle` relation，就列在 `scripts/lib/bridge-supplements.js` 的 `BRIDGE_SUPPLEMENTS`。每一筆用 OSM 的 `name`、`highway` 值與 `bridge=yes` 選出雙北境內的路段，以 `label` 當顯示名稱畫成橋梁路線。要新增一座橋，在清單加一筆 `{ name, highway, label }` 即可；清單裡的橋在 OSM 找不到任何路段時（例如 OSM 改名），`npm run fetch-data` 會失敗並在訊息裡寫出橋名，修正清單後再跑。

- 重陽橋：騎士實際走的是主橋（`highway=secondary`）的人行道，所以畫主橋、顯示為「重陽橋（人行道）」，含兩端引橋。OSM 上同名的 `highway=service` 路段是機車專用道（`access=no`、`motorcycle=designated`），不畫。

連接道路：有些環線在 OpenStreetMap 上是一條 `route=bicycle` relation，但名稱不符合河濱或橋梁的規則，就列在 `scripts/lib/loop-routes.js` 的 `LOOP_ROUTES`。每一筆用 relation 的 `name` 選出路線，扣掉已屬於河濱或橋梁路線的路段，剩下的以 `label` 當顯示名稱畫成連接道路。目前只有「環騎臺北」，剩下的主要是南港經研究院路到木柵、接起基隆河與景美溪的一段（約 16 km），顯示為「環騎臺北（連接道路）」。連接道路不算河濱路線，旁邊的站點不會因此變成河濱站點。清單裡的路線在 OSM 找不到，或扣完沒有剩下任何路段時，`npm run fetch-data` 會失敗並在訊息裡寫出路線名稱。

自動販賣機：OpenStreetMap 的 `amenity=vending_machine`，`vending` 標籤含飲料或食物（`drinks`、`water`、`coffee`、`food`、`ice_cream`、`sweets`、`bread`、`milk`、`snacks`、`beverages`）或沒有 `vending` 標籤的機台才列入；停車票、車票、狗便袋等其他機台不列入。沒標 `vending` 的機台多半是飲料機，但也可能是其他種類，這時點開只會顯示「自動販賣機」。資料量取決於 OpenStreetMap 的標記（雙北目前約 300 台，列入約 186 台），沒被標上的販賣機不會出現。

躲雨點：只看河濱路線（不含橋梁路線與連接道路）。橋下點是河濱路線與 OpenStreetMap 上 `bridge=yes` 的高架道路（`highway` 為 motorway、trunk、primary、secondary、tertiary 及其匝道）或鐵路（`railway` 為 rail、subway、light_rail）交叉的位置，同一座橋的上下行、並行匝道在 60 m 內合併成一處，用橋的名稱命名。涼亭類是河濱路線 100 m 內的 `amenity=shelter`（公車亭除外）與 `building=roof`。只知道路線在那裡從橋下穿過，橋下多寬、會不會潑雨看不出來；沒被標上的涼亭也不會出現。公廁不列入。規則在 `scripts/lib/shelters.js`。

廁所與淋浴：只看河濱路線。廁所是 `amenity=toilets`，距河濱路線 100 m 以內。淋浴是 `amenity=shower`（300 m 以內）與名稱含「運動中心」的 `leisure=sports_centre`（1 km 以內，騎士要多走一段）。OpenStreetMap 上的淋浴間很少（雙北約 11 處），所以運動中心是主要來源；運動中心的淋浴間通常要付費，也不一定開放非會員使用。商店、餐廳標的 `toilets=yes` 不列入（河濱旁只有 9 家左右）。資料保留 OSM 的原始標籤值，文字在網頁端產生。規則在 `scripts/lib/facilities.js`。

連續路線：建置時把端點完全重合、且只有兩段在該點相接的路段串成一條線，遇到路口（三段以上相接）或斷點就停；不會補起斷點，也不會隱藏短段。規則在 `scripts/lib/routes.js`。

## 開發

需要 Node.js 24。

```bash
npm install
npm run dev          # 開發伺服器：http://localhost:3000/BikeSupplyMap/
npm test             # 單元測試（Vitest）
npm run test:e2e     # 瀏覽器測試（Playwright），只在本機跑
npm run fetch-data   # 重新抓取站點與店家資料，寫入 public/data/
npm run generate     # 產生靜態網站到 .output/public/
npm run preview      # 預覽產生的靜態網站：http://localhost:3001/BikeSupplyMap/
```

瀏覽器測試（`e2e/`）用 Playwright 在桌面（1280×800）與手機（375×812）兩種尺寸各跑一次，檢查地圖上畫在 canvas 的東西：路線旁販賣機圖示與圖例跟著「自動販賣機」開關、販賣機 popup 內容、重陽橋與連接道路的 popup、圖例的「連接道路」、躲雨點開關（打開前不下載資料、圖示與圖例跟著開關）與橋下點 popup、廁所與淋浴開關（共用一次下載、各自控制圖示）與廁所 popup、資料載入失敗時的訊息、點選河濱站點。第一次使用先執行 `npx playwright install chromium` 下載瀏覽器。測試會沿用已經在跑的 `npm run dev`（沒有就自動啟動），並讀取 `public/data/` 裡當下的資料，所以資料每週更新後不用改測試。開發伺服器會把地圖物件掛在 `window.__supplyMap` 給測試用，`npm run generate` 產生的網站不含這段。CI（GitHub Actions）不會跑瀏覽器測試。

`npm run fetch-data` 任何一個來源失敗、回傳格式不對，或筆數少於下限（臺北、新北各 500 站，店家 2000 家，自動販賣機 100 台，河濱路線 15 條，河濱站點 150 站，橋梁路線 10 條，都市自行車道 1000 段（串接前），紅綠燈與穿越道 2000 個，橋下躲雨點與涼亭躲雨點各 80 處，廁所 150 間，淋浴 5 處），或補充橋梁清單有任何一座橋、連接道路清單有任何一條路線在 OSM 找不到時，會以非 0 結束，且不會覆蓋 `public/data/` 裡既有的檔案。

## 技術架構

- [Nuxt 4](https://nuxt.com/)（Vue 3），以 `nuxt generate` 產生靜態網站，部署在 GitHub Pages。
- [Leaflet](https://leafletjs.com/) + `leaflet.markercluster`，地圖元件只在瀏覽器端執行。
- 站點與店家資料在建置前預先抓好，存成 `public/data/*.json`，網站執行時不呼叫任何 API。
- 之後若需要伺服器端渲染（SSR），可以把 `nuxt.config.ts` 的 Nitro preset 從 `github_pages` 改成 Cloudflare 等支援伺服器執行的平台。

## 資料來源與授權

| 資料 | 來源 | 授權 |
| --- | --- | --- |
| 臺北市 YouBike 2.0 站點 | [臺北市資料大平臺](https://data.taipei/) | 政府資料開放授權條款－第 1 版 |
| 新北市 YouBike 2.0 站點 | [新北市政府資料開放平臺](https://data.ntpc.gov.tw/) | 政府資料開放授權條款－第 1 版 |
| 店家與自動販賣機 | © [OpenStreetMap 貢獻者](https://www.openstreetmap.org/copyright)，經 Overpass API 取得 | ODbL |
| 河濱、橋梁、連接道路與都市自行車道、紅綠燈、穿越道、躲雨點、廁所、淋浴 | © OpenStreetMap 貢獻者，經 Overpass API 取得 | ODbL |
| 底圖 | Esri World Light Gray Canvas（Esri, HERE, Garmin, © OpenStreetMap 貢獻者） | 依 Esri 條款，需標示來源 |

店家類型先看是否為自動販賣機（自動販賣機不套用品牌規則，7-Eleven 的販賣機不算便利商店），再依品牌／名稱判斷，最後依 OpenStreetMap 的 `shop` 標籤判斷；蝦皮店到店、百貨公司不列入。規則在 `scripts/lib/classify-shop.js`。

## 自動更新與部署

- **部署**（`.github/workflows/deploy.yml`）：push 到 `main` 時執行測試、產生靜態網站並部署到 GitHub Pages。
- **資料更新**（`.github/workflows/refresh-data.yml`）：每週一 03:00（臺北時間）自動執行，也可以在 Actions 頁面手動觸發。站點或店家資料有變動時才 commit，並接著部署。
