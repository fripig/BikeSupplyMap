// Loop routes riders follow that OSM describes as a route=bicycle relation but
// that neither the riverside nor the bridge rule selects. Each entry names the
// relation by its `name`; its member ways outside every published riverside and
// bridge relation are published as one link route named `label`. An entry that
// matches no relation, or leaves no way, blocks publishing, so a rename in OSM
// shows up as a failed refresh rather than a silently missing line.
export const LOOP_ROUTES = [
  // The 環小台北 loop; what is left after subtraction is mainly the 南港 →
  // 研究院路 → 木柵 road link between the 基隆河 and 景美溪 routes.
  { name: '環騎臺北', label: '環騎臺北（連接道路）' },
]
