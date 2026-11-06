import type { CSSProperties } from "react";

// One table card. Colours follow the cafe's style and brand colours.
export function Card({ name, nameAm, svg, url, table, logo, color }: { name: string; nameAm: string; svg: string; url: string; table?: string | number; logo?: string | null; color?: string | null }) {
  return (
    <div className="card" style={color ? ({ ["--pill" as string]: color } as CSSProperties) : undefined}>
      <div className="card-tab">
        {logo ? <img src={`/media/${logo}`} alt="" /> : null}
        <b>{name}</b>
        {nameAm ? <span>{nameAm}</span> : null}
      </div>
      {table ? <div className="card-table">Table {table} · ጠረጴዛ {table}</div> : null}
      <div className="card-qr" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="card-scan">
        <b>Scan for menu</b>
        <span>ምናሌውን ይቃኙ</span>
      </div>
      <div className="card-url">{url}</div>
      <div className="card-foot">Menu by Gebeta · ምናሌው በገበታ</div>
    </div>
  );
}
