// Loop routes riders follow that OSM describes as a route=bicycle relation but
// that neither the riverside nor the bridge rule selects. Each entry names the
// relation by its `name`; its member ways outside every published riverside and
// bridge relation, and outside every link route of an earlier entry, are
// published as one link route named `label`. List order therefore decides which
// link route owns a way that several loops share. An entry that matches no
// relation, or leaves no way, blocks publishing, so a rename in OSM shows up as
// a failed refresh rather than a silently missing line.
export const LOOP_ROUTES = [
  // The 環小台北 loop; what is left after subtraction is mainly the 南港 →
  // 研究院路 → 木柵 road link between the 基隆河 and 景美溪 routes.
  { name: '環騎臺北', label: '環騎臺北（連接道路）' },
  // Alternative road sections of the same loop.
  { name: '環騎臺北市區替代道路：深南路-南深路段', label: '環騎臺北替代道路（深南路-南深路段）' },
  { name: '環騎臺北市區替代道路：市民大道-莊敬隧道段', label: '環騎臺北替代道路（市民大道-莊敬隧道段）' },
  { name: '環騎臺北市區替代道路：研究院路-莊敬隧道段', label: '環騎臺北替代道路（研究院路-莊敬隧道段）' },
  // Cycling Route No. 1-1 along the north coast and through 基隆. Only the
  // westbound relation: the eastbound one mostly uses the opposite carriageway.
  { name: '北臺濱海環線 (西向)', label: '北臺濱海環線（環島1-1）' },
]
