import { useState } from "react";
import { PARTNER_NAV_DELAY_MS, partners } from "../data/partners";

function PartnerLogo({
  name,
  logoSrc,
  logoText,
}: {
  name: string;
  logoSrc?: string;
  logoText?: string;
}) {
  if (logoSrc) {
    return (
      <div className="partner-logo-placeholder">
        <img src={logoSrc} alt={name} />
      </div>
    );
  }

  return (
    <div className="partner-logo-placeholder partner-logo-placeholder--text">{logoText}</div>
  );
}

export default function PartnersSection() {
  const [pressedId, setPressedId] = useState<string | null>(null);

  const openPartnerSite = (id: string, url: string) => {
    setPressedId(id);
    window.setTimeout(() => {
      window.open(url, "_blank", "noopener,noreferrer");
      setPressedId(null);
    }, PARTNER_NAV_DELAY_MS);
  };

  return (
    <div id="partners">
      <div className="partners-inner">
        <div className="section-label reveal" style={{ justifyContent: "center" }}>
          PARTNERS
        </div>
        <h2 className="section-title reveal" style={{ textAlign: "center" }}>
          合作院校與穩定供應方
          <span className="demo-badge">DEMO DATA</span>
        </h2>
        <p className="section-desc reveal" style={{ textAlign: "center", margin: "0 auto 0" }}>
          算力由真實的學術機構與實驗室提供，不是虛擬的算力承諾。
        </p>
        <div className="partner-grid reveal">
          {partners.map((partner) => {
            const cellClass = [
              "partner-cell",
              pressedId === partner.id ? "is-pressed" : "",
              partner.url ? "partner-cell--link" : "partner-cell--static",
            ]
              .filter(Boolean)
              .join(" ");

            const body = (
              <>
                <PartnerLogo
                  name={partner.name}
                  logoSrc={partner.logoSrc}
                  logoText={partner.logoText}
                />
                <div className="partner-name">
                  {partner.nameLines[0]}
                  <br />
                  {partner.nameLines[1]}
                </div>
              </>
            );

            if (partner.url) {
              return (
                <button
                  key={partner.id}
                  type="button"
                  className={cellClass}
                  aria-label={`前往${partner.name}官網`}
                  onClick={() => openPartnerSite(partner.id, partner.url!)}
                >
                  {body}
                </button>
              );
            }

            return (
              <div key={partner.id} className={cellClass} aria-label={partner.name}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
