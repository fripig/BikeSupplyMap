# 雙北 YouBike 補給地圖

點選臺北市、新北市的 YouBike 2.0 站點，列出附近的便利商店、超市、量販店與雜貨店，並可一鍵開啟 Google 地圖步行導航。

網站：<https://fripig.github.io/BikeSupplyMap/>

## 功能

- 地圖顯示雙北所有營運中的 YouBike 2.0 站點（群組標記）。
- 點選站點後，列出 300 m／500 m／1 km 直線距離內的店家，由近到遠排序。
- 可依店家類型（便利商店、超市、量販店、雜貨店）篩選。
- 每家店都有「步行導航」連結，開啟 Google 地圖從站點走到店家的路線。

距離是直線距離，實際步行距離會比較長。

## 開發

需要 Node.js 24。

```bash
npm install
npm run dev          # 開發伺服器：http://localhost:3000/BikeSupplyMap/
npm test             # 單元測試（Vitest）
npm run fetch-data   # 重新抓取站點與店家資料，寫入 public/data/
npm run generate     # 產生靜態網站到 .output/public/
npm run preview      # 預覽產生的靜態網站：http://localhost:3001/BikeSupplyMap/
```

`npm run fetch-data` 任何一個來源失敗、回傳格式不對，或筆數少於下限（臺北、新北各 500 站，店家 2000 家）時，會以非 0 結束，且不會覆蓋 `public/data/` 裡既有的檔案。

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
| 店家 | © [OpenStreetMap 貢獻者](https://www.openstreetmap.org/copyright)，經 Overpass API 取得 | ODbL |
| 底圖 | © OpenStreetMap 貢獻者 | ODbL |

店家類型先依品牌／名稱判斷，再依 OpenStreetMap 的 `shop` 標籤判斷；蝦皮店到店、百貨公司不列入。規則在 `scripts/lib/classify-shop.js`。

## 自動更新與部署

- **部署**（`.github/workflows/deploy.yml`）：push 到 `main` 時執行測試、產生靜態網站並部署到 GitHub Pages。
- **資料更新**（`.github/workflows/refresh-data.yml`）：每週一 03:00（臺北時間）自動執行，也可以在 Actions 頁面手動觸發。站點或店家資料有變動時才 commit，並接著部署。
